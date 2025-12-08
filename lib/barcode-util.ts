const bwipjs = require("bwip-js");
import { PDFDocument } from "pdf-lib";

/**
 * Generate Code128 barcode as PNG buffer
 */
export async function generateBarcodePNG(data: string): Promise<Buffer> {
  return await new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: "code128", // Barcode type
        text: data,
        scale: 3, // 3x scaling
        height: 20, // bar height, in millimeters
        includetext: true, // Show text below barcode
        textxalign: "center",
        backgroundcolor: "FFFFFF",
      },
      (err: any, png: Buffer) => {
        if (err) reject(err);
        else resolve(png);
      }
    );
  });
}

/**
 * Embed barcode PNG into PDF at given position
 */
export async function embedBarcodeToPDF(
  pdfDoc: PDFDocument,
  pngBuffer: Buffer,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const pngImage = await pdfDoc.embedPng(pngBuffer);
  const page = pdfDoc.getPages()[0];
  page.drawImage(pngImage, {
    x,
    y,
    width,
    height,
  });
}
