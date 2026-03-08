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
    <button onClick={handleLogout} style={{ padding: "8px 14px" }}>
      Logout
    </button>
  );
}
