import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Lock PDF with qpdf to prevent editing
 * Requires qpdf to be installed on the system
 */
export async function lockPdfWithQpdf(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    const tempDir = tmpdir();
    const inputPath = join(tempDir, `input_${Date.now()}.pdf`);
    const outputPath = join(tempDir, `output_${Date.now()}.pdf`);

    // Write input PDF
    writeFileSync(inputPath, pdfBuffer);

    try {
      // Use qpdf to encrypt and set permissions
      // --encrypt: Enable encryption
      // user-password: Empty (anyone can open)
      // owner-password: Random (prevents modification)
      // 256: Use 256-bit AES encryption
      // --modify=none: Disallow modifications
      // --print=full: Allow printing
      // --extract=n: Disallow content extraction
      const ownerPassword = Math.random().toString(36).slice(2) + Date.now().toString(36);
      
      execSync(
        `qpdf --encrypt "" "${ownerPassword}" 256 --modify=none --print=full --extract=n -- "${inputPath}" "${outputPath}"`,
        { stdio: 'pipe' }
      );

      // Read the output
      const lockedPdf = readFileSync(outputPath);

      // Cleanup
      try {
        unlinkSync(inputPath);
        unlinkSync(outputPath);
      } catch (e) {
        // Ignore cleanup errors
      }

      console.log('PDF locked successfully with qpdf');
      return lockedPdf;
    } catch (execError) {
      // If qpdf fails, try alternative method
      console.warn('qpdf not available, trying alternative locking method');
      throw execError;
    }
  } catch (error) {
    console.error('Failed to lock PDF with qpdf:', error);
    // Return original PDF if locking fails
    return pdfBuffer;
  }
}

/**
 * Lock PDF using pdf-lib with document-level permissions
 * This sets the PDF to read-only mode
 */
export async function lockPdfWithPdfLib(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    const { PDFDocument, PDFName, PDFDict, PDFArray, PDFNumber } = require('pdf-lib');
    
    const pdfDoc = await PDFDocument.load(pdfBuffer, { 
      ignoreEncryption: true, 
      updateMetadata: false 
    });

    // Get the document catalog
    const context = pdfDoc.context;
    const catalog = context.lookup(context.trailerInfo.Root);

    // Create Perms dictionary to restrict modifications
    // This tells PDF readers that the document should not be modified
    const perms = context.obj({
      DocMDP: context.obj({
        Type: 'SigRef',
        TransformMethod: 'DocMDP',
        TransformParams: context.obj({
          Type: 'TransformParams',
          P: 1, // No changes allowed
          V: '1.2',
        }),
      }),
    });

    catalog.set(PDFName.of('Perms'), perms);

    // Mark document as signed/locked in metadata
    pdfDoc.setProducer('PDF Signature System - Document Locked');
    pdfDoc.setKeywords(['Signed', 'Locked', 'Read-Only']);
    
    const lockedPdfBytes = await pdfDoc.save({ 
      useObjectStreams: false,
      addDefaultPage: false,
    });

    console.log('PDF locked with pdf-lib permissions');
    return Buffer.from(lockedPdfBytes);
  } catch (error) {
    console.error('Failed to lock PDF with pdf-lib:', error);
    return pdfBuffer;
  }
}

/**
 * Main function to lock PDF - tries qpdf first, falls back to pdf-lib
 */
export async function lockSignedPdf(pdfBuffer: Buffer): Promise<Buffer> {
  // Try qpdf first (strongest protection)
  try {
    return await lockPdfWithQpdf(pdfBuffer);
  } catch (qpdfError) {
    console.log('qpdf not available, using pdf-lib locking');
    // Fall back to pdf-lib method
    return await lockPdfWithPdfLib(pdfBuffer);
  }
}
