/**
 * Simple test to verify PDF signing and verification works
 */
const fs = require("fs");
const path = require("path");

// Create a simple test PDF
function createTestPDF() {
  const pdfContent = Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj
4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
5 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test Document) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
0000000301 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
395
%%EOF
`);
  return pdfContent;
}

// Test the verification logic directly
function testVerification() {
  console.log("🧪 Testing PDF verification logic...\n");

  const pdfBuffer = createTestPDF();
  const pdfString = pdfBuffer.toString("binary");

  // Test signature detection logic
  const hasSignatureDict = /\/Type\s*\/Sig/i.test(pdfString);
  const hasContents = /\/Contents\s*\(/i.test(pdfString);
  const hasByteRange = /\/ByteRange/i.test(pdfString);

  // Method 2: Look for /Annots with /Sig (annotation-based signature)
  const hasAnnotSig =
    /\/Annots\s*\[[\s\S]*?\/Subtype\s*\/Widget[\s\S]*?\/Sig/i.test(pdfString);

  // Method 3: Look for signature placeholder or field
  const hasSigField = /\/Fields\s*\[[\s\S]*?\/Type\s*\/Sig/i.test(pdfString);

  // Method 4: Check for incremental update (xref at end - indicates modification/signature)
  const hasIncrementalUpdate = /%%EOF[\s\S]*?startxref/i.test(pdfString);

  // Method 5: Look for /AcroForm which often contains signature fields
  const hasAcroForm = /\/AcroForm/i.test(pdfString);

  console.log("hasSignatureDict:", hasSignatureDict);
  console.log("hasContents:", hasContents);
  console.log("hasByteRange:", hasByteRange);
  console.log("hasAnnotSig:", hasAnnotSig);
  console.log("hasSigField:", hasSigField);
  console.log("hasIncrementalUpdate:", hasIncrementalUpdate);
  console.log("hasAcroForm:", hasAcroForm);

  // Strong indicators of signature
  const isSignatureValid =
    hasSignatureDict ||
    (hasContents && hasByteRange) ||
    hasAnnotSig ||
    hasSigField ||
    (hasAcroForm && hasContents);

  // Weak indicators
  const hasWeakIndicators = hasContents || hasIncrementalUpdate;

  if (isSignatureValid) {
    console.log("✅ Result: PDF has valid digital signature");
  } else if (hasWeakIndicators) {
    console.log("⚠️ Result: PDF has signature elements");
  } else {
    console.log("❌ Result: No signature found");
  }

  // Test metadata signature detection
  const hasMetadataSig =
    /\/Producer|\/Creator|Keywords.*signed.*digital-signature/i.test(pdfString);
  if (hasMetadataSig) {
    console.log("✅ Result: PDF has metadata signature");
  }
}

console.log("📋 Testing PDF signature detection...\n");
testVerification();
