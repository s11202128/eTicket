"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/features/auth/model/auth.repository";

export default function LogoutScreen() {
  const router = useRouter();

  useEffect(() => {
    // Head home whether or not the server call succeeds: signOut() always
    // clears the local session cookies.
    void signOut().finally(() => {
      router.replace("/?notice=signed-out");
      router.refresh();
    });
  }, [router]);

  return (
    <p role="status" className="px-4 py-20 text-center text-muted">
      Signing you out…
    </p>
  );
}
