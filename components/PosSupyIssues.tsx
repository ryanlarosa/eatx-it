import React, { useState, useEffect, useMemo } from "react";
import { IncidentReport, WorkItemStatus } from "../types";
import {
  listenToIncidents,
  updateIncidentReport,
  getAppConfig,
  getCurrentUserProfile,
  canManageOperations,
} from "../services/storageService";
import {
  Search,
  Link2,
  Check,
  X,
  Save,
  UserCheck,
  Loader2,
} from "lucide-react";

const IT_OWNERS = ["Ryan", "Diego"];
const WORK_STATUSES: WorkItemStatus[] = [
  "New",
  "Open",
  "In Progress",
  "Waiting on Vendor",
  "Resolved",
  "Rejected",
];

const resolveTechName = (displayName?: string, email?: string) => {
  const combined = `${displayName || ""} ${email || ""}`.toLowerCase();
  if (combined.includes("diego")) return "Diego";
  if (combined.includes("ryan") || combined.includes("it@eatx.com")) return "Ryan";
  return displayName || email?.split("@")[0] || "Ryan";
};

const PosSupyIssues: React.FC = () => {
  const [allItems, setAllItems] = useState<IncidentReport[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [systemFilter, setSystemFilter] = useState<"All" | "Linga" | "Supy">("All");
  const [statusScope, setStatusScope] = useState<"open" | "resolved" | "all">("open");
  const [venueFilter, setVenueFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const [selected, setSelected] = useState<IncidentReport | null>(null);
  const [saving, setSaving] = useState(false);

  // Reject Reason Prompt Modal
  const [rejectPrompt, setRejectPrompt] = useState<{
    open: boolean;
    itemId: string;
    reason: string;
  }>({ open: false, itemId: "", reason: "" });

  const user = getCurrentUserProfile();
  const canEdit = canManageOperations(user);

  useEffect(() => {
    const unsub = listenToIncidents((data) => {
      setAllItems(data.filter((i) => i.itemType === "POS_Supy"));
      setLoading(false);
    });
    getAppConfig()
      .then((c) => setLocations(c.locations || []))
      .catch(() => {});
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return allItems.filter((item) => {
      const closed = item.status === "Resolved" || item.status === "Rejected";
      if (statusScope === "open" && closed) return false;
      if (statusScope === "resolved" && !closed) return false;
      if (systemFilter !== "All" && item.posSystem !== systemFilter) return false;
      if (venueFilter !== "All" && item.location !== venueFilter) return false;
      const q = search.trim().toLowerCase();
      if (q) {
        const hay = `${item.ticketNumber} ${item.posSystem || ""} ${item.location} ${item.reportedBy} ${item.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allItems, statusScope, systemFilter, venueFilter, search]);

  const metrics = useMemo(() => {
    const open = allItems.filter((i) => i.status !== "Resolved" && i.status !== "Rejected");
    return {
      open: open.length,
      linga: open.filter((i) => i.posSystem === "Linga").length,
      supy: open.filter((i) => i.posSystem === "Supy").length,
      resolved: allItems.filter((i) => i.status === "Resolved").length,
    };
  }, [allItems]);

  const handleAccept = async (item: IncidentReport) => {
    if (!canEdit) return;
    const owner = resolveTechName(user?.displayName, user?.email);
    await updateIncidentReport(item.id, {
      acceptedBy: item.acceptedBy || owner,
      assignedTo: owner,
      status: item.status === "New" ? "Open" : item.status,
    });
  };

  const handleInlineStatus = async (item: IncidentReport, status: WorkItemStatus) => {
    if (!canEdit) return;
    if (status === "Rejected") {
      setRejectPrompt({ open: true, itemId: item.id, reason: item.rejectionReason || "" });
      return;
    }
    await updateIncidentReport(item.id, {
      status,
      resolvedAt: status === "Resolved" ? new Date().toISOString() : item.resolvedAt,
    });
  };

  const confirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectPrompt.reason.trim()) return;
    const reason = rejectPrompt.reason.trim();
    await updateIncidentReport(rejectPrompt.itemId, {
      status: "Rejected",
      rejectionReason: reason,
      resolutionNotes: `Rejected: ${reason}`,
      resolvedAt: new Date().toISOString(),
    });
    if (selected?.id === rejectPrompt.itemId) setSelected(null);
    setRejectPrompt({ open: false, itemId: "", reason: "" });
  };

  const handleSaveDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !selected) return;
    if (selected.status === "Rejected" && !selected.rejectionReason?.trim()) {
      setRejectPrompt({ open: true, itemId: selected.id, reason: "" });
      return;
    }
    setSaving(true);
    try {
      await updateIncidentReport(selected.id, {
        assignedTo: selected.assignedTo || "",
        status: selected.status,
        priority: selected.priority,
        resolutionNotes: selected.resolutionNotes || "",
        rejectionReason: selected.rejectionReason || "",
        resolvedAt:
          selected.status === "Resolved" || selected.status === "Rejected"
            ? selected.resolvedAt || new Date().toISOString()
            : undefined,
      });
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/#/pos-supy-issue`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const inputClass =
    "w-full px-3 py-2 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C] text-[#172B4D] dark:text-[#E6EDF5] focus:border-[#0052CC] outline-none";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-[#172B4D] dark:text-[#E6EDF5]">
            POS / Supy Issues
          </h1>
          <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8]">
            Dedicated support queue for Linga POS and Supy requests across EATX venues.
          </p>
        </div>

        <button
          onClick={copyLink}
          className="px-3.5 py-2 rounded bg-[#0052CC] hover:bg-[#0043A8] text-white text-[13px] font-medium flex items-center gap-1.5 w-fit"
        >
          {copiedLink ? (
            <>
              <Check size={14} /> Copied POS / Supy Link
            </>
          ) : (
            <>
              <Link2 size={14} /> Copy POS / Supy Link
            </>
          )}
        </button>
      </div>

      {/* Summary Strip */}
      <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#EBECF0] dark:divide-[#242E40]">
        <div className="p-3.5">
          <div className="text-[12px] text-[#5E6C84]">Open requests</div>
          <div className="text-[20px] font-semibold tabular-nums mt-0.5">{metrics.open}</div>
        </div>
        <div className="p-3.5">
          <div className="text-[12px] text-[#5E6C84]">Linga open</div>
          <div className="text-[20px] font-semibold tabular-nums mt-0.5 text-[#0052CC] dark:text-[#4C9AFF]">
            {metrics.linga}
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-[12px] text-[#5E6C84]">Supy open</div>
          <div className="text-[20px] font-semibold tabular-nums mt-0.5 text-[#00875A] dark:text-[#36B37E]">
            {metrics.supy}
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-[12px] text-[#5E6C84]">Resolved</div>
          <div className="text-[20px] font-semibold tabular-nums mt-0.5">{metrics.resolved}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded p-3 flex flex-wrap gap-2.5 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B778C]" />
          <input
            type="text"
            placeholder="Search reference, venue, reporter, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
          />
        </div>
        <select
          value={systemFilter}
          onChange={(e) => setSystemFilter(e.target.value as any)}
          className="px-2.5 py-1.5 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
        >
          <option value="All">All systems</option>
          <option value="Linga">Linga</option>
          <option value="Supy">Supy</option>
        </select>
        <select
          value={statusScope}
          onChange={(e) => setStatusScope(e.target.value as any)}
          className="px-2.5 py-1.5 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
        >
          <option value="open">Open</option>
          <option value="resolved">Resolved / Rejected</option>
          <option value="all">All</option>
        </select>
        <select
          value={venueFilter}
          onChange={(e) => setVenueFilter(e.target.value)}
          className="px-2.5 py-1.5 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
        >
          <option value="All">All venues</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="animate-spin text-[#0052CC]" size={26} />
        </div>
      ) : (
        <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#EBECF0] dark:border-[#242E40] text-[11px] font-semibold uppercase tracking-wide text-[#6B778C] bg-[#F9FAFB] dark:bg-[#1B2230]">
                <th className="px-4 py-2.5">Ref</th>
                <th className="px-4 py-2.5">System</th>
                <th className="px-4 py-2.5">Venue</th>
                <th className="px-4 py-2.5">Request Description</th>
                <th className="px-4 py-2.5">Owner</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBECF0] dark:divide-[#242E40]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#6B778C]">
                    No POS / Supy requests found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelected({ ...item })}
                    className="hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] cursor-pointer"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-[#0052CC] dark:text-[#4C9AFF] whitespace-nowrap">
                      {item.ticketNumber}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          item.posSystem === "Supy"
                            ? "bg-emerald-50 text-[#00875A] dark:bg-emerald-900/30 dark:text-[#36B37E]"
                            : "bg-[#DEEBFF] text-[#0052CC] dark:bg-blue-900/30 dark:text-[#4C9AFF]"
                        }`}
                      >
                        {item.posSystem || "Linga"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{item.location}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-[#172B4D] dark:text-[#E6EDF5] line-clamp-1">
                        {item.description}
                      </div>
                      <div className="text-xs text-[#6B778C]">
                        By {item.reportedBy} • {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td
                      className="px-4 py-2.5 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.assignedTo ? (
                        <span>{item.assignedTo}</span>
                      ) : canEdit ? (
                        <button
                          onClick={() => handleAccept(item)}
                          className="px-2.5 py-1 rounded bg-[#0052CC] hover:bg-[#0043A8] text-white text-xs font-medium inline-flex items-center gap-1"
                        >
                          <UserCheck size={12} /> Accept
                        </button>
                      ) : (
                        <span className="text-[#8A99B0]">Unassigned</span>
                      )}
                    </td>
                    <td
                      className="px-4 py-2.5 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        disabled={!canEdit}
                        value={item.status}
                        onChange={(e) =>
                          handleInlineStatus(item, e.target.value as WorkItemStatus)
                        }
                        className="text-xs font-medium px-2 py-1 rounded border border-[#C1C7D0] dark:border-[#2E3A4D] bg-white dark:bg-[#0F141C]"
                      >
                        {WORK_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#2A3444] rounded max-w-xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#EBECF0] dark:border-[#242E40] bg-[#F9FAFB] dark:bg-[#1B2230] flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
                  {selected.ticketNumber} • {selected.posSystem}
                </h3>
                <p className="text-xs text-[#6B778C]">
                  {selected.location} — Reported by {selected.reportedBy}
                </p>
              </div>
              <button onClick={() => setSelected(null)}>
                <X size={18} className="text-[#6B778C]" />
              </button>
            </div>
            <form onSubmit={handleSaveDetail} className="p-5 overflow-y-auto space-y-4">
              {selected.acceptedBy && (
                <div className="text-xs text-[#5E6C84]">
                  Accepted by: <strong>{selected.acceptedBy}</strong>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Task Owner (Editable)
                  </label>
                  <select
                    disabled={!canEdit}
                    value={selected.assignedTo || ""}
                    onChange={(e) =>
                      setSelected({ ...selected, assignedTo: e.target.value })
                    }
                    className={inputClass}
                  >
                    <option value="">Unassigned</option>
                    {IT_OWNERS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Status</label>
                  <select
                    disabled={!canEdit}
                    value={selected.status}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        status: e.target.value as WorkItemStatus,
                      })
                    }
                    className={inputClass}
                  >
                    {WORK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Request Description
                </label>
                <div className="p-3 rounded bg-[#F9FAFB] dark:bg-[#0F141C] border border-[#EBECF0] dark:border-[#242E40] text-[13px] whitespace-pre-wrap">
                  {selected.description}
                </div>
              </div>

              {selected.imageBase64 && (
                <img
                  src={selected.imageBase64}
                  alt="Attachment"
                  className="max-h-52 rounded border border-[#DFE3E8] dark:border-[#242E40]"
                />
              )}

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Resolution Notes
                </label>
                <textarea
                  disabled={!canEdit}
                  rows={3}
                  value={selected.resolutionNotes || ""}
                  onChange={(e) =>
                    setSelected({ ...selected, resolutionNotes: e.target.value })
                  }
                  className={inputClass}
                />
              </div>

              {selected.status === "Rejected" && (
                <div>
                  <label className="block text-xs font-semibold text-[#DE350B] mb-1">
                    Rejection Reason *
                  </label>
                  <textarea
                    required
                    disabled={!canEdit}
                    rows={2}
                    value={selected.rejectionReason || ""}
                    onChange={(e) =>
                      setSelected({ ...selected, rejectionReason: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
              )}

              {canEdit && (
                <div className="flex justify-end gap-2 pt-3 border-t border-[#EBECF0] dark:border-[#242E40]">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="px-4 py-2 text-[13px] text-[#5E6C84] rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-[#0052CC] hover:bg-[#0043A8] text-white text-[13px] font-medium rounded flex items-center gap-1.5"
                  >
                    <Save size={14} /> {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectPrompt.open && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={confirmReject}
            className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#2A3444] rounded max-w-md w-full p-5 space-y-4 shadow-xl"
          >
            <h3 className="text-[15px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
              Rejection Reason Required
            </h3>
            <p className="text-xs text-[#5E6C84]">
              Please enter a reason before rejecting this request.
            </p>
            <textarea
              required
              autoFocus
              rows={3}
              value={rejectPrompt.reason}
              onChange={(e) =>
                setRejectPrompt({ ...rejectPrompt, reason: e.target.value })
              }
              placeholder="Explain why this request is being rejected..."
              className={inputClass}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectPrompt({ open: false, itemId: "", reason: "" })}
                className="px-3.5 py-2 text-[13px] border border-[#DFE3E8] dark:border-[#2A3444] rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
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

export default PosSupyIssues;
