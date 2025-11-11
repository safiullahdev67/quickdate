import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

async function createAdminDoc(email: string) {
  const now = new Date();
  await adminDb.collection("admin_users").doc(email).set(
    {
      email,
      name: "QuickDate Admin",
      disabled: false,
      updatedAt: now,
      createdAt: now,
    },
    { merge: true }
  );
}

export async function GET() {
  // Dev-only helper: block in production for safety
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not allowed in production" }, { status: 403 });
  }
  try {
    await createAdminDoc("admin@quickdate.com");
    return NextResponse.json({ ok: true, email: "admin@quickdate.com" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function POST() {
  // Dev-only helper: block in production for safety
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not allowed in production" }, { status: 403 });
  }
  try {
    await createAdminDoc("admin@quickdate.com");
    return NextResponse.json({ ok: true, email: "admin@quickdate.com" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}
