import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import {
  getAppConfig,
  createAssetRequest,
  getSandboxStatus,
} from "../services/storageService";
import { Loader2, CheckCircle2, Send } from "lucide-react";
import StaffPortalGate from "./StaffPortalGate";

const AssetRequestContent: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [departments, setDepartments] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Scope: Head Office vs Venue (1 equipment request per ticket)
  const [scope, setScope] = useState<"Head Office" | "Venue">("Head Office");
  const [submitterName, setSubmitterName] = useState(
    user.displayName || user.email.split("@")[0] || ""
  );
  const [submitterEmail] = useState(user.email || "");
  const [venue, setVenue] = useState("");
  const [department, setDepartment] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [itemName, setItemName] = useState("");
  const [urgency, setUrgency] = useState<"Low" | "Medium" | "High">("Medium");
  const [reason, setReason] = useState("");

  const isSandbox = getSandboxStatus();

  useEffect(() => {
    getAppConfig()
      .then((config) => {
        setDepartments(config.departments || []);
        setLocations(config.locations || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !itemName.trim()) return;
    setSubmitting(true);
    try {
      const targetInfo =
        scope === "Venue"
          ? `Scope: Venue (${venue})`
          : `Scope: Head Office (${department}${
              beneficiaryName ? ` — For: ${beneficiaryName}` : ""
            })`;

      await createAssetRequest({
        requesterName: submitterName,
        requesterEmail: submitterEmail,
        scope,
        venue: scope === "Venue" ? venue : "Head Office",
        department: scope === "Head Office" ? department : "Operations",
        category: itemName.trim(),
        urgency,
        reason: `${targetInfo}\n\nJustification: ${reason.trim()}`,
      });
      setSubmitted(true);
    } catch {
      alert("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setItemName("");
    setBeneficiaryName("");
    setReason("");
    setUrgency("Medium");
  };

  const inputClass =
    "w-full px-3 py-2 text-[14px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C] text-[#172B4D] dark:text-[#E6EDF5] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] outline-none transition-colors";
  const labelClass =
    "block text-[12px] font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1";

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="animate-spin text-[#0052CC]" size={26} />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] border-l-4 border-l-[#00875A] rounded p-6 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={22} className="text-[#00875A] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-[16px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
                Equipment request submitted
              </h2>
              <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8] mt-1">
                Your request for <strong>{itemName}</strong> ({scope}
                {scope === "Venue" ? ` — ${venue}` : ""}) has been logged with
                EATX IT Procurement. Updates will be sent to{" "}
                <strong>{submitterEmail}</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-[#0052CC] hover:bg-[#0043A8] text-white text-[13px] font-medium rounded transition-colors"
          >
            Submit another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {isSandbox && (
        <div className="px-3 py-2 rounded bg-[#FFFAE6] border border-[#FFE380] text-[#974F0C] text-xs font-medium">
          Sandbox Mode — test submissions only.
        </div>
      )}

      <div>
        <h1 className="text-[20px] font-semibold text-[#172B4D] dark:text-[#E6EDF5] tracking-tight">
          Request IT Equipment
        </h1>
        <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8]">
          Submit one equipment request per ticket for Head Office or Venue operations.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-hidden"
      >
        <div className="px-5 py-3 border-b border-[#EBECF0] dark:border-[#242E40] bg-[#F9FAFB] dark:bg-[#1B2230]">
          <h2 className="text-[13px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
            Procurement request details (1 item per ticket)
          </h2>
        </div>

        <div className="p-5 space-y-5">
          {/* Request Scope: Head Office vs Venue */}
          <div>
            <label className={labelClass}>Location type *</label>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              {(["Head Office", "Venue"] as const).map((opt) => {
                const active = scope === opt;
                return (
                  <label
                    key={opt}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded border cursor-pointer text-[13px] font-medium transition-colors ${
                      active
                        ? "border-[#0052CC] bg-[#DEEBFF]/40 dark:bg-[#0052CC]/20 text-[#0052CC] dark:text-[#4C9AFF]"
                        : "border-[#C1C7D0] dark:border-[#2E3A4D] bg-white dark:bg-[#0F141C] text-[#172B4D] dark:text-[#E6EDF5]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value={opt}
                      checked={active}
                      onChange={() => setScope(opt)}
                      className="accent-[#0052CC]"
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Submitter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Requested by *</label>
              <input
                required
                type="text"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Verified company email</label>
              <input
                type="email"
                readOnly
                value={submitterEmail}
                className={`${inputClass} bg-[#F4F5F7] dark:bg-[#1B2230] text-[#5E6C84] dark:text-[#94A3B8] cursor-not-allowed`}
              />
            </div>
          </div>

          {/* Conditional Head Office vs Venue Details */}
          {scope === "Venue" ? (
            <div>
              <label className={labelClass}>Venue / Outlet *</label>
              <select
                required
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className={inputClass}
              >
                <option value="">Select venue...</option>
                {locations
                  .filter((l) => l.toLowerCase() !== "head office")
                  .map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Department *</label>
                <select
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select department...</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Employee / Recipient (optional)</label>
                <input
                  type="text"
                  placeholder="Name of employee if individual assignment"
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Single Equipment Item */}
          <div>
            <label className={labelClass}>Requested equipment item *</label>
            <input
              required
              type="text"
              placeholder="e.g. MacBook Air M3, Thermal Receipt Printer, iPad 10th Gen"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Urgency */}
          <div>
            <label className={labelClass}>Urgency</label>
            <div className="grid grid-cols-3 gap-2 max-w-md">
              {(["Low", "Medium", "High"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUrgency(u)}
                  className={`py-2 px-3 rounded text-[13px] font-medium border transition-colors ${
                    urgency === u
                      ? "bg-[#0052CC] text-white border-[#0052CC]"
                      : "bg-white dark:bg-[#0F141C] text-[#42526E] dark:text-[#CBD5E1] border-[#C1C7D0] dark:border-[#2E3A4D]"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Justification */}
          <div>
            <label className={labelClass}>Business justification *</label>
            <textarea
              required
              rows={3}
              placeholder="Explain the operational requirement, new hire start date, or venue need..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-[#EBECF0] dark:border-[#242E40] bg-[#F9FAFB] dark:bg-[#1B2230] flex items-center justify-between gap-3">
          <span className="text-xs text-[#6B778C]">
            1 equipment item per ticket • Follows EATX standard procurement workflow
          </span>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-[#0052CC] hover:bg-[#0043A8] text-white text-[13px] font-medium rounded flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <>
                Submit request <Send size={14} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const PublicAssetRequest: React.FC = () => (
  <StaffPortalGate
    title="Request IT Equipment"
    subtitle="Submit hardware or peripheral procurement requests to EATX IT."
  >
    {(user) => <AssetRequestContent user={user} />}
  </StaffPortalGate>
);

export default PublicAssetRequest;
