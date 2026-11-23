import React, { useState, useEffect, useMemo } from "react";
import { Task, TaskPriority, TaskStatus, Vendor, IncidentReport } from "../types";
import {
  listenToTasks,
  saveTask,
  deleteTask,
  listenToVendors,
  saveVendor,
  listenToIncidents,
  getAppConfig,
  getCurrentUserProfile,
  canManageOperations,
  isAdminRole,
} from "../services/storageService";
import {
  Plus,
  Trash2,
  Calendar,
  Edit2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  ClipboardList,
  Save,
  CheckSquare,
  Search,
  LayoutGrid,
  List as ListIcon,
  Building2,
  User,
  Truck,
  Link2,
  FileText,
} from "lucide-react";

const IT_OWNERS = ["Ryan", "Diego"];
const TASK_STATUSES: TaskStatus[] = [
  "Pending",
  "In Progress",
  "Waiting on Vendor",
  "Completed",
];
const TASK_PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];

const isTaskOverdue = (task: Task): boolean => {
  if (task.status === "Completed" || !task.dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
};

const getPriorityBadge = (p: TaskPriority) => {
  switch (p) {
    case "Critical":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800";
    case "High":
      return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";
    case "Medium":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
  }
};

const getStatusBadge = (s: TaskStatus) => {
  switch (s) {
    case "Completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/40";
    case "In Progress":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/40";
    case "Waiting on Vendor":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/40";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  }
};

const emptyTaskDraft = (): Partial<Task> => ({
  title: "",
  description: "",
  status: "Pending",
  priority: "Medium",
  assignedTo: "Ryan",
  venue: "",
  vendor: "",
  linkedTicketId: "",
  externalTicketRef: "",
  resolutionNotes: "",
  dueDate: "",
  checklist: [],
});

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Filters
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [venueFilter, setVenueFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Create / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Task>>(emptyTaskDraft());
  const [checkItemText, setCheckItemText] = useState("");
  const [quickVendorName, setQuickVendorName] = useState("");
  const [showQuickVendor, setShowQuickVendor] = useState(false);

  const user = getCurrentUserProfile();
  const canEdit = canManageOperations(user);
  const isAdmin = isAdminRole(user);

  useEffect(() => {
    const unsubTasks = listenToTasks((data) => {
      setTasks(data);
      setLoading(false);
    });
    const unsubVendors = listenToVendors(setVendors);
    const unsubIncidents = listenToIncidents(setIncidents);
    getAppConfig()
      .then((c) => setLocations(c.locations || []))
      .catch(() => {});

    return () => {
      unsubTasks();
      unsubVendors();
      unsubIncidents();
    };
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.venue || "").toLowerCase().includes(q) ||
        (t.vendor || "").toLowerCase().includes(q) ||
        (t.externalTicketRef || "").toLowerCase().includes(q) ||
        (t.linkedTicketId || "").toLowerCase().includes(q);
      const matchesOwner =
        ownerFilter === "All" ||
        (ownerFilter === "Unassigned"
          ? !t.assignedTo
          : (t.assignedTo || "").toLowerCase() === ownerFilter.toLowerCase());
      const matchesVenue = venueFilter === "All" || t.venue === venueFilter;
      const matchesPriority =
        priorityFilter === "All" || t.priority === priorityFilter;
      const matchesOverdue = !overdueOnly || isTaskOverdue(t);
      return (
        matchesSearch &&
        matchesOwner &&
        matchesVenue &&
        matchesPriority &&
        matchesOverdue
      );
    });
  }, [tasks, search, ownerFilter, venueFilter, priorityFilter, overdueOnly]);

  const metrics = useMemo(() => {
    const open = tasks.filter((t) => t.status !== "Completed").length;
    const inProgress = tasks.filter((t) => t.status === "In Progress").length;
    const waitingVendor = tasks.filter(
      (t) => t.status === "Waiting on Vendor"
    ).length;
    const overdue = tasks.filter(isTaskOverdue).length;
    const critical = tasks.filter(
      (t) => t.status !== "Completed" && t.priority === "Critical"
    ).length;
    return { open, inProgress, waitingVendor, overdue, critical };
  }, [tasks]);

  const openCreate = () => {
    setDraft(emptyTaskDraft());
    setCheckItemText("");
    setShowQuickVendor(false);
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setDraft({ ...task, checklist: task.checklist || [] });
    setCheckItemText("");
    setShowQuickVendor(false);
    setModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !draft.title?.trim()) return;

    const now = new Date().toISOString();
    const status = (draft.status as TaskStatus) || "Pending";
    const task: Task = {
      id: draft.id || `task-${Date.now()}`,
      title: draft.title.trim(),
      description: draft.description?.trim() || "",
      status,
      priority: (draft.priority as TaskPriority) || "Medium",
      assignedTo: draft.assignedTo || "",
      venue: draft.venue || "",
      vendor: draft.vendor || "",
      linkedTicketId: draft.linkedTicketId || "",
      externalTicketRef: draft.externalTicketRef?.trim() || "",
      resolutionNotes: draft.resolutionNotes?.trim() || "",
      dueDate: draft.dueDate || "",
      completedAt:
        status === "Completed" ? draft.completedAt || now : undefined,
      createdAt: draft.createdAt || now,
      createdBy: draft.createdBy || user?.email || "System",
      checklist: draft.checklist || [],
    };

    await saveTask(task);
    setModalOpen(false);
  };

  const handleQuickStatus = async (task: Task, status: TaskStatus) => {
    if (!canEdit) return;
    await saveTask({
      ...task,
      status,
      completedAt:
        status === "Completed" ? new Date().toISOString() : undefined,
    });
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (confirm("Delete this operational task?")) {
      await deleteTask(id);
      if (draft.id === id) setModalOpen(false);
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

  const addCheckItem = () => {
    if (!checkItemText.trim()) return;
    const item = {
      id: Date.now().toString(),
      text: checkItemText.trim(),
      done: false,
    };
    setDraft((prev) => ({
      ...prev,
      checklist: [...(prev.checklist || []), item],
    }));
    setCheckItemText("");
  };

  const toggleCheckItem = (itemId: string) => {
    setDraft((prev) => ({
      ...prev,
      checklist: (prev.checklist || []).map((i) =>
        i.id === itemId ? { ...i, done: !i.done } : i
      ),
    }));
  };

  const removeCheckItem = (itemId: string) => {
    setDraft((prev) => ({
      ...prev,
      checklist: (prev.checklist || []).filter((i) => i.id !== itemId),
    }));
  };

  const renderTaskCard = (task: Task) => {
    const overdue = isTaskOverdue(task);
    const doneChecks = (task.checklist || []).filter((c) => c.done).length;
    const totalChecks = (task.checklist || []).length;

    return (
      <div
        key={task.id}
        onClick={() => openEdit(task)}
        className={`bg-white dark:bg-slate-900 p-4 rounded-xl border transition-all cursor-pointer shadow-sm hover:shadow-md ${
          overdue
            ? "border-red-300 dark:border-red-800"
            : "border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-blue-500"
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getPriorityBadge(
              task.priority
            )}`}
          >
            {task.priority}
          </span>
          {overdue && (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1">
              <AlertTriangle size={10} /> Overdue
            </span>
          )}
        </div>

        <h4 className="font-semibold text-sm text-slate-900 dark:text-white leading-snug">
          {task.title}
        </h4>

        {task.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 mt-3">
          {task.venue && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Building2 size={11} /> {task.venue}
            </span>
          )}
          {task.vendor && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">
              <Truck size={11} /> {task.vendor}
            </span>
          )}
          {(task.linkedTicketId || task.externalTicketRef) && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-mono">
              <Link2 size={11} /> {task.linkedTicketId || task.externalTicketRef}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <User size={12} className="text-slate-400" />
            {task.assignedTo || "Unassigned"}
          </div>
          <div className="flex items-center gap-3">
            {totalChecks > 0 && (
              <span className="flex items-center gap-1">
                <CheckSquare size={12} /> {doneChecks}/{totalChecks}
              </span>
            )}
            {task.dueDate && (
              <span
                className={`flex items-center gap-1 ${
                  overdue ? "text-red-600 dark:text-red-400 font-semibold" : ""
                }`}
              >
                <Calendar size={12} /> {task.dueDate}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#111318] dark:text-[#F1F3F7]">
            IT Operations & Tasks
          </h1>
          <p className="text-xs text-[#5A6270] dark:text-[#8B94A5] mt-0.5">
            Track daily IT operations, venue issues, vendor work, and ticket resolutions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode("board")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${
                viewMode === "board"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500"
              }`}
            >
              <LayoutGrid size={14} /> Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500"
              }`}
            >
              <ListIcon size={14} /> List
            </button>
          </div>

          {canEdit && (
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-slate-900 dark:bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-black dark:hover:bg-blue-700 flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} /> New Task
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Open Tasks
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.open}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-500">
            In Progress
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.inProgress}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-purple-500">
            Waiting Vendor
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.waitingVendor}
          </div>
        </div>
        <div
          className={`p-4 rounded-xl border ${
            metrics.overdue > 0
              ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
            Overdue
          </div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">
            {metrics.overdue}
          </div>
        </div>
        <div
          className={`p-4 rounded-xl border ${
            metrics.critical > 0
              ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
            Critical Open
          </div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">
            {metrics.critical}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search tasks, venues, vendors, ticket refs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
          />
        </div>
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
        >
          <option value="All">All Owners</option>
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
          className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
        >
          <option value="All">All Venues</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
        >
          <option value="All">All Priorities</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer px-2">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
            className="rounded border-slate-300"
          />
          Overdue Only
        </label>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      ) : viewMode === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {TASK_STATUSES.map((status) => {
            const colTasks = filteredTasks.filter((t) => t.status === status);
            return (
              <div
                key={status}
                className="bg-slate-100/70 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col min-h-[260px]"
              >
                <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    {status}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {colTasks.length}
                  </span>
                </div>
                <div className="p-3 space-y-3">
                  {colTasks.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No tasks
                    </div>
                  ) : (
                    colTasks.map(renderTaskCard)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-slate-950/60">
                <th className="p-3.5">Task</th>
                <th className="p-3.5">Owner</th>
                <th className="p-3.5">Venue / Vendor</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No tasks match your filters.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => {
                  const overdue = isTaskOverdue(t);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => openEdit(t)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                    >
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {t.title}
                        </div>
                        {(t.linkedTicketId || t.externalTicketRef) && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                            Ref: {t.linkedTicketId || t.externalTicketRef}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        {t.assignedTo || "Unassigned"}
                      </td>
                      <td className="p-3.5 text-xs text-slate-600 dark:text-slate-400">
                        <div>{t.venue || "—"}</div>
                        {t.vendor && (
                          <div className="text-purple-600 dark:text-purple-400">
                            Vendor: {t.vendor}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getPriorityBadge(
                            t.priority
                          )}`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td
                        className="p-3.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          disabled={!canEdit}
                          value={t.status}
                          onChange={(e) =>
                            handleQuickStatus(t, e.target.value as TaskStatus)
                          }
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border outline-none ${getStatusBadge(
                            t.status
                          )}`}
                        >
                          {TASK_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3.5 text-xs">
                        {t.dueDate ? (
                          <span
                            className={
                              overdue
                                ? "text-red-600 dark:text-red-400 font-bold"
                                : "text-slate-600 dark:text-slate-400"
                            }
                          >
                            {t.dueDate} {overdue && "(Overdue)"}
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
      )}

      {/* Create / Edit Task Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {draft.id ? <Edit2 size={18} /> : <Plus size={18} />}
                {draft.id ? "Task Details" : "New Operational Task"}
              </h3>
              <div className="flex items-center gap-2">
                {draft.id && isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(draft.id!)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="Delete Task"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSaveTask}
              className="p-5 overflow-y-auto space-y-4 flex-1"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task Title *
                </label>
                <input
                  required
                  disabled={!canEdit}
                  type="text"
                  value={draft.title || ""}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="e.g. Replace FortiGate firewall power adapter at JBR"
                  className="w-full p-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Owner
                  </label>
                  <select
                    disabled={!canEdit}
                    value={draft.assignedTo || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, assignedTo: e.target.value })
                    }
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    disabled={!canEdit}
                    value={draft.priority || "Medium"}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        priority: e.target.value as TaskPriority,
                      })
                    }
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  >
                    {TASK_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    disabled={!canEdit}
                    value={draft.status || "Pending"}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        status: e.target.value as TaskStatus,
                      })
                    }
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  >
                    {TASK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Venue / Location
                  </label>
                  <select
                    disabled={!canEdit}
                    value={draft.venue || ""}
                    onChange={(e) => setDraft({ ...draft, venue: e.target.value })}
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  >
                    <option value="">None / General</option>
                    {locations.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Vendor
                    </label>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setShowQuickVendor(!showQuickVendor)}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        + Add Vendor
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
                        className="flex-1 p-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                      />
                      <button
                        type="button"
                        onClick={handleQuickAddVendor}
                        className="px-2.5 py-1 bg-blue-600 text-white text-xs rounded-lg"
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
                      className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                    >
                      <option value="">Internal (No Vendor)</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.name}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    disabled={!canEdit}
                    type="date"
                    value={draft.dueDate || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, dueDate: e.target.value })
                    }
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Linked Help Desk Ticket
                  </label>
                  <select
                    disabled={!canEdit}
                    value={draft.linkedTicketId || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, linkedTicketId: e.target.value })
                    }
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  >
                    <option value="">None</option>
                    {incidents.slice(0, 50).map((inc) => (
                      <option key={inc.id} value={inc.ticketNumber}>
                        {inc.ticketNumber} — {inc.assetName} ({inc.location})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    External Ticket Ref (ISP / Vendor / Bayzat)
                  </label>
                  <input
                    disabled={!canEdit}
                    type="text"
                    value={draft.externalTicketRef || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, externalTicketRef: e.target.value })
                    }
                    placeholder="e.g. ETISALAT-88210 or BAYZAT-104"
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Issue Description
                </label>
                <textarea
                  disabled={!canEdit}
                  rows={3}
                  value={draft.description || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                  placeholder="Describe the issue, scope, or site context..."
                  className="w-full p-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <FileText size={13} /> Resolution Notes
                </label>
                <textarea
                  disabled={!canEdit}
                  rows={2}
                  value={draft.resolutionNotes || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, resolutionNotes: e.target.value })
                  }
                  placeholder="Document root cause, fix applied, or handover notes..."
                  className="w-full p-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                />
              </div>

              {/* Checklist */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Subtasks / Checklist
                </label>
                {(draft.checklist || []).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  >
                    <label className="flex items-center gap-2 text-sm cursor-pointer flex-1">
                      <input
                        disabled={!canEdit}
                        type="checkbox"
                        checked={item.done}
                        onChange={() => toggleCheckItem(item.id)}
                      />
                      <span
                        className={
                          item.done ? "line-through text-slate-400" : ""
                        }
                      >
                        {item.text}
                      </span>
                    </label>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => removeCheckItem(item.id)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={checkItemText}
                      onChange={(e) => setCheckItemText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCheckItem();
                        }
                      }}
                      placeholder="Add a subtask..."
                      className="flex-1 p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                    />
                    <button
                      type="button"
                      onClick={addCheckItem}
                      className="px-3 py-2 text-xs font-semibold bg-slate-200 dark:bg-slate-800 rounded-lg"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              {canEdit && (
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-semibold bg-slate-900 dark:bg-blue-600 text-white rounded-lg hover:bg-black dark:hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Save size={15} /> Save Task
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

export default Tasks;
