import React, { useState } from "react";
import {
  getPublicItemStatus,
  PublicStatusResult,
  getSandboxStatus,
} from "../services/storageService";
import { Search, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import StaffPortalGate from "./StaffPortalGate";

const StatusTrackerContent: React.FC = () => {
  const [refId, setRefId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicStatusResult | null>(null);
  const [error, setError] = useState("");
  const isSandbox = getSandboxStatus();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refId.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await getPublicItemStatus(refId.trim().toUpperCase());
      if (data) setResult(data);
      else
        setError(
          "Reference number not found. Check your Ticket (TKT-... / POS-... / SUPY-...) or Request (REQ-...) ID."
        );
    } catch {
      setError("Unable to search right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const PROCUREMENT_STAGES = [
    "Documents Prepared",
    "Documents Submitted",
    "Documents Signed",
    "Ordered",
    "Delivered",
    "Installation",
    "Closed",
  ];

  const getSteps = (type: string, status: string, procurementStage?: string) => {
    if (type === "Request") {
      if (procurementStage && PROCUREMENT_STAGES.includes(procurementStage)) {
        const idx = PROCUREMENT_STAGES.indexOf(procurementStage);
        return PROCUREMENT_STAGES.map((stage, i) => ({
          l: stage,
          done: i <= idx,
        }));
      }
      return [
        { l: "Submitted", done: true },
        {
          l: "Acknowledged",
          done: ["Acknowledged", "Pending Finance", "Approved", "Deployed"].includes(
            status
          ),
        },
        {
          l: "Approved",
          done: ["Approved", "Deployed"].includes(status),
        },
        { l: "Deployed", done: status === "Deployed" },
      ];
    }
    return [
      { l: "Reported", done: true },
      {
        l: "In Progress",
        done: ["Open", "In Progress", "Waiting for Parts", "Resolved"].includes(
          status
        ),
      },
      { l: "Resolved", done: status === "Resolved" },
    ];
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {isSandbox && (
        <div className="px-3 py-2 rounded bg-[#FFFAE6] border border-[#FFE380] text-[#974F0C] text-xs font-medium">
          Sandbox Mode — test records only.
        </div>
      )}

      <div>
        <h1 className="text-[20px] font-semibold text-[#172B4D] dark:text-[#E6EDF5] tracking-tight">
          Track Ticket or Request
        </h1>
        <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8]">
          Enter your reference number (e.g. TKT-2026-1234, POS-2026-1234, SUPY-2026-1234, or REQ-2026-1234) to check live status.
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded p-4 flex gap-2"
      >
        <input
          className="flex-1 px-3 py-2 text-[14px] font-mono border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C] text-[#172B4D] dark:text-[#E6EDF5] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] outline-none"
          placeholder="TKT-2026-1234, POS-2026-1234, or REQ-2026-1234"
          value={refId}
          onChange={(e) => setRefId(e.target.value)}
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !refId.trim()}
          className="px-4 py-2 bg-[#0052CC] hover:bg-[#0043A8] text-white text-[13px] font-medium rounded flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <>
              <Search size={15} /> Lookup
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="p-3.5 rounded bg-[#FFEBE6] dark:bg-red-950/40 border border-[#FFBDAD] dark:border-red-900 text-[#BF2600] dark:text-red-400 text-[13px] flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#EBECF0] dark:border-[#242E40] bg-[#F9FAFB] dark:bg-[#1B2230] flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-[#6B778C]">{result.type} Reference</div>
              <div className="font-mono text-[16px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
                {result.id}
              </div>
            </div>
            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[#DEEBFF] text-[#0052CC] dark:bg-[#0052CC]/20 dark:text-[#4C9AFF]">
              {result.status}
            </span>
          </div>

          {result.status !== "Rejected" && result.status !== "Cancelled" && (
            <div className="px-5 py-4 border-b border-[#EBECF0] dark:border-[#242E40] grid grid-cols-2 sm:grid-cols-4 gap-3">
              {getSteps(result.type, result.status, result.procurementStage).map((step) => (
                <div key={step.l} className="flex items-center gap-2 text-xs">
                  <CheckCircle2
                    size={15}
                    className={
                      step.done
                        ? "text-[#00875A] shrink-0"
                        : "text-[#C1C7D0] dark:text-[#2E3A4D] shrink-0"
                    }
                  />
                  <span
                    className={
                      step.done
                        ? "font-semibold text-[#172B4D] dark:text-[#E6EDF5]"
                        : "text-[#6B778C]"
                    }
                  >
                    {step.l}
                  </span>
                </div>
              ))}
            </div>
          )}

          {result.status === "Rejected" && result.rejectionReason && (
            <div className="mx-5 mt-4 p-3.5 rounded bg-[#FFEBE6] dark:bg-red-950/30 border border-[#FFBDAD] dark:border-red-900 text-[#BF2600] dark:text-red-400 text-[13px]">
              <div className="text-xs font-semibold mb-0.5">Rejection Reason</div>
              <div>{result.rejectionReason}</div>
            </div>
          )}

          <div className="p-5 space-y-4 text-[13px]">
            <div>
              <div className="text-xs font-semibold text-[#6B778C] mb-0.5">
                Subject / Item
              </div>
              <div className="font-medium text-[#172B4D] dark:text-[#E6EDF5]">
                {result.subject}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-[#6B778C] mb-0.5">
                Details
              </div>
              <div className="text-[#42526E] dark:text-[#CBD5E1] whitespace-pre-wrap">
                {result.details}
              </div>
            </div>

            {result.notes && (
              <div className="p-3.5 rounded bg-[#F4F5F7] dark:bg-[#1B2230] border border-[#DFE3E8] dark:border-[#2A3444]">
                <div className="text-xs font-semibold text-[#0052CC] dark:text-[#4C9AFF] mb-1">
                  IT Resolution Notes
                </div>
                <div className="text-[#172B4D] dark:text-[#E6EDF5]">
                  {result.notes}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-[#EBECF0] dark:border-[#242E40] flex flex-wrap gap-6 text-xs text-[#6B778C]">
              <span>
                Created:{" "}
                <strong className="font-mono">
                  {new Date(result.created).toLocaleDateString()}
                </strong>
              </span>
              {result.updated && (
                <span>
                  Updated:{" "}
                  <strong className="font-mono">
                    {new Date(result.updated).toLocaleDateString()}
                  </strong>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PublicStatusTracker: React.FC = () => (
  <StaffPortalGate
    title="Track IT Ticket or Request"
    subtitle="Check live progress on your submitted IT ticket or equipment request."
  >
    {() => <StatusTrackerContent />}
  </StaffPortalGate>
);

export default PublicStatusTracker;
