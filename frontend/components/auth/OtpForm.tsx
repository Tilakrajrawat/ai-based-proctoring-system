import { useState } from "react";
import { OtpFormProps } from "./types";

export default function OtpForm({
  onSubmit,
  loading,
}: OtpFormProps) {
  const [otp, setOtp] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-gray-400">
          One-time password
        </label>
        <input
          type="text"
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="mt-1 w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 text-sm text-white tracking-widest placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <button
        onClick={() => onSubmit(otp)}
        disabled={loading}
        className="w-full rounded-md bg-green-600 hover:bg-green-500 transition text-white py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Verifying…" : "Verify OTP"}
      </button>
    </div>
  );
}