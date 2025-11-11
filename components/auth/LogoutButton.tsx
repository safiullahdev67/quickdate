"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

interface Props {
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}

export default function LogoutButton({ className, variant = "ghost", size = "sm" }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      // Ensure client-side Firebase auth state is cleared as well
      try { await signOut(auth); } catch {}
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={onLogout} className={className} variant={variant} size={size} disabled={loading}>
      {loading ? "Signing out…" : "Sign out"}
    </Button>
  );
}
