import QRCode from "qrcode";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/**
 * Generate QR code as PNG buffer
 */
export async function generateQRCodePNG(data: string): Promise<Buffer> {
  return Buffer.from(await QRCode.toBuffer(data, { type: "png" }));
}

/**
 * Embed QR code PNG into PDF at given position
 */
export async function embedQRCodeToPDF(
  pdfDoc: PDFDocument,
  pngBuffer: Buffer,
  x: number,
  y: number,
  size: number
) {
  const pngImage = await pdfDoc.embedPng(pngBuffer);
  const page = pdfDoc.getPages()[0];
  page.drawImage(pngImage, {
    x,
    y,
    width: size,
    height: size,
  });
}
