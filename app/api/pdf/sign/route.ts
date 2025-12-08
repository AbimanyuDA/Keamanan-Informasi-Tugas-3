export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { userKeysDb } from "@/lib/db";
import { decryptPrivateKey } from "@/lib/crypto";
import { signPdfWithNodeSignpdf, signPdfWithFallback, SignerInfo } from "@/lib/pdf-signpdf";
import { addVisualSignature, lockPdfForEditing } from "@/lib/pdf-visual-signature";
import forge from "node-forge";
import { z } from "zod";
import User from "@/models/User";

const signPDFSchema = z.object({
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await getUserFromRequest(request);
    if (!tokenPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (tokenPayload.role !== "organization") {
      return NextResponse.json(
        { error: "Only organizations can sign PDF documents" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const pdfFile = formData.get("pdf") as File;
    const password = formData.get("password") as string;
    const p12File = formData.get("p12") as File | null;
    const p12Passphrase = formData.get("p12Passphrase") as string | undefined;

    if (!pdfFile || !password) {
      return NextResponse.json(
        { error: "PDF file and password are required" },
        { status: 400 }
      );
    }

    const validation = signPDFSchema.safeParse({ password });
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const keys = await userKeysDb.findByUserId(tokenPayload.userId);
    if (!keys) {
      return NextResponse.json(
        { error: "Keys not found. Please generate keys first." },
        { status: 404 }
      );
    }

    // Fetch user data for signer information
    const user = await User.findById(tokenPayload.userId).lean();
    const signerInfo: SignerInfo = {
      name: user?.name || "Unknown",
      organization: user?.organizationName,
      position: user?.position,
    };

    let privateKey: string;
    try {
      privateKey = decryptPrivateKey(keys.privateKeyEncrypted, password);
    } catch (error) {
      console.error("Decrypt private key failed:", error);
      return NextResponse.json(
        { error: "Invalid password", details: (error as Error).message },
        { status: 401 }
      );
    }

    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());

    // Log input summary
    console.log("Sign PDF input summary:", {
      pdfSize: pdfBuffer.length,
      pdfHeader: pdfBuffer.toString("utf8", 0, 8),
      privateKeyStart: privateKey.slice(0, 32),
      certificateStart: keys.certificate.slice(0, 32),
    });

    // Validate PDF header
    if (
      pdfBuffer.length < 4 ||
      !pdfBuffer.toString("utf8", 0, 4).includes("%PDF")
    ) {
      return NextResponse.json(
        {
          error: "Uploaded file is not a valid PDF document.",
          details: pdfBuffer.toString("utf8", 0, 8),
        },
        { status: 400 }
      );
    }

    // Step 1: Add visual signature to PDF
    console.log("Adding visual signature to PDF...");
    console.log("Signer info:", signerInfo);
    let pdfWithVisual: Buffer;
    try {
      pdfWithVisual = await addVisualSignature(pdfBuffer, {
        name: signerInfo.name,
        organization: signerInfo.organization,
        position: signerInfo.position,
        timestamp: new Date(),
        reason: signerInfo.position ? `Signed as ${signerInfo.position}` : "Document signed digitally",
      });
      console.log("✓ Visual signature added successfully! Size:", pdfWithVisual.length, "bytes");
    } catch (err) {
      console.error("✗ Failed to add visual signature:", err);
      console.error("Error details:", err instanceof Error ? err.message : String(err));
      pdfWithVisual = pdfBuffer;
      console.log("Continuing with original PDF (no visual signature)");
    }

    // If P12 file provided, use it directly
    if (p12File && p12Passphrase) {
      console.log("Signing with provided P12 file...");
      try {
        const p12Buffer = Buffer.from(await p12File.arrayBuffer());
        const signedPdf = await signPdfWithNodeSignpdf(
          pdfWithVisual,
          p12Buffer,
          p12Passphrase,
          signerInfo
        );
        
        const signedPdfUint8 = new Uint8Array(signedPdf);
        return new NextResponse(signedPdfUint8, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=\"signed_${pdfFile.name}\"`,
          },
        });
      } catch (err) {
        console.error("Error signing with P12 file:", err);
        return NextResponse.json(
          {
            error: "Digital signature failed with P12 file",
            details: (err as Error).message,
          },
          { status: 500 }
        );
      }
    }

    // Otherwise, convert stored keys to P12 and sign
    console.log("Signing with stored keys converted to P12...");
    try {
      // Validate PEM format
      if (
        !privateKey.includes("BEGIN PRIVATE KEY") &&
        !privateKey.includes("BEGIN RSA PRIVATE KEY")
      ) {
        throw new Error(
          "Private key PEM format invalid. Value: " + privateKey.slice(0, 64)
        );
      }
      if (!keys.certificate.includes("BEGIN CERTIFICATE")) {
        throw new Error(
          "Certificate PEM format invalid. Value: " +
            keys.certificate.slice(0, 64)
        );
      }

      // Parse PEM into forge objects
      let privateKeyObj, certificateObj;
      try {
        privateKeyObj = forge.pki.privateKeyFromPem(privateKey);
      } catch (e) {
        throw new Error(
          "Failed to parse private key PEM: " +
            (e as Error).message +
            " Value: " +
            privateKey.slice(0, 64)
        );
      }

      try {
        certificateObj = forge.pki.certificateFromPem(keys.certificate);
      } catch (e) {
        throw new Error(
          "Failed to parse certificate PEM: " +
            (e as Error).message +
            " Value: " +
            keys.certificate.slice(0, 64)
        );
      }

      // Convert to PKCS#12
      let p12Buffer;
      try {
        const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
          privateKeyObj,
          [certificateObj],
          ""
        );
        const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
        p12Buffer = Buffer.from(p12Der, "binary");
        console.log("Converted keys to PKCS#12, size:", p12Buffer.length);
      } catch (e) {
        throw new Error(
          "Failed to convert to PKCS#12: " + (e as Error).message
        );
      }

      // Sign PDF with PKCS#12
      let signedPdf;
      try {
        signedPdf = await signPdfWithNodeSignpdf(pdfWithVisual, p12Buffer, "", signerInfo);
        console.log("PDF signed successfully with node-signpdf, size:", signedPdf.length);
      } catch (e) {
        console.warn("node-signpdf failed, trying fallback method...");
        try {
          signedPdf = await signPdfWithFallback(pdfWithVisual, p12Buffer, "", signerInfo);
          console.log("PDF signed with fallback method, size:", signedPdf.length);
        } catch (fallbackErr) {
          throw new Error(
            `Failed to sign PDF: ${(e as Error).message}`
          );
        }
      }

      const signedPdfUint8 = new Uint8Array(signedPdf);
      return new NextResponse(signedPdfUint8, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=\"signed_${pdfFile.name}\"`,
        },
      });
    } catch (err) {
      // Log full error including stack if available
      if (err instanceof Error) {
        console.error("Sign PDF error detail:", err.stack || err.message);
        return NextResponse.json(
          {
            error: "Digital signature failed. PDF not signed.",
            details: err.stack || err.message,
          },
          { status: 500 }
        );
      } else {
        console.error("Sign PDF error detail:", err);
        return NextResponse.json(
          {
            error: "Digital signature failed. PDF not signed.",
            details: JSON.stringify(err),
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error("Sign PDF error:", error);
    return NextResponse.json(
      { error: "Failed to sign PDF: " + (error as Error).message },
      { status: 500 }
    );
  }
}
