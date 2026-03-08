import { EmailFormProps } from "./types";

export default function EmailForm({
  email,
  setEmail,
  onSubmit,
  loading,
}: EmailFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-gray-400">
          Email address
        </label>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <button
        onClick={onSubmit}
        disabled={loading}
        className="w-full rounded-md bg-indigo-600 hover:bg-indigo-500 transition text-white py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Sending OTP…" : "Send OTP"}
      </button>
    </div>
  );
}