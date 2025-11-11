import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const COOKIE_NAME = "admin_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function isAdminEmail(email: string) {
  const snap = await adminDb.collection("admin_users").doc(email).get();
  if (!snap.exists) return { ok: false as const, reason: "not_found" as const };
  const disabled = snap.get("disabled");
  if (disabled === true) return { ok: false as const, reason: "disabled" as const };
  return { ok: true as const };
}

export async function POST(req: Request) {
  try {
    const { idToken } = await req.json();
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ ok: false, error: "Missing idToken" }, { status: 400 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const email = decoded.email;
    if (!email) return NextResponse.json({ ok: false, error: "Token missing email" }, { status: 400 });

    const adminCheck = await isAdminEmail(email);
    if (!adminCheck.ok) {
      try { await adminAuth.revokeRefreshTokens(decoded.uid); } catch {}
      return NextResponse.json({ ok: false, error: adminCheck.reason === "disabled" ? "Admin account disabled" : "Not an admin" }, { status: 403 });
    }

    const expiresIn = SESSION_MAX_AGE_MS;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const res = NextResponse.json({ ok: true });
    const isProd = process.env.NODE_ENV === "production";
    res.cookies.set(COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(expiresIn / 1000),
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to create session" }, { status: 401 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!cookie) return NextResponse.json({ ok: false, authenticated: false });
  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    const email = decoded.email || "";
    const adminCheck = email ? await isAdminEmail(email) : { ok: false as const };
    return NextResponse.json({ ok: true, authenticated: adminCheck.ok, email });
  } catch {
    return NextResponse.json({ ok: false, authenticated: false });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME)?.value;
  if (cookie) {
    try {
      const decoded = await adminAuth.verifySessionCookie(cookie, true);
      await adminAuth.revokeRefreshTokens(decoded.uid);
    } catch {}
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
