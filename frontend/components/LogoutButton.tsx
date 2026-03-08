"use client";

import { useRouter } from "next/navigation";
import { clearAuthToken } from "../lib/auth";

export default function LogoutButton() {
  const router = useRouter();
  const handleLogout = () => {
    clearAuthToken();
    router.replace("/login");
  };
  return (
    <button onClick={handleLogout} className="rounded-xl px-4 py-2 bg-white/10 border border-white/15 text-white/85 hover:bg-white/20 active:scale-[0.98] transition">
      Logout
    </button>
  );
}
