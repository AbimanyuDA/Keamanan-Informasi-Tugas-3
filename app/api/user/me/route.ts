import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { userDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await getUserFromRequest(request);
    if (!tokenPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await userDb.findById(tokenPayload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
