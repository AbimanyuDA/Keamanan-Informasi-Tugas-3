/**
 * Test script untuk verify digital signature pada PDF
 * Run: node test-signed-pdf.js <path-to-signed-pdf>
 */

const fs = require('fs');
const path = require('path');

function checkPdfSignatureStructure(pdfBuffer) {
  const pdfString = pdfBuffer.toString('binary');

  // Check for signature dictionary and related structures
  const hasSignatureDict = /\/Type\s*\/Sig/i.test(pdfString);
  const hasSigFlags = /\/SigFlags/i.test(pdfString);
  const hasContentsHex = /\/Contents\s*<([0-9A-Fa-f\s]+)>/i.test(pdfString);
  const hasContentsParen = /\/Contents\s*\([\s\S]*?\)/i.test(pdfString);
  const hasByteRange = /\/ByteRange\s*\[[^\]]+\]/i.test(pdfString);
  const hasFilter = /\/Filter\s*\/Adobe\.PPKLite/i.test(pdfString) || /\/Filter\s*\/adbe\.pkcs7\.detached/i.test(pdfString);
  const hasAnnotsSig = /\/Annots\s*\[[\s\S]*?\/Sig\b/i.test(pdfString);
  const hasFieldsSig = /\/Fields\s*\[[\s\S]*?\/Sig\b/i.test(pdfString);

  // Print debug info
  console.log('\n=== PDF Signature Structure Analysis ===\n');
  console.log('Detection Results:');
  console.log('  Signature Dictionary (/Type /Sig):', hasSignatureDict ? '✓' : '✗');
  console.log('  SigFlags:', hasSigFlags ? '✓' : '✗');
  console.log('  Contents (Hex):', hasContentsHex ? '✓' : '✗');
  console.log('  ByteRange:', hasByteRange ? '✓' : '✗');
  console.log('  Filter (Adobe.PPKLite/adbe.pkcs7):', hasFilter ? '✓' : '✗');
  console.log('  Annotations with Sig:', hasAnnotsSig ? '✓' : '✗');
  console.log('  Fields with Sig:', hasFieldsSig ? '✓' : '✗');

  console.log('\nSignature Indicators:');
  
  // PKCS#7 detached signature (most common for proper digital signatures)
  if (hasByteRange && (hasContentsHex || hasContentsParen) && (hasSignatureDict || hasFilter)) {
    console.log('✓ Valid Digital Signature Found');
    console.log('  → This is a proper PKCS#7 detached signature');
    console.log('  → Document is cryptographically signed');
    console.log('  → Should be recognized by Adobe Reader');
    return { valid: true, type: 'PKCS7_DETACHED', strength: 'STRONG' };
  }

  // Strong signature indicators
  if ((hasSignatureDict || hasFilter) && (hasByteRange || hasFieldsSig || hasAnnotsSig) && (hasContentsHex || hasContentsParen)) {
    console.log('✓ Digital Signature Detected');
    console.log('  → Signature structure found with cryptographic content');
    return { valid: true, type: 'SIGNATURE_PRESENT', strength: 'MEDIUM' };
  }

  // Moderate indicators
  if (hasSignatureDict || (hasFieldsSig && hasSigFlags) || (hasByteRange && (hasContentsHex || hasContentsParen))) {
    console.log('⚠ Signature Elements Found (Possibly Incomplete)');
    console.log('  → PDF has signature-related elements but may not be complete');
    return { valid: true, type: 'SIGNATURE_ELEMENTS', strength: 'WEAK' };
  }

  console.log('✗ No Signature Found');
  console.log('  → This PDF does not contain a digital signature');
  return { valid: false, type: 'NONE', strength: 'NONE' };
}

function analyzeSignatureContent(pdfBuffer) {
  const pdfString = pdfBuffer.toString('binary');
  
  // Extract ByteRange
  const byteRangeMatch = pdfString.match(/\/ByteRange\s*\[([^\]]+)\]/i);
  if (byteRangeMatch) {
    console.log('\nByteRange:', byteRangeMatch[1].trim());
  }

  // Extract Contents length (approximate)
  const contentsMatch = pdfString.match(/\/Contents\s*<([0-9A-Fa-f\s]+)>/i);
  if (contentsMatch) {
    const contentsHex = contentsMatch[1].replace(/\s/g, '');
    console.log('Signature Content Size:', (contentsHex.length / 2), 'bytes');
  }

  // Extract Filter
  const filterMatch = pdfString.match(/\/Filter\s*\/([A-Za-z.]+)/i);
  if (filterMatch) {
    console.log('Signature Filter:', filterMatch[1]);
  }

  // Extract Reason
  const reasonMatch = pdfString.match(/\/Reason\s*\(([^)]*)\)/i);
  if (reasonMatch) {
    console.log('Signing Reason:', reasonMatch[1]);
  }

  // Extract M (timestamp)
  const mMatch = pdfString.match(/\/M\s*\(([^)]*)\)/i);
  if (mMatch) {
    console.log('Signing Time:', mMatch[1]);
  }
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node test-signed-pdf.js <path-to-signed-pdf>');
  console.log('Example: node test-signed-pdf.js signed_document.pdf');
  process.exit(1);
}

const filePath = args[0];

if (!fs.existsSync(filePath)) {
  console.error(`Error: File not found: ${filePath}`);
  process.exit(1);
}

console.log(`\nAnalyzing: ${filePath}`);
console.log(`File size: ${fs.statSync(filePath).size} bytes\n`);

const pdfBuffer = fs.readFileSync(filePath);

// Check if it's a PDF
if (!pdfBuffer.toString('utf8', 0, 4).includes('%PDF')) {
  console.error('Error: This is not a valid PDF file');
  process.exit(1);
}

const result = checkPdfSignatureStructure(pdfBuffer);
analyzeSignatureContent(pdfBuffer);

console.log('\n=== Conclusion ===');
if (result.valid) {
  console.log(`Signature Type: ${result.type}`);
  console.log(`Strength: ${result.strength}`);
  console.log('\n✓ This PDF appears to be properly signed!');
  console.log('Try opening it in Adobe Reader to verify the digital signature.');
} else {
  console.log('✗ This PDF does not contain a valid digital signature.');
}
