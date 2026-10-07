"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/features/auth/model/auth.repository";
import { safeNextPath } from "@/lib/safeRedirect";

export default function LogoutScreen() {
  const router = useRouter();

  useEffect(() => {
    // Head home whether or not the server call succeeds: signOut() always
    // clears the local session cookies.
    // The admin dashboard logs out back to its own login page.
    const next = safeNextPath(new URLSearchParams(window.location.search).get("next"), "");
    void signOut().finally(() => {
      router.replace(next === "/admin/login" ? next : "/?notice=signed-out");
      router.refresh();
    });
  }, [router]);

  return (
    <p role="status" className="px-4 py-20 text-center text-muted">
      Signing you out…
    </p>
  );
}
