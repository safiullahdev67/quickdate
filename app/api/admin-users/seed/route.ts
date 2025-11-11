import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";

/**
 * Secure endpoint to create or update an admin user document.
 * Requires header: Authorization: Bearer <ADMIN_SEED_TOKEN>
 * Body: { email: string, disabled?: boolean, name?: string }
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  const token = (auth || "").replace(/^Bearer\s+/i, "");
  const expected = process.env.ADMIN_SEED_TOKEN || "";
  if (!expected || token !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email, disabled = false, name = "", password } = (await req.json()) || {};
    if (!email || typeof email !== "string") {
      return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
    }
    let uid: string | undefined;
    // If password provided, create or update the Firebase Auth user as well
    if (typeof password === "string" && password.length >= 6) {
      try {
        // Try to get existing user
        const existing = await adminAuth.getUserByEmail(email).catch(() => null);
        if (existing) {
          uid = existing.uid;
          await adminAuth.updateUser(existing.uid, { password, disabled: Boolean(disabled), displayName: name || existing.displayName || undefined });
        } else {
          const created = await adminAuth.createUser({ email, password, disabled: Boolean(disabled), displayName: name || undefined });
          uid = created.uid;
        }
      } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "Failed to create/update Auth user" }, { status: 400 });
      }
    }
    const docRef = adminDb.collection("admin_users").doc(email);
    const now = new Date();
    await docRef.set(
      {
        email,
        disabled: Boolean(disabled),
        name,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );
    return NextResponse.json({ ok: true, email, uid: uid || null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}
