import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { userKeysDb } from "@/lib/db";
import { decryptPrivateKey } from "@/lib/crypto";
import { signPDF } from "@/lib/pdf-signer";
import { z } from "zod";

const signPDFSchema = z.object({
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    // Get user from token
    const tokenPayload = await getUserFromRequest(request);
    if (!tokenPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is organization
    if (tokenPayload.role !== "organization") {
      return NextResponse.json(
        { error: "Only organizations can sign PDF documents" },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const pdfFile = formData.get("pdf") as File;
    const password = formData.get("password") as string;

    if (!pdfFile || !password) {
      return NextResponse.json(
        { error: "PDF file and password are required" },
        { status: 400 }
      );
    }

    // Validate password
    const validation = signPDFSchema.safeParse({ password });
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    // Get user keys
    const keys = await userKeysDb.findByUserId(tokenPayload.userId);
    if (!keys) {
      return NextResponse.json(
        { error: "Keys not found. Please generate keys first." },
        { status: 404 }
      );
    }

    // Decrypt private key
    let privateKey: string;
    try {
      privateKey = decryptPrivateKey(keys.privateKeyEncrypted, password);
    } catch (error) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Read PDF file
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());

    // Sign PDF
    const signedPdfBuffer = await signPDF(
      pdfBuffer,
      privateKey,
      keys.certificate
    );

    // Return signed PDF
    return new NextResponse(signedPdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="signed_${pdfFile.name}"`,
      },
    });
  } catch (error) {
    console.error("Sign PDF error:", error);
    return NextResponse.json(
      { error: "Failed to sign PDF: " + (error as Error).message },
      { status: 500 }
    );
  }
}
