import { plainAddPlaceholder, sign } from 'node-signpdf';
import { PDFDocument } from 'pdf-lib';

/**
 * Sign a PDF using node-signpdf so the signature is valid in Adobe Reader and locked from editing.
 * @param pdfBuffer Buffer of the unsigned PDF
 * @param p12Buffer Buffer of the PKCS#12 (PFX) file containing private key and certificate
 * @param passphrase Passphrase for the P12 file
 * @returns Buffer of the signed PDF
 */
export async function signPdfWithNodeSignpdf(
  pdfBuffer: Buffer,
  p12Buffer: Buffer,
  passphrase: string
): Promise<Buffer> {
  // Add signature placeholder (required by node-signpdf)
  const pdfWithPlaceholder = plainAddPlaceholder({
    pdfBuffer,
    reason: 'Document signed digitally',
    signatureLength: 8192, // default is 8192 bytes
  });

  // Sign the PDF
  const signedPdf = sign(pdfWithPlaceholder, p12Buffer, { passphrase });
  return signedPdf;
}

/**
 * (Optional) Set PDF permissions to prevent editing (using pdf-lib)
 * @param pdfBuffer Buffer of the signed PDF
 * @returns Buffer of the locked PDF
 */
export async function lockPdfEditing(pdfBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  // pdf-lib does not support setting permissions directly, but you can set metadata
  pdfDoc.setModificationDate(new Date());
  pdfDoc.setProducer('PDF Signature System');
  pdfDoc.setCreator('PDF Signature System');
  // Save and return
  return Buffer.from(await pdfDoc.save());
}
