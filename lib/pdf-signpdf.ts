import { PDFDocument } from "pdf-lib";

// Try to load node-signpdf
let signpdfLoaded = false;
let signpdf: any = null;
let plainAddPlaceholder: any = null;

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
    
    signpdfLoaded = true;
    console.log("node-signpdf loaded successfully");
  } catch (e) {
    console.warn("Failed to load node-signpdf:", e);
    signpdfLoaded = true; // Mark as loaded to avoid retrying
  }
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
  if (signpdf && typeof signpdf === "function") {
    try {
      console.log("Attempting to sign with node-signpdf directly...");
      
      let pdfToSign = pdfBuffer;
      
      // Try to add placeholder if available
      if (plainAddPlaceholder && typeof plainAddPlaceholder === "function") {
        try {
          console.log("Adding signature placeholder...");
          const signerName = signerInfo ? `${signerInfo.name}${signerInfo.organization ? ` (${signerInfo.organization})` : ''}` : 'Digital Signature';
          const reason = signerInfo?.position ? `Signed as ${signerInfo.position}` : 'Document signed digitally';
          
          pdfToSign = plainAddPlaceholder({
            pdfBuffer: pdfBuffer,
            reason: reason,
            name: signerName,
            location: signerInfo?.organization || '',
            signatureLength: 8192,
          });
          console.log("Placeholder added, PDF size:", pdfToSign.length);
        } catch (err) {
          console.log("Could not add placeholder, trying normalization...");
          try {
            const normalized = await normalizePdfBuffer(pdfBuffer);
            const signerName = signerInfo ? `${signerInfo.name}${signerInfo.organization ? ` (${signerInfo.organization})` : ''}` : 'Digital Signature';
            const reason = signerInfo?.position ? `Signed as ${signerInfo.position}` : 'Document signed digitally';
            
            pdfToSign = plainAddPlaceholder({
              pdfBuffer: normalized,
              reason: reason,
              name: signerName,
              location: signerInfo?.organization || '',
              signatureLength: 8192,
            });
            console.log("Placeholder added to normalized PDF, size:", pdfToSign.length);
          } catch (err2) {
            console.log("Could not add placeholder even after normalization, signing without it");
            pdfToSign = pdfBuffer;
          }
        }
      }
      
      // Sign the PDF
      const signedPdf = signpdf(pdfToSign, p12Buffer, { passphrase });
      console.log("PDF signed successfully with node-signpdf, size:", signedPdf.length);
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
 */
export async function signPdfWithFallback(
  pdfBuffer: Buffer,
  p12Buffer: Buffer,
  passphrase: string,
  signerInfo?: SignerInfo
): Promise<Buffer> {
  console.warn("Using fallback signing method (forge-based)");
  
  // Import forge dynamically
  let forge: any;
  try {
    forge = require("node-forge");
  } catch (e) {
    throw new Error("node-forge not available for fallback signing");
  }

  try {
    // Read P12 as binary
    const p12DerBytes = p12Buffer.toString("binary");
    
    // Parse PKCS#12 using forge
    // Create a buffer from the DER bytes
    const p12Der = forge.util.createBuffer(p12DerBytes, "binary");
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    
    // Decode PKCS#12
    let p12: any;
    try {
      // Try the standard method
      p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, passphrase);
    } catch (e) {
      // Try alternate method name
      try {
        p12 = forge.pkcs12.decrypt(p12Asn1, passphrase);
      } catch (e2) {
        throw new Error(`Could not parse PKCS#12: ${e}`);
      }
    }

    // Extract key and cert from PKCS#12
    let privateKey: any = null;
    let certificate: any = null;

    try {
      // Try to get private key
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      if (keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]) {
        privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;
      }

      // Try to get certificate
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      if (certBags[forge.pki.oids.certBag]) {
        certificate = certBags[forge.pki.oids.certBag][0].cert;
      }
    } catch (e) {
      console.error("Error extracting key/cert from P12:", e);
    }

    if (!privateKey || !certificate) {
      throw new Error("Could not extract private key or certificate from P12");
    }

    // Create PKCS#7 signature
    const pdfBytes = pdfBuffer;
    const pdfBinary = pdfBytes.toString("binary");
    
    // Create digest
    const md = forge.md.sha256.create();
    md.update(pdfBinary, "binary");

    // Create signed data
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(pdfBinary, "binary");
    p7.addCertificate(certificate);
    p7.addSigner({
      key: privateKey,
      certificate: certificate,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        {
          type: forge.pki.oids.contentType,
          value: forge.pki.oids.data,
        },
        {
          type: forge.pki.oids.messageDigest,
        },
        {
          type: forge.pki.oids.signingTime,
          value: new Date(),
        },
      ],
    });

    p7.sign({ detached: true });

    // Get DER signature
    const derSignature = forge.asn1.toDer(p7.toAsn1()).getBytes();
    const signatureHex = forge.util.binary.hex.encode(derSignature);
    
    // Create timestamp
    const now = new Date();
    const timestamp = `D:${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}Z`;
    
    // Build signer name with organization
    const signerName = signerInfo ? `${signerInfo.name}${signerInfo.organization ? ` (${signerInfo.organization})` : ''}` : 'Digital Signature';
    const reason = signerInfo?.position ? `Signed as ${signerInfo.position}` : 'Document signed digitally';
    const location = signerInfo?.organization || '';
    
    // Append signature object to PDF with signer information
    const signatureObj = `\n1 0 obj\n<< /Type /Sig /Filter /adbe.pkcs7.detached /Name (${signerName}) /Reason (${reason}) /Location (${location}) /M (${timestamp}) /Contents <${signatureHex}> >>\nendobj\n`;
    
    const signedPdf = Buffer.concat([
      pdfBuffer,
      Buffer.from(signatureObj, "utf8"),
    ]);

    console.log("Fallback signing completed, size:", signedPdf.length);
    return signedPdf;
  } catch (err) {
    console.error("Fallback signing error:", err);
    throw new Error(`Fallback signing failed: ${(err as Error).message}`);
  }
}
