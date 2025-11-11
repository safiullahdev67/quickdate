"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await cred.user.getIdToken(true);

      const resp = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to create session");
      }
      // Session cookie set, navigate to dashboard
      router.replace("/");
      router.refresh();
    } catch (err: any) {
      const msg = err?.message || "Login failed";
      // Friendly messages
      if (/invalid-credential|wrong-password/i.test(msg)) {
        setError("Invalid credentials. Please check your email and password.");
      } else if (/user-not-found/i.test(msg)) {
        setError("Account not found. Ensure your admin user is added in Firestore.");
      } else if (/admin account disabled/i.test(msg)) {
        setError("Your admin account is disabled. Contact the owner.");
      } else if (/not an admin/i.test(msg)) {
        setError("You are not authorized to access the admin dashboard.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Card className="w-full max-w-md border-gray-200">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="w-[44px] h-[44px] rounded-lg overflow-hidden">
              <img src="/images/logo.jpg" alt="QuickDate Logo" className="w-full h-full object-cover" />
            </div>
            <CardTitle className="text-[24px] text-[#4b164c]" style={{ fontFamily: 'Roboto, sans-serif' }}>QuickDate Admin</CardTitle>
          </div>
          <CardDescription className="mt-2">Sign in to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-black">Email</label>
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-[46px] bg-[#f5f5f5] border-gray-200"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-black">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-[46px] bg-[#f5f5f5] border-gray-200 pr-12"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-[#4b164c] px-2 py-1 rounded-md"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</div>
            )}

            <Button type="submit" disabled={loading} className="h-[46px] bg-[#4b164c] hover:bg-[#3c123d] text-white">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
