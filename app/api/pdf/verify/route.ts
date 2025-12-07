import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { checkPdfSignatureStructure } from "@/lib/pdf-verify-signature";

export async function POST(request: NextRequest) {
  try {
    // Get user from token
    const tokenPayload = await getUserFromRequest(request);
    if (!tokenPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const pdfFile = formData.get("pdf") as File;

    if (!pdfFile) {
      return NextResponse.json(
        { error: "PDF file is required" },
        { status: 400 }
      );
    }

    // Read PDF file
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());

    // Verify signature structure
    const verifyResult = checkPdfSignatureStructure(pdfBuffer);

    return NextResponse.json({
      valid: verifyResult.valid,
      message: verifyResult.message,
      details: verifyResult.details,
    });
  } catch (error) {
    console.error("Verify PDF error:", error);
    return NextResponse.json(
      { error: "Failed to verify PDF: " + (error as Error).message },
      { status: 500 }
    );
  }
}
