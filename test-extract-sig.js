const fs = require('fs');
const path = require('path');

/**
 * Extract signature information from PDF
 * Returns detailed signature information like signing time, reason, etc.
 */
function extractSignatureInfo(pdfBuffer) {
  try {
    const pdfString = pdfBuffer.toString('binary');

    // Extract signing time - look for /M (modification time) in signature dictionary
    const timeMatch = pdfString.match(/\/M\s*\((D:\d+[Z\+\-]?\d*'?\d*'?)\)/i);
    const signingTime = timeMatch ? parsePdfDate(timeMatch[1]) : new Date().toISOString();

    // Extract reason for signing - look for /Reason
    const reasonMatch = pdfString.match(/\/Reason\s*\((.*?)\)/i);
    const signingReason = reasonMatch ? reasonMatch[1].replace(/\\/g, '') : "Document signed digitally";

    // Extract signer info - look for /Name or /SubFilter
    let signedBy = "Unknown";
    const nameMatch = pdfString.match(/\/Name\s*\((.*?)\)/i);
    if (nameMatch) {
      signedBy = nameMatch[1].replace(/\\/g, '');
    }

    // Extract contents size to estimate signature strength
    const contentsMatch = pdfString.match(/\/Contents\s*<([0-9A-Fa-f\s]+)>/i);
    const contentsSize = contentsMatch ? contentsMatch[1].length / 2 : 0;

    // Determine signature type
    const isDetached = /\/Filter\s*\/adbe\.pkcs7\.detached/i.test(pdfString);
    const isPPKLite = /\/Filter\s*\/Adobe\.PPKLite/i.test(pdfString);
    const signatureType = isDetached ? "PKCS#7 Detached" : isPPKLite ? "PPKLite" : "Unknown";

    return {
      signedBy,
      signingTime,
      signingReason,
      signatureType,
      valid: true,
    };
  } catch (error) {
    return {
      signedBy: "Unknown",
      signingTime: new Date().toISOString(),
      signingReason: "Unable to extract signature details",
      signatureType: "Unknown",
      valid: false,
    };
  }
}

/**
 * Parse PDF date format (e.g., D:20251208135951Z)
 * Returns ISO format date string
 */
function parsePdfDate(pdfDate) {
  try {
    // PDF date format: D:YYYYMMDDHHmmSSOHH'mm
    const match = pdfDate.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
    if (match) {
      const [, year, month, day, hour, min, sec] = match;
      const dateStr = `${year}-${month}-${day}T${hour}:${min}:${sec}Z`;
      return new Date(dateStr).toISOString();
    }
  } catch (e) {
    // Ignore parsing errors
  }
  return new Date().toISOString();
}

// Test with actual PDF
const pdfPath = path.join(__dirname, 'signed_Testingdemo (3).pdf');
if (fs.existsSync(pdfPath)) {
  const pdfBuffer = fs.readFileSync(pdfPath);
  console.log('Testing extractSignatureInfo on: signed_Testingdemo (3).pdf');
  console.log('');
  
  const info = extractSignatureInfo(pdfBuffer);
  console.log(JSON.stringify(info, null, 2));
} else {
  console.error('File not found:', pdfPath);
}
