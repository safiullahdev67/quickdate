import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET() {
  // Dev-only helper: block in production for safety
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not allowed in production" }, { status: 403 });
  }

  const email = "admin@quickdate.com";
  const password = "Admin123@";
  const displayName = "QuickDate Admin";

  try {
    let uid: string | undefined;
    try {
      const existing = await adminAuth.getUserByEmail(email);
      uid = existing.uid;
      await adminAuth.updateUser(existing.uid, {
        password,
        disabled: false,
        displayName: existing.displayName || displayName,
      });
    } catch {
      const created = await adminAuth.createUser({ email, password, disabled: false, displayName });
      uid = created.uid;
    }

    return NextResponse.json({ ok: true, email, uid });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to create/update Firebase Auth user" }, { status: 500 });
  }
}
