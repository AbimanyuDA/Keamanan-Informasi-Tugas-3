const { checkPdfSignatureStructure, extractSignatureInfo } = require('./lib/pdf-verify-signature.ts');
const fs = require('fs');
const path = require('path');

async function testVerifyFunction() {
  try {
    const pdfPath = path.join(__dirname, 'signed_Testingdemo (3).pdf');
    
    if (!fs.existsSync(pdfPath)) {
      console.error('PDF file not found:', pdfPath);
      process.exit(1);
    }

    const pdfBuffer = fs.readFileSync(pdfPath);

    console.log('Testing verification functions...');
    console.log('PDF file:', path.basename(pdfPath));
    console.log('PDF size:', pdfBuffer.length, 'bytes');
    console.log('');

    // Test structure check
    console.log('=== Structure Check ===');
    const verifyResult = checkPdfSignatureStructure(pdfBuffer);
    console.log('Valid:', verifyResult.valid);
    console.log('Message:', verifyResult.message);
    console.log('Details:', verifyResult.details);
    console.log('');

    // Test signature info extraction
    console.log('=== Signature Info ===');
    const signatureInfo = extractSignatureInfo(pdfBuffer);
    console.log(JSON.stringify(signatureInfo, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

testVerifyFunction();
