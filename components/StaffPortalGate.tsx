import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Loader2, LogOut, ShieldCheck, AlertCircle, ArrowLeft } from "lucide-react";
import { UserProfile } from "../types";
import {
  subscribeToAuth,
  getCurrentUserProfile,
  signInWithCompanyGoogle,
  logoutUser,
  isAllowedCompanyEmail,
  hasInternalConsoleAccess,
} from "../services/storageService";

interface StaffPortalGateProps {
  title: string;
  subtitle: string;
  children: (user: UserProfile) => React.ReactNode;
}

const StaffPortalGate: React.FC<StaffPortalGateProps> = ({
  title,
  subtitle,
  children,
}) => {
  const [user, setUser] = useState<UserProfile | null>(getCurrentUserProfile());
  const [initializing, setInitializing] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();

  useEffect(() => {
    const unsub = subscribeToAuth((u) => {
      setUser(u);
      setInitializing(false);
    });
    return () => unsub();
  }, []);

  const isAuthorized =
    !!user && (hasInternalConsoleAccess(user) || isAllowedCompanyEmail(user.email) || user.role === "requester");

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setError("");
    try {
      await signInWithCompanyGoogle();
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user") {
        setError("Sign-in cancelled. Please try again.");
      } else {
        setError(
          err?.message ||
            "Sign-in failed. Please use your official EATX / Bull&Roo Google Workspace email."
        );
      }
    } finally {
      setSigningIn(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0F141C] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#0052CC]" size={28} />
      </div>
    );
  }

  if (!isAuthorized || !user) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0F141C] flex items-center justify-center p-4">
        <div className="w-full max-w-[420px] bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded shadow-sm overflow-hidden">
          <div className="h-1 bg-[#0052CC]" />
          <div className="p-7">
            <div className="mb-6">
              <div className="text-[12px] font-semibold text-[#0052CC] dark:text-[#4C9AFF] mb-1">
                EATX IT Service Portal
              </div>
              <h1 className="text-[20px] font-bold text-[#172B4D] dark:text-[#E6EDF5] tracking-tight">
                {title}
              </h1>
              <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8] mt-1">
                {subtitle}
              </p>
            </div>

            <div className="p-3.5 rounded bg-[#F4F5F7] dark:bg-[#1B2230] border border-[#DFE3E8] dark:border-[#2A3444] text-[12px] text-[#42526E] dark:text-[#CBD5E1] flex items-start gap-2.5 mb-5">
              <ShieldCheck
                size={16}
                className="text-[#0052CC] dark:text-[#4C9AFF] shrink-0 mt-0.5"
              />
              <div>
                <strong>Company authentication required.</strong> Sign in with your
                official EATX / Bull&amp;Roo Google Workspace email to submit or
                track IT tickets.
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded bg-[#FFEBE6] dark:bg-red-950/40 border border-[#FFBDAD] dark:border-red-900 text-[#BF2600] dark:text-red-400 text-xs flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="w-full h-10 bg-white dark:bg-[#0F141C] hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] text-[#172B4D] dark:text-[#E6EDF5] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded text-[14px] font-medium flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
            >
              {signingIn ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Sign in with Google Workspace</span>
                </>
              )}
            </button>

            <div className="mt-6 pt-4 border-t border-[#EBECF0] dark:border-[#242E40] text-center">
              <Link
                to="/"
                className="text-xs text-[#5E6C84] dark:text-[#94A3B8] hover:text-[#0052CC] dark:hover:text-[#4C9AFF]"
              >
                IT Admin / Management Sign-In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const navTabs = [
    { to: "/report-issue", label: "Report an Issue" },
    { to: "/request-asset", label: "Request Equipment" },
    { to: "/track", label: "Track Status" },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0F141C] flex flex-col">
      {/* Authenticated Portal Top Navigation */}
      <header className="bg-white dark:bg-[#161C26] border-b border-[#DFE3E8] dark:border-[#242E40] sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-1.5 h-4 rounded-[2px] bg-[#0052CC]" />
              <span className="font-bold text-[14px] text-[#172B4D] dark:text-[#E6EDF5]">
                EATX IT Portal
              </span>
            </div>

            <nav className="hidden sm:flex items-center gap-1">
              {navTabs.map((t) => {
                const active = location.pathname === t.to;
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    className={`px-3 py-1.5 rounded text-[13px] font-medium transition-colors ${
                      active
                        ? "bg-[#DEEBFF] text-[#0052CC] dark:bg-[#0052CC]/20 dark:text-[#4C9AFF]"
                        : "text-[#5E6C84] dark:text-[#94A3B8] hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534]"
                    }`}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            {hasInternalConsoleAccess(user) && (
              <Link
                to="/"
                className="hidden md:inline-flex items-center gap-1 text-[#0052CC] dark:text-[#4C9AFF] hover:underline font-medium"
              >
                <ArrowLeft size={13} /> Console
              </Link>
            )}
            <span className="text-[#5E6C84] dark:text-[#94A3B8] truncate max-w-[150px] sm:max-w-[200px]">
              {user.email}
            </span>
            <button
              onClick={logoutUser}
              className="p-1.5 rounded text-[#5E6C84] hover:text-[#DE350B] hover:bg-[#FFEBE6] dark:hover:bg-red-950/30 transition-colors"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Mobile Nav Strip */}
        <div className="sm:hidden flex border-t border-[#EBECF0] dark:border-[#242E40] px-2 py-1 gap-1 overflow-x-auto">
          {navTabs.map((t) => {
            const active = location.pathname === t.to;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex-1 text-center px-2 py-1.5 rounded text-xs font-medium whitespace-nowrap ${
                  active
                    ? "bg-[#DEEBFF] text-[#0052CC] dark:bg-[#0052CC]/20 dark:text-[#4C9AFF]"
                    : "text-[#5E6C84] dark:text-[#94A3B8]"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </header>

      <div className="flex-1">{children(user)}</div>
    </div>
  );
};

export default StaffPortalGate;
