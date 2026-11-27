import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { AssetRequest, ProcurementStage } from "../types";
import {
  listenToRequests,
  updateAssetRequest,
  getSandboxStatus,
  getCurrentUserProfile,
  canManageOperations,
} from "../services/storageService";
import {
  Link as LinkIcon,
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  Save,
  XCircle,
  ArrowUpRight,
} from "lucide-react";

const PROCUREMENT_STAGES: {
  stage: ProcurementStage;
  label: string;
  hint?: string;
}[] = [
  { stage: "Documents Prepared", label: "1. Documents Prepared" },
  { stage: "Documents Submitted", label: "2. Documents Submitted" },
  { stage: "Documents Signed", label: "3. Documents Signed" },
  { stage: "Ordered", label: "4. Ordered" },
  { stage: "Delivered", label: "5. Delivered" },
  { stage: "Installation", label: "6. Installation", hint: "Optional" },
  {
    stage: "Closed",
    label: "7. Closed",
    hint: "If new item, handover required",
  },
];

const isClosedRequest = (status: ProcurementStage) =>
  status === "Closed" || status === "Deployed" || status === "Rejected";

const AssetRequests: React.FC = () => {
  const [requests, setRequests] = useState<AssetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Stage update state
  const [targetStage, setTargetStage] =
    useState<ProcurementStage>("Documents Prepared");
  const [stageRemark, setStageRemark] = useState("");
  const [handoverRequired, setHandoverRequired] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reject prompt
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const user = getCurrentUserProfile();
  const canEdit = canManageOperations(user);
  const isSandbox = getSandboxStatus();
  const publicLink = `${window.location.origin}/#/request-asset${
    isSandbox ? "?env=sandbox" : ""
  }`;

  useEffect(() => {
    const unsub = listenToRequests((data) => {
      setRequests(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedId) || null,
    [requests, selectedId]
  );

  useEffect(() => {
    if (!selectedRequest) return;
    const idx = PROCUREMENT_STAGES.findIndex(
      (s) => s.stage === selectedRequest.status
    );
    const nextStage =
      idx >= 0 && idx < PROCUREMENT_STAGES.length - 1
        ? PROCUREMENT_STAGES[idx + 1].stage
        : PROCUREMENT_STAGES[0].stage;
    setTargetStage(
      isClosedRequest(selectedRequest.status)
        ? selectedRequest.status
        : nextStage
    );
    setStageRemark(selectedRequest.stageRemarks?.[nextStage] || "");
    setHandoverRequired(!!selectedRequest.handoverRequired);
  }, [selectedId]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) =>
      activeTab === "active"
        ? !isClosedRequest(r.status)
        : isClosedRequest(r.status)
    );
  }, [requests, activeTab]);

  const activeCount = useMemo(
    () => requests.filter((r) => !isClosedRequest(r.status)).length,
    [requests]
  );

  const handleStageUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !selectedRequest || saving) return;

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const performer = user?.displayName || user?.email || "IT";
      const nextRemarks = {
        ...(selectedRequest.stageRemarks || {}),
        [targetStage]: stageRemark.trim(),
      };
      const nextHistory = [
        ...(selectedRequest.stageHistory || []),
        {
          stage: targetStage,
          remarks: stageRemark.trim(),
          updatedBy: performer,
          updatedAt: now,
        },
      ];

      await updateAssetRequest(selectedRequest.id, {
        status: targetStage,
        stageRemarks: nextRemarks,
        stageHistory: nextHistory,
        handoverRequired:
          targetStage === "Closed"
            ? handoverRequired
            : selectedRequest.handoverRequired,
        resolutionNotes: stageRemark.trim() || selectedRequest.resolutionNotes,
        resolvedAt: targetStage === "Closed" ? now : selectedRequest.resolvedAt,
      });
      setStageRemark("");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !selectedRequest || !rejectReason.trim()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const performer = user?.displayName || user?.email || "IT";
      await updateAssetRequest(selectedRequest.id, {
        status: "Rejected",
        rejectionReason: rejectReason.trim(),
        resolutionNotes: `Rejected: ${rejectReason.trim()}`,
        resolvedAt: now,
        stageHistory: [
          ...(selectedRequest.stageHistory || []),
          {
            stage: "Rejected",
            remarks: rejectReason.trim(),
            updatedBy: performer,
            updatedAt: now,
          },
        ],
      });
      setRejectOpen(false);
      setRejectReason("");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getStageIndex = (status: ProcurementStage) =>
    PROCUREMENT_STAGES.findIndex((s) => s.stage === status);

  return (
    <div className="space-y-5">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-[#172B4D] dark:text-[#E6EDF5]">
            Procurement &amp; Requests
          </h1>
          <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8]">
            Standard workflow: Documents Prepared → Submitted → Signed → Ordered → Delivered → Installation → Closed
          </p>
        </div>
        <button
          onClick={copyLink}
          className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#2A3444] text-[#172B4D] dark:text-[#E6EDF5] px-3 py-2 rounded hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] flex items-center gap-2 text-[13px] font-medium w-fit"
        >
          {copied ? (
            <>
              <Check size={15} className="text-[#00875A]" /> Copied Request Link
            </>
          ) : (
            <>
              <LinkIcon size={15} /> Copy Staff Request Link
            </>
          )}
        </button>
      </header>

      <div className="bg-white dark:bg-[#161C26] rounded border border-[#DFE3E8] dark:border-[#242E40] overflow-hidden min-h-[580px] flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-[#EBECF0] dark:border-[#242E40] bg-[#F9FAFB] dark:bg-[#1B2230]">
          <button
            onClick={() => {
              setActiveTab("active");
              setSelectedId(null);
            }}
            className={`px-5 py-3 text-[13px] font-medium border-b-2 flex items-center gap-2 ${
              activeTab === "active"
                ? "border-[#0052CC] text-[#0052CC] dark:text-[#4C9AFF] dark:border-[#4C9AFF]"
                : "border-transparent text-[#5E6C84] dark:text-[#94A3B8]"
            }`}
          >
            Active Queue
            {activeCount > 0 && (
              <span className="bg-[#0052CC] text-white text-[11px] font-mono px-1.5 rounded">
                {activeCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("history");
              setSelectedId(null);
            }}
            className={`px-5 py-3 text-[13px] font-medium border-b-2 ${
              activeTab === "history"
                ? "border-[#0052CC] text-[#0052CC] dark:text-[#4C9AFF] dark:border-[#4C9AFF]"
                : "border-transparent text-[#5E6C84] dark:text-[#94A3B8]"
            }`}
          >
            Closed / History
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-[#0052CC]" size={26} />
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#EBECF0] dark:divide-[#242E40]">
            {/* Left Queue List */}
            <div className="lg:col-span-5 overflow-y-auto max-h-[640px] divide-y divide-[#EBECF0] dark:divide-[#242E40]">
              {filteredRequests.length === 0 ? (
                <div className="p-10 text-center text-[13px] text-[#6B778C]">
                  No requests in this queue.
                </div>
              ) : (
                filteredRequests.map((req) => {
                  const active = req.id === selectedId;
                  return (
                    <div
                      key={req.id}
                      onClick={() => setSelectedId(req.id)}
                      className={`p-4 cursor-pointer transition-colors ${
                        active
                          ? "bg-[#DEEBFF]/40 dark:bg-[#0052CC]/15 border-l-[3px] border-l-[#0052CC]"
                          : "hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-xs text-[#0052CC] dark:text-[#4C9AFF]">
                          {req.requestNumber}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F4F5F7] dark:bg-[#1B2230] text-[#42526E] dark:text-[#CBD5E1]">
                          {req.status}
                        </span>
                      </div>
                      <div className="font-semibold text-[14px] text-[#172B4D] dark:text-[#E6EDF5]">
                        {req.category}
                      </div>
                      <div className="text-xs text-[#5E6C84] dark:text-[#94A3B8] mt-1">
                        {req.requesterName} •{" "}
                        {req.scope === "Venue"
                          ? req.venue
                          : `Head Office (${req.department})`}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Procurement Process Panel */}
            <div className="lg:col-span-7 p-5 overflow-y-auto max-h-[640px]">
              {!selectedRequest ? (
                <div className="h-full flex items-center justify-center text-[13px] text-[#6B778C]">
                  Select a request on the left to manage its procurement stages.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#EBECF0] dark:border-[#242E40]">
                    <div>
                      <div className="font-mono text-xs text-[#0052CC] dark:text-[#4C9AFF]">
                        {selectedRequest.requestNumber}
                      </div>
                      <h2 className="text-[17px] font-semibold text-[#172B4D] dark:text-[#E6EDF5] mt-0.5">
                        {selectedRequest.category}
                      </h2>
                      <div className="text-xs text-[#5E6C84] dark:text-[#94A3B8] mt-1">
                        Requested by <strong>{selectedRequest.requesterName}</strong>{" "}
                        ({selectedRequest.requesterEmail || "No email"}) •{" "}
                        {selectedRequest.scope === "Venue"
                          ? `Venue: ${selectedRequest.venue}`
                          : `Head Office — ${selectedRequest.department}`}
                      </div>
                    </div>
                    {canEdit && !isClosedRequest(selectedRequest.status) && (
                      <button
                        onClick={() => setRejectOpen(true)}
                        className="px-3 py-1.5 rounded border border-[#FFBDAD] text-[#DE350B] hover:bg-[#FFEBE6] text-xs font-medium flex items-center gap-1 shrink-0"
                      >
                        <XCircle size={13} /> Reject
                      </button>
                    )}
                  </div>

                  {/* Request Justification */}
                  <div className="p-3.5 rounded bg-[#F9FAFB] dark:bg-[#0F141C] border border-[#EBECF0] dark:border-[#242E40] text-[13px] whitespace-pre-wrap text-[#172B4D] dark:text-[#CBD5E1]">
                    {selectedRequest.reason}
                  </div>

                  {/* 7-Stage Procurement Tracker */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6B778C]">
                      Standard Procurement Progress
                    </h3>
                    <div className="divide-y divide-[#EBECF0] dark:divide-[#242E40] border border-[#DFE3E8] dark:border-[#242E40] rounded">
                      {PROCUREMENT_STAGES.map((st, idx) => {
                        const curIdx = getStageIndex(selectedRequest.status);
                        const done =
                          selectedRequest.status === "Deployed" ||
                          (curIdx >= 0 && idx <= curIdx);
                        const remark = selectedRequest.stageRemarks?.[st.stage];
                        return (
                          <div
                            key={st.stage}
                            className="px-3.5 py-2.5 flex items-start justify-between gap-3 text-[13px]"
                          >
                            <div className="flex items-start gap-2.5">
                              {done ? (
                                <CheckCircle2
                                  size={16}
                                  className="text-[#00875A] shrink-0 mt-0.5"
                                />
                              ) : (
                                <Circle
                                  size={16}
                                  className="text-[#C1C7D0] dark:text-[#2E3A4D] shrink-0 mt-0.5"
                                />
                              )}
                              <div>
                                <div className="font-medium text-[#172B4D] dark:text-[#E6EDF5]">
                                  {st.label}{" "}
                                  {st.hint && (
                                    <span className="text-[11px] font-normal text-[#6B778C]">
                                      ({st.hint})
                                    </span>
                                  )}
                                </div>
                                {remark && (
                                  <div className="text-xs text-[#5E6C84] dark:text-[#94A3B8] mt-0.5">
                                    Remarks: {remark}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Handover Notice if Closed with New Item */}
                  {selectedRequest.status === "Closed" &&
                    selectedRequest.handoverRequired && (
                      <div className="p-3.5 rounded bg-[#DEEBFF]/50 dark:bg-[#0052CC]/20 border border-[#0052CC]/30 flex items-center justify-between gap-3 text-xs">
                        <span>
                          <strong>New item handover required:</strong> Complete
                          digital handover in Employees &amp; Handovers.
                        </span>
                        <Link
                          to="/staff"
                          className="font-semibold text-[#0052CC] dark:text-[#4C9AFF] inline-flex items-center gap-1 shrink-0"
                        >
                          Open Handovers <ArrowUpRight size={13} />
                        </Link>
                      </div>
                    )}

                  {selectedRequest.status === "Rejected" &&
                    selectedRequest.rejectionReason && (
                      <div className="p-3.5 rounded bg-[#FFEBE6] dark:bg-red-950/30 border border-[#FFBDAD] dark:border-red-900 text-xs text-[#BF2600] dark:text-red-400">
                        <strong>Rejected:</strong> {selectedRequest.rejectionReason}
                      </div>
                    )}

                  {/* Update Stage Form */}
                  {canEdit && selectedRequest.status !== "Rejected" && (
                    <form
                      onSubmit={handleStageUpdate}
                      className="p-4 rounded bg-[#F9FAFB] dark:bg-[#1B2230] border border-[#DFE3E8] dark:border-[#2A3444] space-y-3"
                    >
                      <div className="text-xs font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
                        Update Procurement Stage &amp; Remarks
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-[#5E6C84] mb-1">
                            Stage
                          </label>
                          <select
                            value={targetStage}
                            onChange={(e) => {
                              const next = e.target.value as ProcurementStage;
                              setTargetStage(next);
                              setStageRemark(
                                selectedRequest.stageRemarks?.[next] || ""
                              );
                            }}
                            className="w-full px-3 py-2 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
                          >
                            {PROCUREMENT_STAGES.map((s) => (
                              <option key={s.stage} value={s.stage}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-[#5E6C84] mb-1">
                            Stage Remarks
                          </label>
                          <input
                            type="text"
                            placeholder="PO #, vendor quote, delivery note, installer..."
                            value={stageRemark}
                            onChange={(e) => setStageRemark(e.target.value)}
                            className="w-full px-3 py-2 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
                          />
                        </div>
                      </div>

                      {targetStage === "Closed" && (
                        <label className="flex items-center gap-2 text-xs font-medium text-[#172B4D] dark:text-[#E6EDF5]">
                          <input
                            type="checkbox"
                            checked={handoverRequired}
                            onChange={(e) =>
                              setHandoverRequired(e.target.checked)
                            }
                          />
                          New item — digital handover required
                        </label>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-4 py-2 bg-[#0052CC] hover:bg-[#0043A8] text-white text-[13px] font-medium rounded flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Save size={14} />{" "}
                          {saving ? "Saving..." : "Update Stage"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
      {rejectOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmReject}
            className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#2A3444] rounded max-w-md w-full p-5 space-y-4 shadow-xl"
          >
            <h3 className="text-[15px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
              Reject Procurement Request
            </h3>
            <textarea
              required
              autoFocus
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejecting this equipment request..."
              className="w-full px-3 py-2 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectOpen(false)}
                className="px-3.5 py-2 text-[13px] border border-[#DFE3E8] dark:border-[#2A3444] rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-3.5 py-2 text-[13px] bg-[#DE350B] text-white rounded font-medium"
              >
                Confirm Reject
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AssetRequests;
