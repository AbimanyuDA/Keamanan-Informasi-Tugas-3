import { NextRequest, NextResponse } from "next/server";
import { userDb } from "@/lib/db";
import { generateToken } from "@/lib/auth";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(["organization", "consultant"]),
  organizationName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { email, password, name, role, organizationName } = validation.data;

    // Check if user already exists
    const existingUser = await userDb.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Validate organization name for organization role
    if (role === "organization" && !organizationName) {
      return NextResponse.json(
        { error: "Organization name is required for organization accounts" },
        { status: 400 }
      );
    }

    // Create user
    const user = await userDb.create({
      email,
      password,
      name,
      role,
      organizationName,
    });

    // Generate token
    const token = generateToken(user);

    return NextResponse.json(
      {
        token,
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
