import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { checkEnvStatus, loginUser } from "../services/storageService";

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const envStatus = checkEnvStatus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await loginUser(email, password);
    } catch (err: any) {
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Invalid email address or password.");
      } else {
        setError("Unable to sign in. Please verify your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0F141C] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded shadow-sm overflow-hidden">
        {/* Top Corporate Accent Bar */}
        <div className="h-1 bg-[#0052CC]" />

        <div className="p-7">
          <div className="mb-6">
            <div className="text-[18px] font-bold text-[#172B4D] dark:text-[#E6EDF5] tracking-tight">
              EATX IT Management
            </div>
            <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8] mt-1">
              Sign in with your EATX IT or management account.
            </p>
          </div>

          {!envStatus.ok && (
            <div className="mb-4 p-3 rounded bg-[#FFEBE6] border border-[#FFBDAD] text-xs text-[#BF2600]">
              {envStatus.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="name@eatx.com"
                className="w-full px-3 py-2 text-[14px] border border-[#C1C7D0] dark:border-[#2E3A4D] bg-white dark:bg-[#0F141C] text-[#172B4D] dark:text-[#E6EDF5] rounded focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] outline-none transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 text-[14px] border border-[#C1C7D0] dark:border-[#2E3A4D] bg-white dark:bg-[#0F141C] text-[#172B4D] dark:text-[#E6EDF5] rounded focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] outline-none transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-[#FFEBE6] dark:bg-red-950/40 border border-[#FFBDAD] dark:border-red-900 text-[#BF2600] dark:text-red-400 text-xs p-2.5 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !envStatus.ok}
              className="w-full h-10 bg-[#0052CC] hover:bg-[#0043A8] text-white rounded text-[14px] font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#EBECF0] dark:border-[#242E40] flex items-center justify-between text-xs">
            <Link
              to="/track"
              className="text-[#0052CC] dark:text-[#4C9AFF] hover:underline flex items-center gap-1.5 font-medium"
            >
              <Search size={13} /> Track ticket or request
            </Link>
            <span className="text-[#6B778C]">
              {envStatus.ok ? "System online" : "Offline"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
