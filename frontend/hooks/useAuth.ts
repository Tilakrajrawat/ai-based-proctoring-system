import { useState } from "react";
import axios from "axios";

const API = "http://localhost:8080";

export function useAuth() {
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestOtp = async () => {
    try {
      setLoading(true);
      setError(null);

      await axios.post(`${API}/auth/request-otp`, { email });
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

      const res = await axios.post(`${API}/auth/verify-otp`, {
        email,
        otp,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);

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