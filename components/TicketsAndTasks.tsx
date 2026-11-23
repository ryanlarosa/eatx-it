import React, { useState, useEffect, useMemo } from "react";
import {
  IncidentReport,
  Vendor,
  WorkItemStatus,
  WorkItemType,
} from "../types";
import {
  listenToIncidents,
  createIncidentReport,
  updateIncidentReport,
  deleteIncidentReport,
  processAssetReplacement,
  listenToVendors,
  saveVendor,
  getAppConfig,
  getCurrentUserProfile,
  canManageOperations,
  isAdminRole,
} from "../services/storageService";
import { useAppData } from "../context/AppDataContext";
import {
  Plus,
  Search,
  LayoutGrid,
  List as ListIcon,
  X,
  Save,
  Trash2,
  Link2,
  Check,
  Loader2,
  RefreshCw,
} from "lucide-react";

const IT_OWNERS = ["Ryan", "Diego"];
const WORK_STATUSES: WorkItemStatus[] = [
  "New",
  "Open",
  "In Progress",
  "Waiting on Vendor",
  "Waiting for Parts",
  "Resolved",
  "Rejected",
];
const PRIORITIES: IncidentReport["priority"][] = [
  "Low",
  "Medium",
  "High",
  "Critical",
];

const isClosedStatus = (s: WorkItemStatus) =>
  s === "Resolved" || s === "Rejected";

