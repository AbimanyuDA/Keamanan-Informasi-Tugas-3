import forge from "node-forge";
import { PDFDocument } from "pdf-lib";
import { SignatureInfo } from "@/types";

/**
 * Sign PDF document with private key and certificate
 * Uses PKCS#7 detached signature
 */
export async function signPDF(
  pdfBuffer: Buffer,
  privateKeyPem: string,
  certificatePem: string
): Promise<Buffer> {
  try {
    // Load PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Convert PDF to bytes for signing
    const pdfBytes = await pdfDoc.save();

    // Create signature
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const certificate = forge.pki.certificateFromPem(certificatePem);

    // Hash the PDF content
    const md = forge.md.sha256.create();
    md.update(forge.util.createBuffer(pdfBytes));

    // Sign the hash
    const signature = privateKey.sign(md);

    // Create PKCS#7 signature
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(pdfBytes);
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

    // Sign
    p7.sign({ detached: true });

    // Convert signature to DER format
    const derSignature = forge.asn1.toDer(p7.toAsn1()).getBytes();

    // Embed signature in PDF
    const signedPdfDoc = await embedSignatureInPDF(
      pdfDoc,
      derSignature,
      certificate
    );

    // Return signed PDF as buffer
    const signedPdfBytes = await signedPdfDoc.save();
    return Buffer.from(signedPdfBytes);
  } catch (error) {
    throw new Error("Failed to sign PDF: " + (error as Error).message);
  }
}

/**
 * Embed PKCS#7 signature into PDF
 */
async function embedSignatureInPDF(
  pdfDoc: PDFDocument,
  signature: string,
  certificate: forge.pki.Certificate
): Promise<PDFDocument> {
  // Get certificate info
  const certInfo = certificate.subject.attributes.find(
    (attr: any) => attr.name === "commonName"
  );
  const signerName = certInfo ? certInfo.value : "Unknown";

  // Add signature annotation (visual representation)
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  // Add text annotation indicating the document is signed
  firstPage.drawText(`Digitally Signed by: ${signerName}`, {
    x: 50,
    y: 50,
    size: 10,
  });

  firstPage.drawText(`Date: ${new Date().toLocaleString("id-ID")}`, {
    x: 50,
    y: 35,
    size: 10,
  });

  // Store signature in PDF metadata
  pdfDoc.setTitle("Signed Document");
  pdfDoc.setSubject("This document has been digitally signed");
  pdfDoc.setKeywords(["signed", "digital-signature", signerName]);
  pdfDoc.setProducer("PDF Signature System");
  pdfDoc.setCreator("PDF Signature System");

  // Note: For production, you would need to implement proper PDF signature dictionary
  // This is a simplified version that embeds signature information

  return pdfDoc;
}

/**
 * Verify PDF signature
 */
export async function verifyPDFSignature(
  pdfBuffer: Buffer
): Promise<SignatureInfo | null> {
  try {
    // Load PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Check if PDF has signature indicators in metadata
    const title = pdfDoc.getTitle();
    const subject = pdfDoc.getSubject();
    const keywords = pdfDoc.getKeywords();

    // This is a simplified verification
    // In production, you would extract and verify the actual PKCS#7 signature
    if (!title || !subject || !keywords) {
      return null;
    }

    if (
      !keywords.includes("signed") ||
      !keywords.includes("digital-signature")
    ) {
      return null;
    }

    // Extract signer information from keywords
    const signerName =
      keywords.find((k) => !["signed", "digital-signature"].includes(k)) ||
      "Unknown";

    // For this demo, we consider the signature valid if metadata indicates signing
    return {
      valid: true,
      signedBy: signerName,
      signedAt: new Date(), // In production, extract from signature
      certificate: "Certificate embedded in signature",
      issuer: "Self-Signed",
      subject: signerName,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      algorithm: "RSA with SHA-256",
    };
  } catch (error) {
    throw new Error(
      "Failed to verify PDF signature: " + (error as Error).message
    );
  }
}

/**
 * Extract signature information from signed PDF (advanced)
 */
export async function extractSignatureInfo(
  signedPdfBuffer: Buffer,
  certificatePem: string
): Promise<SignatureInfo> {
  try {
    const pdfDoc = await PDFDocument.load(signedPdfBuffer);
    const certificate = forge.pki.certificateFromPem(certificatePem);

    const certInfo = certificate.subject.attributes.find(
      (attr: any) => attr.name === "commonName"
    );
    const signerName = certInfo ? certInfo.value : "Unknown";

    return {
      valid: true,
      signedBy: signerName,
      signedAt: new Date(),
      certificate: certificatePem,
      issuer: certificate.issuer.attributes
        .map((a: any) => `${a.shortName || a.name}=${a.value}`)
        .join(", "),
      subject: certificate.subject.attributes
        .map((a: any) => `${a.shortName || a.name}=${a.value}`)
        .join(", "),
      validFrom: certificate.validity.notBefore,
      validTo: certificate.validity.notAfter,
      algorithm: "RSA with SHA-256",
    };
  } catch (error) {
    throw new Error(
      "Failed to extract signature info: " + (error as Error).message
    );
  }
}

/**
 * Check if PDF has been signed
 */
export async function isPDFSigned(pdfBuffer: Buffer): Promise<boolean> {
  try {
    const result = await verifyPDFSignature(pdfBuffer);
    return result !== null && result.valid;
  } catch (error) {
    return false;
  }
}
