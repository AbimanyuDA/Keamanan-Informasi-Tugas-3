import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { userDb } from "@/lib/db";
import { generateSampleReport } from "@/lib/pdf-generator";
import { z } from "zod";

const generatePDFSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await getUserFromRequest(request);
    if (!tokenPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (tokenPayload.role !== "organization") {
      return NextResponse.json(
        { error: "Only organizations can generate PDF reports" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = generatePDFSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { title } = validation.data;

    const user = await userDb.findById(tokenPayload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const pdfBuffer = await generateSampleReport(
      title,
      user.organizationName || user.name,
      user.name
    );

    const pdfUint8 = new Uint8Array(pdfBuffer);
    return new NextResponse(pdfUint8, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${title.replace(
          /[^a-z0-9]/gi,
          "_"
        )}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Generate PDF error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF: " + (error as Error).message },
      { status: 500 }
    );
  }
}
