import { addVisualSignature } from './lib/pdf-visual-signature';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testVisualSignature() {
  try {
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
