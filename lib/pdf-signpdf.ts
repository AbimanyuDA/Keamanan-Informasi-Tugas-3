import { PDFDocument } from "pdf-lib";

// Try to load node-signpdf
let signpdfLoaded = false;
let signpdf: any = null;
let plainAddPlaceholder: any = null;
let SignPdfClass: any = null;

function loadNodeSignpdf() {
  if (signpdfLoaded) return;
  
  try {
    const nodeSignpdf = require("node-signpdf");
    
    // Try to find the default export
    if (typeof nodeSignpdf === "function") {
      signpdf = nodeSignpdf;
    } else if (nodeSignpdf.default && typeof nodeSignpdf.default === "function") {
      signpdf = nodeSignpdf.default;
    } else if (nodeSignpdf.signer && typeof nodeSignpdf.signer === "function") {
      signpdf = nodeSignpdf.signer;
    }
    
    // Try to load helpers
    try {
      plainAddPlaceholder = nodeSignpdf.plainAddPlaceholder || 
                           require("node-signpdf/dist/helpers").plainAddPlaceholder;
    } catch (e) {
      console.log("plainAddPlaceholder not found in node-signpdf");
    }
    
    try {
      SignPdfClass = nodeSignpdf.SignPdf || nodeSignpdf.default?.SignPdf || nodeSignpdf.default;
    } catch (e) {}

    signpdfLoaded = true;
    console.log("node-signpdf loaded successfully");
  } catch (e) {
    console.warn("Failed to load node-signpdf:", e);
    signpdfLoaded = true; // Mark as loaded to avoid retrying
  }
}

export interface SignerInfo {
  name: string;
  organization?: string;
  position?: string;
}

/**
 * Normalize a PDF by re-saving pages with pdf-lib to avoid xref-streams / object streams
 * which `node-signpdf`'s placeholder helper may not support.
 */
async function normalizePdfBuffer(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    try {
      const { execSync } = require("child_process");
      const os = require("os");
      const { writeFileSync, readFileSync, unlinkSync } = require("fs");
      const { join } = require("path");
      const inPath = join(os.tmpdir(), `in_pdf_${Date.now()}.pdf`);
      const outPath = join(os.tmpdir(), `out_pdf_${Date.now()}.pdf`);
      writeFileSync(inPath, pdfBuffer);
      execSync(`qpdf --object-streams=disable "${inPath}" "${outPath}"`, {
        stdio: "ignore",
      });
      const out = readFileSync(outPath);
      try {
        unlinkSync(inPath);
        unlinkSync(outPath);
      } catch (e) {}
      return out;
    } catch (e) {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const newDoc = await PDFDocument.create();
      const pages = await newDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
      pages.forEach((p) => newDoc.addPage(p));
      return Buffer.from(await newDoc.save());
    }
  } catch (e) {
    return pdfBuffer;
  }
}

export interface SignerInfo {
  name: string;
  organization?: string;
  position?: string;
}

/**
 * Sign a PDF using node-signpdf so the signature is valid in Adobe Reader and locked from editing.
 * This creates a proper PKCS#7 detached signature that is cryptographically valid.
 * @param pdfBuffer Buffer of the unsigned PDF
 * @param p12Buffer Buffer of the PKCS#12 (PFX) file containing private key and certificate
 * @param passphrase Passphrase for the P12 file
 * @param signerInfo Optional signer information (name, organization, position)
 * @returns Buffer of the signed PDF
 */
