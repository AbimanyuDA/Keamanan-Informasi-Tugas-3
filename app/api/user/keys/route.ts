import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { userDb, userKeysDb } from "@/lib/db";
import { generateKeyPairAndCertificate, encryptPrivateKey } from "@/lib/crypto";
import { z } from "zod";

const generateKeysSchema = z.object({
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await getUserFromRequest(request);
    if (!tokenPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = generateKeysSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { password } = validation.data;

    const user = await userDb.findById(tokenPayload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const keyPair = await generateKeyPairAndCertificate({
      commonName: user.name,
      organizationName: user.organizationName,
      email: user.email,
    });

    const privateKeyEncrypted = encryptPrivateKey(keyPair.privateKey, password);

    await userKeysDb.create({
      userId: user.id,
      publicKey: keyPair.publicKey,
      privateKeyEncrypted,
      certificate: keyPair.certificate,
    });

    return NextResponse.json({
      message: "Keys generated successfully",
      publicKey: keyPair.publicKey,
      certificate: keyPair.certificate,
    });
  } catch (error) {
    console.error("Generate keys error:", error);
    return NextResponse.json(
      { error: "Failed to generate keys: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await getUserFromRequest(request);
    if (!tokenPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keys = await userKeysDb.findByUserId(tokenPayload.userId);
    if (!keys) {
      return NextResponse.json(
        { error: "Keys not found. Please generate keys first." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      publicKey: keys.publicKey,
      certificate: keys.certificate,
      createdAt: keys.createdAt,
    });
  } catch (error) {
    console.error("Get keys error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
