import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { checkPdfSignatureStructure, extractSignatureInfo } from "@/lib/pdf-verify-signature";
import { writeFileSync } from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await getUserFromRequest(request);
    if (!tokenPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const pdfFile = formData.get("pdf") as File;

    if (!pdfFile) {
      return NextResponse.json(
        { error: "PDF file is required" },
        { status: 400 }
      );
    }

    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());

    const verifyResult = checkPdfSignatureStructure(pdfBuffer);
    const signatureInfo = extractSignatureInfo(pdfBuffer);

    if (!verifyResult.valid) {
      try {
        const basename = `failed_verify_${Date.now()}`;
        const out = path.join(process.cwd(), basename + ".pdf");
        writeFileSync(out, pdfBuffer);
        console.error(
          `Verify: no signature found — saved uploaded file to ${out} for inspection`
        );
      } catch (e) {
        console.error("Failed to write debug PDF for verify:", e);
      }
    }

    return NextResponse.json({
      valid: verifyResult.valid,
      message: verifyResult.message,
      details: verifyResult.details,
      signatureInfo: verifyResult.valid ? signatureInfo : null,
    });
  } catch (error) {
    console.error("Verify PDF error:", error);
    return NextResponse.json(
      { error: "Failed to verify PDF: " + (error as Error).message },
      { status: 500 }
    );
  }
}
