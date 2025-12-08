const fs = require("fs");
const path = require("path");

function analyzeString(pdfString) {
  const patterns = {
    hasSignatureDict: /\/Type\s*\/Sig/i,
    hasSigFlags: /\/SigFlags/i,
    hasContentsHex: /\/Contents\s*<([0-9A-Fa-f\s]+)>/i,
    hasContentsParen: /\/Contents\s*\([\s\S]*?\)/i,
    hasByteRange: /\/ByteRange\s*\[[^\]]+\]/i,
    hasWidget: /\/Subtype\s*\/Widget/i,
    hasAnnotsSig: /\/Annots\s*\[[\s\S]*?\/Sig\b/i,
    hasFieldsSig: /\/Fields\s*\[[\s\S]*?\/Sig\b/i,
    hasAcroForm: /\/AcroForm/i,
  };

  const found = {};
  for (const k of Object.keys(patterns)) {
    found[k] = patterns[k].test(pdfString);
  }

  function idx(re) {
    const m = pdfString.match(re);
    return m ? pdfString.indexOf(m[0]) : -1;
  }

  console.log("Pattern matches:", found);
  console.log(
    "Indices: ByteRange=",
    idx(/\/ByteRange\s*\[[^\]]+\]/i),
    "ContentsHex=",
    idx(/\/Contents\s*<([0-9A-Fa-f\s]+)>/i),
    "ContentsParen=",
    idx(/\/Contents\s*\([\s\S]*?\)/i)
  );

  if (found.hasByteRange && (found.hasContentsHex || found.hasContentsParen))
    return "Digital Signature Detected";
  if (
    found.hasSignatureDict ||
    found.hasFieldsSig ||
    found.hasAnnotsSig ||
    (found.hasSigFlags && (found.hasContentsHex || found.hasContentsParen))
  )
    return "Signature Elements Found";
  if (
    found.hasAcroForm ||
    found.hasWidget ||
    found.hasContentsHex ||
    found.hasContentsParen
  )
    return "Signature Elements Found (weak)";
  return "No Signature Found";
}

function dumpSnippet(buf, len = 1024) {
  const hex = buf
    .slice(0, len)
    .toString("hex")
    .match(/.{1,2}/g)
    .join(" ");
  const ascii = buf
    .slice(0, len)
    .toString("latin1")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ".");
  return { hex, ascii };
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.log(
      "No file provided. Run: node test-detect-signature.js <path-to-pdf>"
    );
    const sample =
      "%PDF-1.4\n... /ByteRange [0 100 101 200] /Contents <4a6f686e> ... %%EOF";
    console.log("Sample detection ->", analyzeString(sample));
    return;
  }

  const filePath = path.resolve(arg);
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(2);
  }

  const buf = fs.readFileSync(filePath);
  console.log("File size:", buf.length, "bytes");

  const first = dumpSnippet(buf, 1024);
  const last = dumpSnippet(buf.slice(Math.max(0, buf.length - 1024)), 1024);
  console.log("\n--- First 1KB (ascii) ---\n");
  console.log(first.ascii);
  console.log("\n--- Last 1KB (ascii) ---\n");
  console.log(last.ascii);

  const asBinary = buf.toString("binary");
  const result = analyzeString(asBinary);
  console.log("\nDetection result ->", result);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
