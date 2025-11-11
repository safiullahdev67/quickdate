import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

/**
 * Verifies the Firebase session cookie and ensures the user exists in the
 * Firestore `admin_users` collection and is not disabled.
 * Redirects to /login if verification fails.
 */
export async function requireAdmin(): Promise<import("firebase-admin/auth").DecodedIdToken> {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  if (!session?.value) {
    redirect("/login");
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(session.value, true);
    const email = decoded.email;
    if (!email) throw new Error("Missing email in token");

    const adminDoc = await adminDb.collection("admin_users").doc(email).get();
    if (!adminDoc.exists) throw new Error("Not an admin user");
    const disabled = adminDoc.get("disabled");
    if (disabled === true) throw new Error("Admin is disabled");

    return decoded;
  } catch (e) {
    redirect("/login");
  }
}
