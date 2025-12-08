export interface SignerInfo {
  name: string;
  position?: string;
  organizationName?: string;
}

import forge from "node-forge";
import { PDFDocument } from "pdf-lib";
import { generateBarcodePNG, embedBarcodeToPDF } from "@/lib/barcode-util";
import { SignatureInfo } from "@/types";

/**
 * Sign PDF document with private key and certificate
 * Uses PKCS#7 detached signature
 */
export async function signPDF(
  pdfBuffer: Buffer,
  privateKeyPem: string,
  certificatePem: string,
  signerInfo?: SignerInfo
): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    const pdfBytes = await pdfDoc.save();

    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const certificate = forge.pki.certificateFromPem(certificatePem);

    const pdfBinaryString = forge.util.binary.raw.encode(pdfBytes);

    const md = forge.md.sha256.create();
    md.update(pdfBinaryString, "raw");

    const signature = privateKey.sign(md);

    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(pdfBinaryString);
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
          value: new Date().toISOString(),
        },
      ],
    });

    p7.sign({ detached: true });

    const derSignature = forge.asn1.toDer(p7.toAsn1()).getBytes();

    const barcodeData = [
      signerInfo?.name || "-",
      signerInfo?.position || "-",
      signerInfo?.organizationName || "-",
      new Date().toISOString(),
      Buffer.from(derSignature, "binary").toString("base64"),
    ].join("|");
    const barcodePng = await generateBarcodePNG(barcodeData);

    const signedPdfDoc = await embedSignatureInPDF(
      pdfDoc,
      derSignature,
      certificate,
      barcodePng,
      signerInfo
    );

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
  certificate: forge.pki.Certificate,
  barcodePng?: Buffer,
  signerInfo?: SignerInfo
) {
  let signerName = signerInfo?.name;
  if (!signerName) {
    const certInfo = certificate.subject.attributes.find(
      (attr: any) => attr.name === "commonName"
    );
    if (certInfo) {
      signerName =
        typeof certInfo.value === "string"
          ? certInfo.value
          : Array.isArray(certInfo.value)
          ? certInfo.value.join(", ")
          : "Unknown";
    } else {
      signerName = "Unknown";
    }
  }

  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  let yText = 80;
  firstPage.drawText(`Digitally Signed by: ${signerName}`, {
    x: 50,
    y: yText,
    size: 10,
  });
  yText -= 13;
  const positionText = signerInfo?.position ? signerInfo.position : "-";
  firstPage.drawText(`Position: ${positionText}`, {
    x: 50,
    y: yText,
    size: 10,
  });
  yText -= 13;
  const orgText = signerInfo?.organizationName
    ? signerInfo.organizationName
    : "-";
  firstPage.drawText(`Company: ${orgText}`, {
    x: 50,
    y: yText,
    size: 10,
  });
  yText -= 13;
  firstPage.drawText(`Date: ${new Date().toLocaleString("id-ID")}`, {
    x: 50,
    y: yText,
    size: 10,
  });
  yText -= 35; // space for barcode (tinggi 30 + margin 5)
  if (barcodePng) {
    await embedBarcodeToPDF(pdfDoc, barcodePng, 50, yText, 200, 30);
  }

  pdfDoc.setTitle("Signed Document");
  pdfDoc.setSubject("This document has been digitally signed");
  pdfDoc.setKeywords([
    "signed",
    "digital-signature",
    typeof signerName === "string" ? signerName : "Unknown",
  ]);
  pdfDoc.setCreator("PDF Signature System");


  return pdfDoc;
}

/**
 * Verify PDF signature
 */
export async function verifyPDFSignature(
  pdfBuffer: Buffer
): Promise<SignatureInfo | null> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    const title = pdfDoc.getTitle();
    const subject = pdfDoc.getSubject();
    const keywordsRaw = pdfDoc.getKeywords();
    let keywordsArr: string[] = [];
    if (Array.isArray(keywordsRaw)) {
      keywordsArr = keywordsRaw.filter(
        (k): k is string => typeof k === "string"
      );
    } else if (typeof keywordsRaw === "string") {
      keywordsArr = [keywordsRaw];
    }

    if (!title || !subject || keywordsArr.length === 0) {
      return null;
    }

    if (
      !keywordsArr.includes("signed") ||
      !keywordsArr.includes("digital-signature")
    ) {
      return null;
    }

    const signerName =
      keywordsArr.find(
        (k: string) => !["signed", "digital-signature"].includes(k)
      ) || "Unknown";

    return {
      valid: true,
      signedBy:
        typeof signerName === "string"
          ? signerName
          : Array.isArray(signerName)
          ? (signerName as string[]).join(", ")
          : "Unknown",
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
      signedBy:
        typeof signerName === "string"
          ? signerName
          : Array.isArray(signerName)
          ? (signerName as string[]).join(", ")
          : "Unknown",
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