const isItemOverdue = (item: IncidentReport): boolean => {
  if (isClosedStatus(item.status) || !item.dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(item.dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
};

const priorityStyle = (p: IncidentReport["priority"]) => {
  if (p === "Critical") return "text-[#DE350B] font-semibold";
  if (p === "High") return "text-[#D97706] font-medium";
  if (p === "Medium") return "text-[#0052CC] dark:text-[#4C9AFF]";
  return "text-[#5E6C84] dark:text-[#94A3B8]";
};

const emptyDraft = (defaultReporter: string): Partial<IncidentReport> => ({
  itemType: "Task",
  title: "",
  assetName: "",
  deviceType: "",
  location: "",
  reportedBy: defaultReporter,
  assignedTo: "Ryan",
  vendor: "",
  dueDate: "",
  externalTicketRef: "",
  description: "",
  resolutionNotes: "",
  priority: "Medium",
  status: "Open",
  checklist: [],
});

const TicketsAndTasks: React.FC = () => {
  const { assets } = useAppData();
  const [items, setItems] = useState<IncidentReport[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [statusScope, setStatusScope] = useState<"open" | "resolved" | "all">(
    "open"
  );
  const [typeFilter, setTypeFilter] = useState<"All" | WorkItemType>("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [venueFilter, setVenueFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Create / Detail Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<IncidentReport>>(emptyDraft("Ryan"));
  const [saving, setSaving] = useState(false);
  const [checkText, setCheckText] = useState("");
  const [showQuickVendor, setShowQuickVendor] = useState(false);
  const [quickVendorName, setQuickVendorName] = useState("");
  const [replacementAssetId, setReplacementAssetId] = useState("");
  const [showReplacePanel, setShowReplacePanel] = useState(false);

  const user = getCurrentUserProfile();
  const canEdit = canManageOperations(user);
  const isAdmin = isAdminRole(user);

  useEffect(() => {
    const u1 = listenToIncidents((data) => {
      setItems(data);
      setLoading(false);
    });
    const u2 = listenToVendors(setVendors);
    getAppConfig()
      .then((c) => setLocations(c.locations || []))
      .catch(() => {});
    return () => {
      u1();
      u2();
    };
  }, []);

  const metrics = useMemo(() => {
    const open = items.filter((i) => !isClosedStatus(i.status));
    const tickets = open.filter((i) => (i.itemType || "Ticket") === "Ticket").length;
    const tasks = open.filter((i) => i.itemType === "Task").length;
    const overdue = open.filter(isItemOverdue).length;
    const critical = open.filter((i) => i.priority === "Critical").length;
    return { open: open.length, tickets, tasks, overdue, critical };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const closed = isClosedStatus(item.status);
      if (statusScope === "open" && closed) return false;
      if (statusScope === "resolved" && !closed) return false;

      const itemType: WorkItemType = item.itemType || "Ticket";
      if (typeFilter !== "All" && itemType !== typeFilter) return false;

      if (ownerFilter !== "All") {
        if (ownerFilter === "Unassigned" && item.assignedTo) return false;
        if (
          ownerFilter !== "Unassigned" &&
          (item.assignedTo || "").toLowerCase() !== ownerFilter.toLowerCase()
        )
          return false;
      }

      if (venueFilter !== "All" && item.location !== venueFilter) return false;
      if (priorityFilter !== "All" && item.priority !== priorityFilter)
        return false;
      if (overdueOnly && !isItemOverdue(item)) return false;

      const q = search.trim().toLowerCase();
      if (q) {
        const hay = `${item.ticketNumber} ${item.title || ""} ${item.assetName} ${
          item.description
        } ${item.location} ${item.reportedBy} ${item.vendor || ""} ${
          item.externalTicketRef || ""
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    items,
    statusScope,
    typeFilter,
    ownerFilter,
    venueFilter,
    priorityFilter,
    overdueOnly,
    search,
  ]);

  const spareAssets = useMemo(
    () => assets.filter((a) => a.status === "In Storage"),
    [assets]
  );

  const openCreate = () => {
    setDraft(
      emptyDraft(user?.displayName || user?.email?.split("@")[0] || "Ryan")
    );
    setCheckText("");
    setShowQuickVendor(false);
    setShowReplacePanel(false);
    setReplacementAssetId("");
    setModalOpen(true);
  };

  const openDetail = (item: IncidentReport) => {
    setDraft({
      ...item,
      itemType: item.itemType || "Ticket",
      title: item.title || item.assetName,
      checklist: item.checklist || [],
    });
    setCheckText("");
    setShowQuickVendor(false);
    setShowReplacePanel(false);
    setReplacementAssetId("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || saving) return;
    const title = (draft.title || draft.assetName || "").trim();
    if (!title) return;

    setSaving(true);
    try {
      const resolvedNow =
        draft.status === "Resolved" && !draft.resolvedAt
          ? new Date().toISOString()
          : draft.resolvedAt;

      if (draft.id) {
        await updateIncidentReport(
          draft.id,
          {
            itemType: draft.itemType || "Ticket",
            title,
            assetName: draft.assetName || title,
            location: draft.location || "",
            assignedTo: draft.assignedTo || "",
            vendor: draft.vendor || "",
            dueDate: draft.dueDate || "",
            externalTicketRef: draft.externalTicketRef?.trim() || "",
            description: draft.description?.trim() || "",
            resolutionNotes: draft.resolutionNotes?.trim() || "",
            priority: draft.priority || "Medium",
            status: draft.status || "Open",
            checklist: draft.checklist || [],
            resolvedAt: resolvedNow,
          },
          draft.status === "Resolved"
        );
      } else {
        await createIncidentReport({
          itemType: draft.itemType || "Task",
          title,
          assetName: draft.assetName || title,
          location: draft.location || "Head Office",
          reportedBy:
            draft.reportedBy ||
            user?.displayName ||
            user?.email?.split("@")[0] ||
            "IT",
          reporterEmail: user?.email || "",
          assignedTo: draft.assignedTo || "",
          vendor: draft.vendor || "",
          dueDate: draft.dueDate || "",
          externalTicketRef: draft.externalTicketRef?.trim() || "",
          description: draft.description?.trim() || "",
          resolutionNotes: draft.resolutionNotes?.trim() || "",
          priority: draft.priority || "Medium",
          status: draft.status || "Open",
          checklist: draft.checklist || [],
        });
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (
    item: IncidentReport,
    status: WorkItemStatus
  ) => {
    if (!canEdit) return;
    await updateIncidentReport(
      item.id,
      {
        status,
        resolvedAt:
          status === "Resolved" ? new Date().toISOString() : item.resolvedAt,
      },
      status === "Resolved"
    );
  };

  const handleReplaceAsset = async () => {
    if (!canEdit || !draft.id || !draft.assetId || !replacementAssetId) return;
    setSaving(true);
    try {
      await processAssetReplacement(
        draft.id,
        draft.assetId,
        replacementAssetId,
        draft.resolutionNotes || ""
      );
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (confirm("Delete this ticket/task permanently?")) {
      await deleteIncidentReport(id);
      setModalOpen(false);
    }
  };

  const handleQuickAddVendor = async () => {
    if (!canEdit || !quickVendorName.trim()) return;
    const name = quickVendorName.trim();
    await saveVendor({
      id: "",
      name,
      category: "Other",
      createdAt: new Date().toISOString(),
    });
    setDraft((prev) => ({ ...prev, vendor: name }));
    setQuickVendorName("");
    setShowQuickVendor(false);
  };

  const handleCopyPortalLink = () => {
    const url = `${window.location.origin}/#/report-issue`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const addChecklistItem = () => {
    if (!checkText.trim()) return;
    setDraft((prev) => ({
      ...prev,
      checklist: [
        ...(prev.checklist || []),
        { id: Date.now().toString(), text: checkText.trim(), done: false },
      ],
    }));
    setCheckText("");
  };

  const toggleChecklistItem = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      checklist: (prev.checklist || []).map((c) =>
        c.id === id ? { ...c, done: !c.done } : c
      ),
    }));
  };

  const removeChecklistItem = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      checklist: (prev.checklist || []).filter((c) => c.id !== id),
    }));
  };

  const boardColumns: { label: string; statuses: WorkItemStatus[] }[] = [
    { label: "New / Open", statuses: ["New", "Open"] },
    { label: "In Progress", statuses: ["In Progress"] },
    {
      label: "Waiting (Vendor / Parts)",
      statuses: ["Waiting on Vendor", "Waiting for Parts"],
    },
    { label: "Resolved", statuses: ["Resolved"] },
  ];

  const inputClass =
    "w-full px-3 py-2 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C] text-[#172B4D] dark:text-[#E6EDF5] focus:border-[#0052CC] outline-none";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-[#172B4D] dark:text-[#E6EDF5]">
            Tickets &amp; Tasks
          </h1>
          <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8]">
            Unified IT service queue for staff-reported issues and internal IT tasks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyPortalLink}
            className="px-3 py-2 rounded border border-[#DFE3E8] dark:border-[#2A3444] bg-white dark:bg-[#161C26] text-[13px] font-medium text-[#172B4D] dark:text-[#E6EDF5] hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] flex items-center gap-1.5"
          >
            {copiedLink ? (
              <>
                <Check size={14} className="text-[#00875A]" /> Copied Portal Link
              </>
            ) : (
              <>
                <Link2 size={14} /> Copy Staff Ticket Link
              </>
            )}
          </button>

          <div className="flex bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#2A3444] rounded p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                viewMode === "list"
                  ? "bg-[#DEEBFF] text-[#0052CC] dark:bg-[#0052CC]/25 dark:text-[#4C9AFF]"
                  : "text-[#5E6C84]"
              }`}
            >
              <ListIcon size={13} /> List
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                viewMode === "board"
                  ? "bg-[#DEEBFF] text-[#0052CC] dark:bg-[#0052CC]/25 dark:text-[#4C9AFF]"
                  : "text-[#5E6C84]"
              }`}
            >
              <LayoutGrid size={13} /> Board
            </button>
          </div>

          {canEdit && (
            <button
              onClick={openCreate}
              className="px-3.5 py-2 bg-[#0052CC] hover:bg-[#0043A8] text-white text-[13px] font-medium rounded flex items-center gap-1.5 transition-colors"
            >
              <Plus size={15} /> New Ticket / Task
            </button>
          )}
        </div>
      </div>

      {/* Unified Summary Strip */}
      <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[#EBECF0] dark:divide-[#242E40]">
        <div className="p-3.5">
          <div className="text-[12px] text-[#5E6C84] dark:text-[#94A3B8]">
            Total open
          </div>
          <div className="text-[20px] font-semibold tabular-nums mt-0.5">
            {metrics.open}
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-[12px] text-[#5E6C84] dark:text-[#94A3B8]">
            Support tickets
          </div>
          <div className="text-[20px] font-semibold tabular-nums mt-0.5">
            {metrics.tickets}
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-[12px] text-[#5E6C84] dark:text-[#94A3B8]">
            Internal tasks
          </div>
          <div className="text-[20px] font-semibold tabular-nums mt-0.5">
            {metrics.tasks}
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-[12px] text-[#5E6C84] dark:text-[#94A3B8]">
            Overdue
          </div>
          <div
            className={`text-[20px] font-semibold tabular-nums mt-0.5 ${
              metrics.overdue > 0 ? "text-[#DE350B]" : ""
            }`}
          >
            {metrics.overdue}
          </div>
        </div>
        <div className="p-3.5 col-span-2 md:col-span-1">
          <div className="text-[12px] text-[#5E6C84] dark:text-[#94A3B8]">
            Critical open
          </div>
          <div
            className={`text-[20px] font-semibold tabular-nums mt-0.5 ${
              metrics.critical > 0 ? "text-[#DE350B]" : ""
            }`}
          >
            {metrics.critical}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded p-3 flex flex-wrap gap-2.5 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B778C]"
          />
          <input
            type="text"
            placeholder="Search ID, subject, venue, vendor, reporter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
          />
        </div>

        <select
          value={statusScope}
          onChange={(e) => setStatusScope(e.target.value as any)}
          className="px-2.5 py-1.5 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
        >
          <option value="open">Open queue</option>
          <option value="resolved">Resolved / Closed</option>
          <option value="all">All items</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="px-2.5 py-1.5 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
        >
          <option value="All">All types</option>
          <option value="Ticket">Support tickets</option>
          <option value="Task">Internal tasks</option>
        </select>

        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="px-2.5 py-1.5 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
        >
          <option value="All">All owners</option>
          {IT_OWNERS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          <option value="Unassigned">Unassigned</option>
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

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-2.5 py-1.5 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
        >
          <option value="All">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 text-xs font-medium text-[#42526E] dark:text-[#CBD5E1] cursor-pointer px-1">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
          />
          Overdue only
        </label>
      </div>

      {/* Main Queue View */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="animate-spin text-[#0052CC]" size={26} />
        </div>
      ) : viewMode === "list" ? (
        <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#EBECF0] dark:border-[#242E40] text-[11px] font-semibold uppercase tracking-wide text-[#6B778C] bg-[#F9FAFB] dark:bg-[#1B2230]">
                <th className="px-4 py-2.5">Ref</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Subject / Issue</th>
                <th className="px-4 py-2.5">Venue</th>
                <th className="px-4 py-2.5">Owner</th>
                <th className="px-4 py-2.5">Priority</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBECF0] dark:divide-[#242E40]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-[#6B778C]"
                  >
                    No tickets or tasks match your current filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const overdue = isItemOverdue(item);
                  const isTask = item.itemType === "Task";
                  return (
                    <tr
                      key={item.id}
                      onClick={() => openDetail(item)}
                      className="hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-[#0052CC] dark:text-[#4C9AFF] whitespace-nowrap">
                        {item.ticketNumber}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                            isTask
                              ? "bg-[#EAE6FF] text-[#403294] dark:bg-purple-900/30 dark:text-purple-300"
                              : "bg-[#DEEBFF] text-[#0052CC] dark:bg-blue-900/30 dark:text-blue-300"
                          }`}
                        >
                          {isTask ? "Task" : "Ticket"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-[#172B4D] dark:text-[#E6EDF5]">
                          {item.title || item.assetName}
                        </div>
                        <div className="text-xs text-[#6B778C] truncate max-w-md">
                          {item.description || item.reportedBy}
                          {item.vendor ? ` • Vendor: ${item.vendor}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-[#5E6C84] dark:text-[#94A3B8] whitespace-nowrap">
                        {item.location || "—"}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {item.assignedTo || (
                          <span className="text-[#8A99B0]">Unassigned</span>
                        )}
                      </td>
                      <td
                        className={`px-4 py-2.5 whitespace-nowrap ${priorityStyle(
                          item.priority
                        )}`}
                      >
                        {item.priority}
                      </td>
                      <td
                        className="px-4 py-2.5 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          disabled={!canEdit}
                          value={item.status}
                          onChange={(e) =>
                            handleQuickStatus(
                              item,
                              e.target.value as WorkItemStatus
                            )
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
                      <td className="px-4 py-2.5 text-right font-mono text-xs whitespace-nowrap">
                        {item.dueDate ? (
                          <span
                            className={
                              overdue
                                ? "text-[#DE350B] font-semibold"
                                : "text-[#5E6C84]"
                            }
                          >
                            {item.dueDate}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {boardColumns.map((col) => {
            const colItems = filteredItems.filter((i) =>
              col.statuses.includes(i.status)
            );
            return (
              <div
                key={col.label}
                className="bg-[#EBECF0]/60 dark:bg-[#121720] border border-[#DFE3E8] dark:border-[#242E40] rounded flex flex-col min-h-[260px]"
              >
                <div className="px-3.5 py-2.5 border-b border-[#DFE3E8] dark:border-[#242E40] flex items-center justify-between text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1]">
                  <span>{col.label}</span>
                  <span className="font-mono text-[#6B778C]">
                    {colItems.length}
                  </span>
                </div>
                <div className="p-2.5 space-y-2.5">
                  {colItems.map((item) => {
                    const overdue = isItemOverdue(item);
                    return (
                      <div
                        key={item.id}
                        onClick={() => openDetail(item)}
                        className="bg-white dark:bg-[#161C26] p-3 rounded border border-[#DFE3E8] dark:border-[#242E40] hover:border-[#0052CC] cursor-pointer space-y-2"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-[#0052CC] dark:text-[#4C9AFF]">
                            {item.ticketNumber}
                          </span>
                          <span className={priorityStyle(item.priority)}>
                            {item.priority}
                          </span>
                        </div>
                        <div className="text-[13px] font-medium text-[#172B4D] dark:text-[#E6EDF5]">
                          {item.title || item.assetName}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#6B778C] pt-1 border-t border-[#EBECF0] dark:border-[#242E40]">
                          <span>{item.assignedTo || "Unassigned"}</span>
                          <span className={overdue ? "text-[#DE350B] font-semibold" : ""}>
                            {item.dueDate || item.location || "—"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail / Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#2A3444] rounded max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#EBECF0] dark:border-[#242E40] bg-[#F9FAFB] dark:bg-[#1B2230] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h3 className="text-[15px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
                  {draft.id ? draft.ticketNumber : "New Ticket / Task"}
                </h3>
                {draft.id && (
                  <span className="text-xs text-[#6B778C]">
                    Reported by {draft.reportedBy}
                    {draft.reporterEmail ? ` (${draft.reporterEmail})` : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {draft.id && isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(draft.id!)}
                    className="p-1.5 text-[#DE350B] hover:bg-[#FFEBE6] dark:hover:bg-red-950/30 rounded"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 text-[#6B778C] hover:text-[#172B4D] dark:hover:text-white rounded"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSave}
              className="p-5 overflow-y-auto space-y-4 flex-1"
            >
              {/* Type & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1">
                    Type
                  </label>
                  <select
                    disabled={!canEdit}
                    value={draft.itemType || "Task"}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        itemType: e.target.value as WorkItemType,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="Task">Internal Task</option>
                    <option value="Ticket">Support Ticket</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1">
                    Subject / Title *
                  </label>
                  <input
                    required
                    disabled={!canEdit}
                    type="text"
                    value={draft.title || ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        title: e.target.value,
                        assetName: draft.assetName || e.target.value,
                      })
                    }
                    placeholder="e.g. POS thermal printer offline at JBR or Renew FortiGate license"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Owner, Priority, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1">
                    Assigned Owner
                  </label>
                  <select
                    disabled={!canEdit}
                    value={draft.assignedTo || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, assignedTo: e.target.value })
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
                  <label className="block text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1">
                    Priority
                  </label>
                  <select
                    disabled={!canEdit}
                    value={draft.priority || "Medium"}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        priority: e.target.value as IncidentReport["priority"],
                      })
                    }
                    className={inputClass}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1">
                    Status
                  </label>
                  <select
                    disabled={!canEdit}
                    value={draft.status || "Open"}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
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

              {/* Venue, Vendor, Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1">
                    Venue / Location
                  </label>
                  <select
                    disabled={!canEdit}
                    value={draft.location || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, location: e.target.value })
                    }
                    className={inputClass}
                  >
                    <option value="">General / Head Office</option>
                    {locations.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1]">
                      Vendor
                    </label>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setShowQuickVendor(!showQuickVendor)}
                        className="text-[11px] text-[#0052CC] dark:text-[#4C9AFF] hover:underline"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                  {showQuickVendor ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={quickVendorName}
                        onChange={(e) => setQuickVendorName(e.target.value)}
                        placeholder="Vendor name"
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={handleQuickAddVendor}
                        className="px-2.5 bg-[#0052CC] text-white text-xs rounded"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <select
                      disabled={!canEdit}
                      value={draft.vendor || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, vendor: e.target.value })
                      }
                      className={inputClass}
                    >
                      <option value="">Internal IT</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.name}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1">
                    Due Date
                  </label>
                  <input
                    disabled={!canEdit}
                    type="date"
                    value={draft.dueDate || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, dueDate: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              {/* External Reference */}
              <div>
                <label className="block text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1">
                  External Ticket Reference (ISP / Bayzat / Vendor)
                </label>
                <input
                  disabled={!canEdit}
                  type="text"
                  value={draft.externalTicketRef || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, externalTicketRef: e.target.value })
                  }
                  placeholder="Optional reference ID"
                  className={inputClass}
                />
              </div>

              {/* Description & Photo */}
              <div>
                <label className="block text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1">
                  Description
                </label>
                <textarea
                  disabled={!canEdit}
                  rows={3}
                  value={draft.description || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                  className={inputClass}
                />
              </div>

              {draft.imageBase64 && (
                <div>
                  <div className="text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1">
                    Attached Evidence Photo
                  </div>
                  <img
                    src={draft.imageBase64}
                    alt="Ticket evidence"
                    className="max-h-56 rounded border border-[#DFE3E8] dark:border-[#242E40]"
                  />
                </div>
              )}

              {/* Resolution Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1">
                  Resolution Notes
                </label>
                <textarea
                  disabled={!canEdit}
                  rows={2}
                  value={draft.resolutionNotes || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, resolutionNotes: e.target.value })
                  }
                  placeholder="Document fix applied or follow-up steps (visible on status tracker when resolved)..."
                  className={inputClass}
                />
              </div>

              {/* Optional Hardware Replacement if linked to an Asset */}
              {canEdit && draft.id && draft.assetId && draft.status !== "Resolved" && (
                <div className="p-3 rounded bg-[#F9FAFB] dark:bg-[#1B2230] border border-[#DFE3E8] dark:border-[#2A3444] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#172B4D] dark:text-[#E6EDF5] flex items-center gap-1.5">
                      <RefreshCw size={13} /> Hardware Replacement (Linked Asset)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowReplacePanel(!showReplacePanel)}
                      className="text-xs text-[#0052CC] dark:text-[#4C9AFF] hover:underline"
                    >
                      {showReplacePanel ? "Hide" : "Swap faulty asset"}
                    </button>
                  </div>
                  {showReplacePanel && (
                    <div className="flex gap-2 pt-1">
                      <select
                        value={replacementAssetId}
                        onChange={(e) => setReplacementAssetId(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select spare from storage...</option>
                        {spareAssets.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.serialNumber || "No SN"})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!replacementAssetId || saving}
                        onClick={handleReplaceAsset}
                        className="px-3 py-2 bg-[#DE350B] text-white text-xs font-medium rounded shrink-0 disabled:opacity-50"
                      >
                        Retire &amp; Swap
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Checklist */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1]">
                  Checklist / Subtasks
                </label>
                {(draft.checklist || []).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 rounded border border-[#EBECF0] dark:border-[#242E40] bg-[#FAFBFC] dark:bg-[#0F141C] text-[13px]"
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        disabled={!canEdit}
                        type="checkbox"
                        checked={c.done}
                        onChange={() => toggleChecklistItem(c.id)}
                      />
                      <span className={c.done ? "line-through text-[#8A99B0]" : ""}>
                        {c.text}
                      </span>
                    </label>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(c.id)}
                        className="text-[#8A99B0] hover:text-[#DE350B]"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={checkText}
                      onChange={(e) => setCheckText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addChecklistItem();
                        }
                      }}
                      placeholder="Add checklist item..."
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={addChecklistItem}
                      className="px-3 py-1.5 text-xs font-medium border border-[#C1C7D0] dark:border-[#2E3A4D] rounded"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              {canEdit && (
                <div className="flex justify-end gap-2 pt-3 border-t border-[#EBECF0] dark:border-[#242E40]">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-[13px] text-[#5E6C84] hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-[#0052CC] hover:bg-[#0043A8] text-white text-[13px] font-medium rounded flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Save size={14} /> {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketsAndTasks;