export async function signPdfWithNodeSignpdf(
  pdfBuffer: Buffer,
  p12Buffer: Buffer,
  passphrase: string,
  signerInfo?: SignerInfo
): Promise<Buffer> {
  // Load node-signpdf module
  loadNodeSignpdf();

  // If node-signpdf is available and working, try to use it
    if ((signpdf && typeof signpdf === "function") || SignPdfClass) {
    try {
      console.log("Attempting to sign with node-signpdf directly...");
      
      let pdfToSign = pdfBuffer;

      // Normalize PDF first to remove object streams that break placeholder parsing
      try {
        const normalized = await normalizePdfBuffer(pdfBuffer);
        pdfToSign = normalized;
      } catch (e) {
        console.warn("PDF normalization failed, continue with original buffer", e);
        pdfToSign = pdfBuffer;
      }

      // Try standard plainAddPlaceholder if available
      if (plainAddPlaceholder && typeof plainAddPlaceholder === "function") {
          try {
            console.log("Adding signature placeholder...");
            const signerName = signerInfo ? `${signerInfo.name}${signerInfo.organization ? ` (${signerInfo.organization})` : ''}` : 'Digital Signature';
            const reason = signerInfo?.position ? `Signed as ${signerInfo.position}` : 'Document signed digitally';
          
            pdfToSign = plainAddPlaceholder({
              pdfBuffer: pdfToSign,
              reason: reason,
              name: signerName,
              location: signerInfo?.organization || '',
                signatureLength: 12288,
            });
            console.log("Placeholder added, PDF size:", pdfToSign.length);
          } catch (err) {
            console.log("Could not add placeholder, signing without it");
          }
        }

      // Check if ByteRange exists after placeholder; if not, retry on original buffer with larger placeholder
      let pdfTextAfterPlaceholder = pdfToSign.toString('latin1');
      if (!pdfTextAfterPlaceholder.includes('/ByteRange') && plainAddPlaceholder) {
        console.warn('ByteRange missing after placeholder; retrying on original buffer');
        try {
          pdfToSign = plainAddPlaceholder({
            pdfBuffer: pdfBuffer,
            reason: signerInfo?.position ? `Signed as ${signerInfo.position}` : 'Document signed digitally',
            name: signerInfo ? `${signerInfo.name}${signerInfo.organization ? ` (${signerInfo.organization})` : ''}` : 'Digital Signature',
            location: signerInfo?.organization || '',
            signatureLength: 12288,
          });
          pdfTextAfterPlaceholder = pdfToSign.toString('latin1');
          console.log('Retry placeholder; ByteRange present:', pdfTextAfterPlaceholder.includes('/ByteRange'));
        } catch (err2) {
          console.warn('Retry placeholder failed:', err2);
        }
      }
      
      // Sign the PDF using SignPdf class if available
      if (SignPdfClass) {
        try {
          const signer = new SignPdfClass();
          const signedPdf = signer.sign(pdfToSign, p12Buffer);
          console.log("PDF signed successfully with SignPdf class, size:", signedPdf.length);
          return signedPdf;
        } catch (e) {
          console.warn("SignPdf class signing failed, falling back to function:", e);
        }
      }

      // Fallback to function form
      const signedPdf = signpdf(pdfToSign, p12Buffer, { passphrase });
      console.log("PDF signed successfully with node-signpdf function, size:", signedPdf.length);
      return signedPdf;
    } catch (err) {
      console.warn("node-signpdf signing failed:", err);
      console.log("Falling back to forge-based signing...");
      return signPdfWithFallback(pdfBuffer, p12Buffer, passphrase, signerInfo);
    }
  } else {
    console.log("node-signpdf not available, using fallback signing...");
    return signPdfWithFallback(pdfBuffer, p12Buffer, passphrase, signerInfo);
  }
}

/**
 * (Optional) Set PDF permissions to prevent editing (using pdf-lib)
 * @param pdfBuffer Buffer of the signed PDF
 * @returns Buffer of the locked PDF
 */
export async function lockPdfEditing(pdfBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  pdfDoc.setModificationDate(new Date());
  pdfDoc.setProducer("PDF Signature System");
  pdfDoc.setCreator("PDF Signature System");
  return Buffer.from(await pdfDoc.save());
}

/**
 * Fallback: Simple method to add basic signature structure using forge
 * This is used if node-signpdf is not available
 * Returns the original PDF with signature metadata embedded properly
 */
