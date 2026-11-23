import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Loader2, Search, ArrowRight } from "lucide-react";
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
        setError("Invalid email or password.");
      } else {
        setError("Authentication failed. Verify your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-[#0B0D11] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        {/* Header Wordmark */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#111318] dark:bg-blue-600 text-white flex items-center justify-center font-mono font-bold text-xs tracking-tighter">
              EX
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-[#111318] dark:text-[#F1F3F7]">
                  eatx.
                </span>
                <span className="font-mono text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-white dark:bg-[#12151C] text-[#5A6270] dark:text-[#8B94A5] border border-[#E4E6EB] dark:border-[#222733]">
                  IT OPS
                </span>
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-[#12151C] border border-[#E4E6EB] dark:border-[#222733] font-mono text-[10px] text-[#5A6270] dark:text-[#8B94A5]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                envStatus.ok ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            {envStatus.ok ? "ONLINE" : "CONFIG"}
          </div>
        </div>

        {/* Auth Panel */}
        <div className="bg-white dark:bg-[#12151C] border border-[#E4E6EB] dark:border-[#222733] rounded-lg p-6 shadow-sm">
          <div className="mb-5">
            <h1 className="text-base font-semibold text-[#111318] dark:text-[#F1F3F7]">
              Sign in to IT Management Platform
            </h1>
            <p className="text-xs text-[#5A6270] dark:text-[#8B94A5] mt-1">
              Authorized EATX IT & leadership accounts only.
            </p>
          </div>

          {!envStatus.ok && (
            <div className="mb-4 p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-600 dark:text-red-400">
              {envStatus.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5A6270] dark:text-[#8B94A5] mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="name@eatx.com"
                className="w-full px-3 py-2 text-sm border border-[#E4E6EB] dark:border-[#222733] bg-[#F8F9FB] dark:bg-[#0B0D11] text-[#111318] dark:text-[#F1F3F7] rounded-md focus:border-[#111318] dark:focus:border-blue-500 outline-none transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5A6270] dark:text-[#8B94A5] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 text-sm border border-[#E4E6EB] dark:border-[#222733] bg-[#F8F9FB] dark:bg-[#0B0D11] text-[#111318] dark:text-[#F1F3F7] rounded-md focus:border-[#111318] dark:focus:border-blue-500 outline-none transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs p-2.5 rounded-md flex items-center gap-2">
                <Lock size={13} /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !envStatus.ok}
              className="w-full h-9 bg-[#111318] dark:bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-black dark:hover:bg-blue-500 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <>
                  Continue <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#E4E6EB] dark:border-[#222733] flex items-center justify-between text-xs">
            <Link
              to="/track"
              className="text-[#5A6270] dark:text-[#8B94A5] hover:text-[#111318] dark:hover:text-white flex items-center gap-1.5 font-medium"
            >
              <Search size={13} /> Track Ticket / Request
            </Link>
            <span className="font-mono text-[10px] text-[#8C95A6]">EATX IT</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
