"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/studio-admin/login");
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <span className="text-zinc-500">Перенаправление…</span>
    </div>
  );
}
