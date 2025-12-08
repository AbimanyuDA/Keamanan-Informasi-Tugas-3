const fs = require('fs');
const path = require('path');

// Import the functions (using require for CommonJS)
async function testVisualSignature() {
  try {
    // Dynamic import for ESM modules
    const { addVisualSignature } = await import('./lib/pdf-visual-signature.ts');
    
    const pdfPath = path.join(__dirname, 'Testingdemo.pdf');
    
    if (!fs.existsSync(pdfPath)) {
      console.error('PDF file not found:', pdfPath);
      process.exit(1);
    }

    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log('Original PDF size:', pdfBuffer.length);

    const result = await addVisualSignature(pdfBuffer, {
      name: 'John Doe',
      organization: 'PT Example Corp',
      position: 'CEO',
      timestamp: new Date(),
      reason: 'Signed as CEO',
    });

    console.log('PDF with visual signature size:', result.length);
    
    const outputPath = path.join(__dirname, 'test-visual-signature.pdf');
    fs.writeFileSync(outputPath, result);
    console.log('Saved to:', outputPath);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

testVisualSignature();