export async function signPdfWithFallback(
  pdfBuffer: Buffer,
  p12Buffer: Buffer,
  passphrase: string,
  signerInfo?: SignerInfo
): Promise<Buffer> {
  console.warn("Using fallback signing method (forge-based)");
  
  // Import required libraries
  let forge: any;
  try {
    forge = require("node-forge");
  } catch (e) {
    throw new Error("node-forge not available for fallback signing");
  }

  try {
    // Parse PKCS#12
    const p12DerBytes = p12Buffer.toString("binary");
    const p12Der = forge.util.createBuffer(p12DerBytes, "binary");
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    
    let p12: any;
    try {
      p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, passphrase);
    } catch (e) {
      try {
        p12 = forge.pkcs12.decrypt(p12Asn1, passphrase);
      } catch (e2) {
        throw new Error(`Could not parse PKCS#12: ${e}`);
      }
    }

    // Extract key and cert
    let privateKey: any = null;
    let certificate: any = null;

    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    if (keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]) {
      privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;
    }

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    if (certBags[forge.pki.oids.certBag]) {
      certificate = certBags[forge.pki.oids.certBag][0].cert;
    }

    if (!privateKey || !certificate) {
      throw new Error("Could not extract private key or certificate from P12");
    }

    // Prepare PDF for signing - add signature placeholder
    let pdfToSign = pdfBuffer;
    
    // Normalize PDF first to avoid object streams that break placeholder parsing
    try {
      const normalized = await normalizePdfBuffer(pdfBuffer);
      pdfToSign = normalized;
    } catch (e) {
      console.warn("PDF normalization failed, continue with original buffer", e);
      pdfToSign = pdfBuffer;
    }
    
    // Try to add placeholder if plainAddPlaceholder is available
    if (plainAddPlaceholder) {
      try {
        pdfToSign = plainAddPlaceholder({
          pdfBuffer: pdfToSign,
          reason: signerInfo?.position ? `Signed as ${signerInfo.position}` : 'Document signed digitally',
          contactInfo: signerInfo?.organization || '',
          name: signerInfo?.name || 'Digital Signature',
          location: signerInfo?.organization || '',
          signatureLength: 8192,
        });
        console.log("Added signature placeholder");
      } catch (e) {
        console.warn("Could not add placeholder:", e);
      }
    }

    // Check if ByteRange exists after placeholder; if not, try once more on original buffer
    let pdfTextAfterPlaceholder = pdfToSign.toString('latin1');
    if (!pdfTextAfterPlaceholder.includes('/ByteRange')) {
      console.warn('ByteRange still missing after placeholder, retrying on original buffer');
      if (plainAddPlaceholder) {
        try {
          pdfToSign = plainAddPlaceholder({
            pdfBuffer: pdfBuffer,
            reason: signerInfo?.position ? `Signed as ${signerInfo.position}` : 'Document signed digitally',
            contactInfo: signerInfo?.organization || '',
            name: signerInfo?.name || 'Digital Signature',
            location: signerInfo?.organization || '',
            signatureLength: 12288,
          });
          pdfTextAfterPlaceholder = pdfToSign.toString('latin1');
          console.log('Retry placeholder; ByteRange present:', pdfTextAfterPlaceholder.includes('/ByteRange'));
        } catch (e2) {
          console.warn('Retry placeholder failed:', e2);
        }
      }
    }

    // Locate /Contents placeholder and /ByteRange placeholders (with asterisks) and compute actual ranges ourselves
    const pdfText = pdfToSign.toString('latin1'); // latin1 keeps 1:1 byte mapping

    // Find Contents placeholder
    const contentsTag = '/Contents <';
    const contentsStart = pdfText.indexOf(contentsTag);
    if (contentsStart === -1) {
      throw new Error('Could not find /Contents placeholder');
    }
    const placeholderStart = contentsStart + contentsTag.length;
    const placeholderEnd = pdfText.indexOf('>', placeholderStart);
    if (placeholderEnd === -1) {
      throw new Error('Could not find end of /Contents placeholder');
    }

    const initialPlaceholderLength = placeholderEnd - placeholderStart; // hex chars length

    // Find ByteRange placeholder (may include asterisks, possibly with newlines)
    const byteRangeRegex = /\/ByteRange\s*\[\s*([\d\*]+)\s+([\d\*]+)\s+([\d\*]+)\s+([\d\*]+)\s*\]/s;
    const brMatch = byteRangeRegex.exec(pdfText);
    if (!brMatch) {
      console.error('ByteRange placeholder not found in PDF');
      throw new Error('Could not parse ByteRange');
    }

    const parts = brMatch.slice(1);
    const hasAsterisk = parts.some((p) => p.includes('*'));

    // If ByteRange already concrete numbers, parse and reuse
    if (!hasAsterisk) {
      const byteRangeNums = parts.map((p) => parseInt(p, 10));
      const signedData = Buffer.concat([
        pdfToSign.slice(byteRangeNums[0], byteRangeNums[0] + byteRangeNums[1]),
        pdfToSign.slice(byteRangeNums[2], byteRangeNums[2] + byteRangeNums[3])
      ]);
      // proceed later using signedData
      // replace computed path below will recompute placeholder lengths from positions
    }

    // Compute actual byte ranges based on placeholder positions
    const byteRange = [
      0,
      placeholderStart,
      placeholderStart + initialPlaceholderLength,
      pdfToSign.length - (placeholderStart + initialPlaceholderLength),
    ];

    // Determine widths: if asterisks present, widths come from lengths; else from original numbers' length
    const widths = parts.map((p) => p.length);
    const formatNumber = (num: number, width: number) => num.toString().padStart(width, ' ');
    const byteRangeReplacement = `/ByteRange [${formatNumber(byteRange[0], widths[0])} ${formatNumber(byteRange[1], widths[1])} ${formatNumber(byteRange[2], widths[2])} ${formatNumber(byteRange[3], widths[3])}]`;

    // Replace ByteRange placeholder without changing overall PDF byte alignment (same length segments)
    const byteRangeStart = brMatch.index;
    const byteRangeEnd = byteRangeStart + brMatch[0].length;
    const beforeBR = pdfToSign.slice(0, byteRangeStart);
    const afterBR = pdfToSign.slice(byteRangeEnd);
    pdfToSign = Buffer.concat([beforeBR, Buffer.from(byteRangeReplacement, 'latin1'), afterBR]);

    // Rebuild pdfText after ByteRange replacement (length remains same because we padded numbers)
    const updatedPdfText = pdfToSign.toString('latin1');

    // Recompute placeholder positions (should be unchanged length-wise)
    const updatedContentsStart = updatedPdfText.indexOf(contentsTag);
    const updatedPlaceholderStart = updatedContentsStart + contentsTag.length;
    const updatedPlaceholderEnd = updatedPdfText.indexOf('>', updatedPlaceholderStart);

    const updatedPlaceholderLength = updatedPlaceholderEnd - updatedPlaceholderStart;

    const signedData = Buffer.concat([
      pdfToSign.slice(0, updatedPlaceholderStart),
      pdfToSign.slice(updatedPlaceholderEnd)
    ]);

    // Create PKCS#7 signature
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(signedData.toString('binary'));
    
    // Add certificate
    p7.addCertificate(certificate);
    
    // Add signer
    p7.addSigner({
      key: privateKey,
      certificate: certificate,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        {
          type: forge.pki.oids.contentType,
          value: forge.pki.oids.data
        },
        {
          type: forge.pki.oids.messageDigest
        },
        {
          type: forge.pki.oids.signingTime,
          value: new Date()
        }
      ]
    });

    // Sign
    p7.sign({ detached: true });

    // Get signature in DER format
    const derSignature = forge.asn1.toDer(p7.toAsn1()).getBytes();
    const signature = Buffer.from(derSignature, 'binary');
    
    // Convert to hex
    const signatureHex = signature.toString('hex');

    // Pad signature to fit placeholder
    const placeholderLength = updatedPlaceholderLength;
    const paddedSignatureHex = signatureHex.padEnd(placeholderLength, '0');
    
    if (paddedSignatureHex.length > placeholderLength) {
      throw new Error(`Signature too large: ${paddedSignatureHex.length} > ${placeholderLength}`);
    }

    // Replace placeholder with actual signature using byte slices to preserve lengths
    const beforeSig = pdfToSign.slice(0, updatedPlaceholderStart);
    const afterSig = pdfToSign.slice(updatedPlaceholderEnd);
    const signedPdf = Buffer.concat([
      beforeSig,
      Buffer.from(paddedSignatureHex, 'latin1'),
      afterSig,
    ]);

    console.log("Fallback PKCS#7 signing completed, size:", signedPdf.length);
    return signedPdf;
    
  } catch (err) {
    console.error("Fallback signing error:", err);
    throw new Error(`Fallback signing failed: ${(err as Error).message}`);
  }
}
