import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { userDb } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  try {
    const tokenPayload = await getUserFromRequest(request);
    if (!tokenPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { name, organizationName, position } = body;
    const updated = await userDb.updateProfile(tokenPayload.userId, {
      name,
      organizationName,
      position,
    });
    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
