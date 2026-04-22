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
    <button
      onClick={handleLogout}
      className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/15"
    >
      Logout
    </button>
  );
}