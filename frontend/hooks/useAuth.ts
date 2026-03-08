import { useState } from "react";
import api from "../lib/api";
import { setAuthToken } from "../lib/auth";

export function useAuth() {
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestOtp = async () => {
    try {
      setLoading(true);
      setError(null);

      await api.post("/api/auth/request-otp", { email });
      setOtpSent(true);
    } catch {
      setError("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (otp: string) => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.post("/api/auth/verify-otp", {
        email,
        otp,
      });

      setAuthToken(res.data.token);

      return res.data.role;
    } catch {
      setError("Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    otpSent,
    loading,
    error,
    requestOtp,
    verifyOtp,
  };
}
