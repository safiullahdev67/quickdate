import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import { adminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export default async function LoginPage() {
  // If already authenticated, redirect to dashboard
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  if (session) {
    try {
      await adminAuth.verifySessionCookie(session, true);
      redirect("/");
    } catch {}
  }

  return <LoginForm />;
}
