"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import EmailForm from "../../compoents/auth/EmailForm";
import OtpForm from "../../compoents/auth/OtpForm";


export default function AuthPage() {
  const router = useRouter();
  const auth = useAuth();

  const handleVerify = async (otp: string) => {
    const role = await auth.verifyOtp(otp);
    if (!role) return;

    if (role === "ADMIN") router.push("/admin");
    if (role === "PROCTOR") router.push("/proctor");
    if (role === "STUDENT") router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="relative w-full max-w-md">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-xl blur opacity-30" />

        <div className="relative bg-black/70 backdrop-blur-xl border border-white/10 rounded-xl p-8 shadow-xl">
          <h1 className="text-2xl font-semibold text-white mb-2">
            Welcome back
          </h1>
          <p className="text-sm text-gray-400 mb-6">
            Secure exam access via OTP verification
          </p>

          {!auth.otpSent ? (
            <EmailForm
              email={auth.email}
              setEmail={auth.setEmail}
              onSubmit={auth.requestOtp}
              loading={auth.loading}
            />
          ) : (
            <OtpForm
              onSubmit={handleVerify}
              loading={auth.loading}
            />
          )}

          {auth.error && (
            <p className="mt-4 text-sm text-red-400">{auth.error}</p>
          )}

          <p className="mt-6 text-xs text-gray-500 text-center">
            By continuing, you agree to exam monitoring policies
          </p>
        </div>
      </div>
    </div>
  );
}