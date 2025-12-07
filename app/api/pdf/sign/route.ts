export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { userKeysDb, userDb } from "@/lib/db";
import { decryptPrivateKey } from "@/lib/crypto";
import { signPDF } from "@/lib/pdf-signer";
import { signPdfWithNodeSignpdf, lockPdfEditing } from "@/lib/pdf-signpdf";
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
    // For node-signpdf: accept PKCS#12 (PFX) and passphrase
    const p12File = formData.get("p12") as File | null;
    const p12Passphrase = formData.get("p12Passphrase") as string | undefined;

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

    // Validate PDF magic number (first 4 bytes: %PDF)
    if (pdfBuffer.length < 4 || pdfBuffer.toString("utf8", 0, 4) !== "%PDF") {
      return NextResponse.json(
        { error: "Uploaded file is not a valid PDF document." },
        { status: 400 }
      );
    }

    // If P12 and passphrase provided, use node-signpdf for true digital signature
    if (p12File && p12Passphrase) {
      const p12Buffer = Buffer.from(await p12File.arrayBuffer());
      let signedPdf = await signPdfWithNodeSignpdf(
        pdfBuffer,
        p12Buffer,
        p12Passphrase
      );
      signedPdf = await lockPdfEditing(signedPdf);
      const signedPdfUint8 = new Uint8Array(signedPdf);
      return new NextResponse(signedPdfUint8, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=\"signed_${pdfFile.name}\"`,
        },
      });
    } else {
      // Fallback: legacy sign (metadata only)
      const user = await userDb.findById(tokenPayload.userId);
      const signerInfo = user
        ? {
            name: user.name || "-",
            position: user.position || "-",
            organizationName: user.organizationName || "-",
          }
        : undefined;
      const signedPdfBuffer = await signPDF(
        pdfBuffer,
        privateKey,
        keys.certificate,
        signerInfo
      );
      const signedPdfUint8 = new Uint8Array(signedPdfBuffer);
      return new NextResponse(signedPdfUint8, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=\"signed_${pdfFile.name}\"`,
        },
      });
    }
  } catch (error) {
    console.error("Sign PDF error:", error);
    return NextResponse.json(
      { error: "Failed to sign PDF: " + (error as Error).message },
      { status: 500 }
    );
  }
}
