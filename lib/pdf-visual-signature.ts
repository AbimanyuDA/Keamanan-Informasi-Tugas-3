import { PDFDocument, rgb, StandardFonts, PDFPage } from "pdf-lib";
import { generateBarcodePNG } from "./barcode-util";

export interface VisualSignatureInfo {
  name: string;
  organization?: string;
  position?: string;
  timestamp: Date;
  reason?: string;
}

/**
 * Add visual signature box to the PDF
 * This creates a visible signature appearance on the last page
 */
export async function addVisualSignature(
  pdfBuffer: Buffer,
  signatureInfo: VisualSignatureInfo
): Promise<Buffer> {
  try {
    console.log("Loading PDF document...");
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true, updateMetadata: false });
    console.log("PDF loaded, pages count:", pdfDoc.getPageCount());
    
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();
    console.log("Last page size:", width, "x", height);

    // Load fonts
    console.log("Embedding fonts...");
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    console.log("Fonts embedded");

    // Signature box dimensions and position (bottom-right corner)
    const boxWidth = 250;
    const boxHeight = 120;
    const boxX = width - boxWidth - 30;
    const boxY = 30;

    console.log("Drawing signature box at:", boxX, boxY);

    // Draw signature box background
    lastPage.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
      borderColor: rgb(0.2, 0.3, 0.6),
      borderWidth: 2,
      color: rgb(0.95, 0.97, 1),
    });

    // Draw "DIGITALLY SIGNED" header
    lastPage.drawText("DIGITALLY SIGNED", {
      x: boxX + 10,
      y: boxY + boxHeight - 20,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.3, 0.6),
    });

    // Draw separator line
    lastPage.drawLine({
      start: { x: boxX + 10, y: boxY + boxHeight - 25 },
      end: { x: boxX + boxWidth - 10, y: boxY + boxHeight - 25 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });

    let currentY = boxY + boxHeight - 40;

    // Draw signer name
    lastPage.drawText("Signed by:", {
      x: boxX + 10,
      y: currentY,
      size: 8,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });
    currentY -= 12;
    
    lastPage.drawText(signatureInfo.name, {
      x: boxX + 10,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    currentY -= 15;

    // Draw organization if available
    if (signatureInfo.organization) {
      lastPage.drawText(`Org: ${signatureInfo.organization}`, {
        x: boxX + 10,
        y: currentY,
        size: 7,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
        maxWidth: boxWidth - 20,
      });
      currentY -= 12;
    }

    // Draw position if available
    if (signatureInfo.position) {
      lastPage.drawText(`Pos: ${signatureInfo.position}`, {
        x: boxX + 10,
        y: currentY,
        size: 7,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      currentY -= 12;
    }

    // Draw timestamp
    const dateStr = signatureInfo.timestamp.toLocaleString("id-ID", {
      dateStyle: "short",
      timeStyle: "short",
    });
    lastPage.drawText(`Date: ${dateStr}`, {
      x: boxX + 10,
      y: currentY,
      size: 7,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });

    console.log("Signature box drawn, saving PDF...");
    
    // Save with minimal options to avoid serialization issues
    const pdfBytes = await pdfDoc.save({ 
      useObjectStreams: false,
      addDefaultPage: false,
      objectsPerTick: 50,
    });
    
    console.log("PDF saved successfully, size:", pdfBytes.length, "bytes");
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("Error in addVisualSignature:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw error;
  }
}

/**
 * Add signature field annotation to the PDF
 * This makes the signature recognized by PDF readers
 * NOTE: This function is currently disabled due to pdf-lib API limitations
 */
async function addSignatureField(
  pdfDoc: PDFDocument,
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number
) {
  // Disabled - signature field will be added by cryptographic signing
  return;
}

/**
 * Lock PDF for editing by setting document permissions
 */
export async function lockPdfForEditing(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Set document as final/locked
    pdfDoc.setProducer("PDF Digital Signature System");
    pdfDoc.setCreator("PDF Digital Signature System");
    pdfDoc.setModificationDate(new Date());
    
    // Note: pdf-lib doesn't support encryption/permissions directly
    // For full PDF locking, you'd need to use qpdf or other tools
    
    return Buffer.from(await pdfDoc.save({ useObjectStreams: false }));
  } catch (error) {
    console.error("Error locking PDF:", error);
    return pdfBuffer; // Return original if locking fails
  }
}
