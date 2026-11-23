import React, { useState, useEffect, useMemo } from "react";
import {
  Project,
  ProjectItem,
  ProjectStatus,
  ProjectMilestone,
  ProjectBlocker,
  ManagementDecision,
} from "../types";
import {
  listenToProjects,
  saveProject,
  deleteProject,
  getAppConfig,
  getCurrentUserProfile,
  canManageOperations,
  isAdminRole,
} from "../services/storageService";
import {
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  Trash2,
  ShoppingBag,
  AlertTriangle,
  X,
  Save,
  DollarSign,
  Users,
  Building2,
  Flag,
  GitBranch,
  Scale,
  FolderKanban,
  Edit2,
} from "lucide-react";

const IT_STAFF = ["Ryan", "Diego"];
const PROJECT_STATUSES: ProjectStatus[] = [
  "Planning",
  "In Progress",
  "On Hold",
  "Completed",
];

const STATUS_STYLES: Record<ProjectStatus, string> = {
  Planning:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  "In Progress":
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  "On Hold":
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  Completed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
};

const computeProgress = (p: Project): number => {
  const milestones = p.milestones || [];
  if (milestones.length > 0) {
    const done = milestones.filter((m) => m.status === "Completed").length;
    return Math.round((done / milestones.length) * 100);
  }
  return p.status === "Completed" ? 100 : p.progress || 0;
};

const Planner: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<"All" | ProjectStatus>("All");

  // Selected project for detail view
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<
    "milestones" | "blockers" | "decisions" | "procurement"
  >("milestones");

  // Create / Edit Project Modal
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectDraft, setProjectDraft] = useState<Partial<Project>>({
    name: "",
    description: "",
    targetDate: "",
    status: "Planning",
    owner: "Ryan",
    assignedPersonnel: ["Ryan"],
    venue: "Multi-Venue / All",
    progress: 0,
  });

  // Sub-item inputs
  const [msTitle, setMsTitle] = useState("");
  const [msDate, setMsDate] = useState("");
  const [msOwner, setMsOwner] = useState("Ryan");

  const [blockerTitle, setBlockerTitle] = useState("");
  const [blockerSeverity, setBlockerSeverity] =
    useState<ProjectBlocker["severity"]>("High");
  const [depText, setDepText] = useState("");

  const [decTitle, setDecTitle] = useState("");
  const [decDetails, setDecDetails] = useState("");

  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemCost, setItemCost] = useState(0);
  const [itemQty, setItemQty] = useState(1);
  const [itemDue, setItemDue] = useState("");

  const user = getCurrentUserProfile();
  const canEdit = canManageOperations(user);
  const canDelete = isAdminRole(user);

  useEffect(() => {
    const unsub = listenToProjects(setProjects);
    getAppConfig()
      .then((c) => {
        setCategories(c.categories || []);
        setLocations(c.locations || []);
        if (c.categories?.length) setItemCategory(c.categories[0]);
      })
      .catch(() => {});
    return () => unsub();
  }, []);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedId) || null,
    [projects, selectedId]
  );

  const filteredProjects = useMemo(() => {
    return projects.filter(
      (p) => statusFilter === "All" || p.status === statusFilter
    );
  }, [projects, statusFilter]);

  const metrics = useMemo(() => {
    const active = projects.filter((p) => p.status !== "Completed").length;
    const avgProgress = projects.length
      ? Math.round(
          projects.reduce((acc, p) => acc + computeProgress(p), 0) /
            projects.length
        )
      : 0;
    const openBlockers = projects.reduce(
      (acc, p) => acc + (p.blockers || []).filter((b) => !b.resolved).length,
      0
    );
    const pendingDecisions = projects.reduce(
      (acc, p) =>
        acc +
        (p.decisionsRequired || []).filter((d) => d.status === "Pending")
          .length,
      0
    );
    return { active, avgProgress, openBlockers, pendingDecisions };
  }, [projects]);

  const openCreateModal = () => {
    setProjectDraft({
      name: "",
      description: "",
      targetDate: "",
      status: "Planning",
      owner: "Ryan",
      assignedPersonnel: ["Ryan"],
      venue: "Multi-Venue / All",
      progress: 0,
    });
    setShowProjectModal(true);
  };

  const openEditModal = (p: Project) => {
    setProjectDraft({ ...p });
    setShowProjectModal(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !projectDraft.name?.trim()) return;

    const existing = projectDraft.id
      ? projects.find((p) => p.id === projectDraft.id)
      : undefined;

    const payload: Project = {
      id: existing?.id || `prj-${Math.random().toString(36).substr(2, 9)}`,
      name: projectDraft.name.trim(),
      description: projectDraft.description?.trim() || "",
      targetDate: projectDraft.targetDate || "",
      status: (projectDraft.status as ProjectStatus) || "Planning",
      owner: projectDraft.owner || "Ryan",
      assignedPersonnel: projectDraft.assignedPersonnel || ["Ryan"],
      venue: projectDraft.venue || "Multi-Venue / All",
      progress: projectDraft.progress || 0,
      milestones: existing?.milestones || [],
      dependencies: existing?.dependencies || [],
      blockers: existing?.blockers || [],
      decisionsRequired: existing?.decisionsRequired || [],
      items: existing?.items || [],
    };

    await saveProject(payload);
    setShowProjectModal(false);
    setSelectedId(payload.id);
  };

  const handleDeleteProject = async (id: string) => {
    if (!canDelete) return;
    if (confirm("Delete this project and all its milestones/items?")) {
      await deleteProject(id);
      if (selectedId === id) setSelectedId(null);
    }
  };

  const togglePersonnel = (name: string) => {
    const current = projectDraft.assignedPersonnel || [];
    const next = current.includes(name)
      ? current.filter((n) => n !== name)
      : [...current, name];
    setProjectDraft({ ...projectDraft, assignedPersonnel: next });
  };

  // --- MILESTONES ---
  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !selectedProject || !msTitle.trim()) return;
    const ms: ProjectMilestone = {
      id: `ms-${Date.now()}`,
      title: msTitle.trim(),
      targetDate: msDate || "",
      owner: msOwner,
      status: "Pending",
    };
    const nextMs = [...(selectedProject.milestones || []), ms];
    const done = nextMs.filter((m) => m.status === "Completed").length;
    await saveProject({
      ...selectedProject,
      milestones: nextMs,
      progress: Math.round((done / nextMs.length) * 100),
    });
    setMsTitle("");
    setMsDate("");
  };

  const toggleMilestone = async (msId: string) => {
    if (!canEdit || !selectedProject) return;
    const nextMs: ProjectMilestone[] = (selectedProject.milestones || []).map(
      (m) =>
        m.id === msId
          ? {
              ...m,
              status: m.status === "Completed" ? "Pending" : "Completed",
            }
          : m
    );
    const done = nextMs.filter((m) => m.status === "Completed").length;
    await saveProject({
      ...selectedProject,
      milestones: nextMs,
      progress: nextMs.length ? Math.round((done / nextMs.length) * 100) : 0,
    });
  };

  const deleteMilestone = async (msId: string) => {
    if (!canEdit || !selectedProject) return;
    const nextMs = (selectedProject.milestones || []).filter(
      (m) => m.id !== msId
    );
    const done = nextMs.filter((m) => m.status === "Completed").length;
    await saveProject({
      ...selectedProject,
      milestones: nextMs,
      progress: nextMs.length ? Math.round((done / nextMs.length) * 100) : 0,
    });
  };

  // --- BLOCKERS & DEPENDENCIES ---
  const handleAddBlocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !selectedProject || !blockerTitle.trim()) return;
    const b: ProjectBlocker = {
      id: `blk-${Date.now()}`,
      title: blockerTitle.trim(),
      severity: blockerSeverity,
      resolved: false,
      createdAt: new Date().toISOString(),
    };
    await saveProject({
      ...selectedProject,
      blockers: [...(selectedProject.blockers || []), b],
    });
    setBlockerTitle("");
  };

  const toggleBlocker = async (bId: string) => {
    if (!canEdit || !selectedProject) return;
    const next = (selectedProject.blockers || []).map((b) =>
      b.id === bId ? { ...b, resolved: !b.resolved } : b
    );
    await saveProject({ ...selectedProject, blockers: next });
  };

  const handleAddDependency = async () => {
    if (!canEdit || !selectedProject || !depText.trim()) return;
    await saveProject({
      ...selectedProject,
      dependencies: [...(selectedProject.dependencies || []), depText.trim()],
    });
    setDepText("");
  };

  const removeDependency = async (idx: number) => {
    if (!canEdit || !selectedProject) return;
    await saveProject({
      ...selectedProject,
      dependencies: (selectedProject.dependencies || []).filter(
        (_, i) => i !== idx
      ),
    });
  };

  // --- MANAGEMENT DECISIONS ---
  const handleAddDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !selectedProject || !decTitle.trim()) return;
    const dec: ManagementDecision = {
      id: `dec-${Date.now()}`,
      title: decTitle.trim(),
      details: decDetails.trim(),
      status: "Pending",
      requestedAt: new Date().toISOString(),
    };
    await saveProject({
      ...selectedProject,
      decisionsRequired: [...(selectedProject.decisionsRequired || []), dec],
    });
    setDecTitle("");
    setDecDetails("");
  };

  const updateDecisionStatus = async (
    decId: string,
    status: ManagementDecision["status"]
  ) => {
    if (!canEdit || !selectedProject) return;
    const next = (selectedProject.decisionsRequired || []).map((d) =>
      d.id === decId
        ? {
            ...d,
            status,
            decidedAt:
              status !== "Pending" ? new Date().toISOString() : undefined,
          }
        : d
    );
    await saveProject({ ...selectedProject, decisionsRequired: next });
  };

  // --- PROCUREMENT ITEMS (PRESERVED) ---
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !selectedProject || !itemName.trim()) return;
    const newItem: ProjectItem = {
      id: `itm-${Math.random().toString(36).substr(2, 9)}`,
      name: itemName.trim(),
      category: itemCategory || "Other",
      estimatedCost: itemCost,
      quantity: itemQty,
      status: "Pending",
      dueDate: itemDue,
    };
    await saveProject({
      ...selectedProject,
      items: [...(selectedProject.items || []), newItem],
    });
    setItemName("");
    setItemCost(0);
    setItemQty(1);
    setItemDue("");
  };

  const updateItemStatus = async (
    itemId: string,
    status: ProjectItem["status"]
  ) => {
    if (!canEdit || !selectedProject) return;
    await saveProject({
      ...selectedProject,
      items: selectedProject.items.map((i) =>
        i.id === itemId ? { ...i, status } : i
      ),
    });
  };

  const deleteItem = async (itemId: string) => {
    if (!canEdit || !selectedProject) return;
    await saveProject({
      ...selectedProject,
      items: selectedProject.items.filter((i) => i.id !== itemId),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-[#172B4D] dark:text-[#E6EDF5]">
            Projects
          </h1>
          <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8]">
            Track active IT initiatives, milestones, blockers, procurement, and management decisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
          >
            <option value="All">All Statuses</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {canEdit && (
            <button
              onClick={openCreateModal}
              className="px-3.5 py-2 bg-[#0052CC] hover:bg-[#0043A8] text-white text-[13px] font-medium rounded flex items-center gap-1.5 transition-colors"
            >
              <Plus size={15} /> New Project
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Active Projects
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.active}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-500">
            Avg Progress
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.avgProgress}%
          </div>
        </div>
        <div
          className={`p-4 rounded-xl border ${
            metrics.openBlockers > 0
              ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
            Open Blockers
          </div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">
            {metrics.openBlockers}
          </div>
        </div>
        <div
          className={`p-4 rounded-xl border ${
            metrics.pendingDecisions > 0
              ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Awaiting Mgmt Decisions
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
            {metrics.pendingDecisions}
          </div>
        </div>
      </div>

      {/* Project Cards Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <FolderKanban
            size={36}
            className="mx-auto text-slate-300 dark:text-slate-600 mb-3"
          />
          <h3 className="font-semibold text-slate-800 dark:text-white">
            No IT Projects Yet
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create your first venue rollout, network upgrade, or POS migration project.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((p) => {
            const pct = computeProgress(p);
            const openBlockers = (p.blockers || []).filter(
              (b) => !b.resolved
            ).length;
            const pendingDecs = (p.decisionsRequired || []).filter(
              (d) => d.status === "Pending"
            ).length;
            const totalBudget = (p.items || []).reduce(
              (s, i) => s + (i.estimatedCost || 0) * (i.quantity || 1),
              0
            );

            return (
              <div
                key={p.id}
                onClick={() => {
                  setSelectedId(p.id);
                  setDetailTab("milestones");
                }}
                className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-blue-500 cursor-pointer transition-all shadow-sm flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[p.status]}`}
                    >
                      {p.status}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {pendingDecs > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          {pendingDecs} Decision{pendingDecs > 1 ? "s" : ""}
                        </span>
                      )}
                      {openBlockers > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                          {openBlockers} Blocker{openBlockers > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {p.name}
                  </h3>
                  {p.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Progress</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1">
                      <Users size={12} />{" "}
                      {(p.assignedPersonnel || [p.owner || "IT"]).join(", ")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {p.targetDate || "No date"}
                    </span>
                    {totalBudget > 0 && (
                      <span className="flex items-center gap-0.5 font-medium text-slate-700 dark:text-slate-300">
                        <DollarSign size={12} /> AED{" "}
                        {totalBudget.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {projectDraft.id ? "Edit Project" : "New IT Project"}
              </h3>
              <button
                onClick={() => setShowProjectModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Project Name *
                </label>
                <input
                  required
                  type="text"
                  value={projectDraft.name || ""}
                  onChange={(e) =>
                    setProjectDraft({ ...projectDraft, name: e.target.value })
                  }
                  placeholder="e.g. UniFi Wi-Fi 6 Upgrade — Phase 2 Venues"
                  className="w-full p-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Description / Scope
                </label>
                <textarea
                  rows={3}
                  value={projectDraft.description || ""}
                  onChange={(e) =>
                    setProjectDraft({
                      ...projectDraft,
                      description: e.target.value,
                    })
                  }
                  className="w-full p-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Venue / Scope
                  </label>
                  <select
                    value={projectDraft.venue || "Multi-Venue / All"}
                    onChange={(e) =>
                      setProjectDraft({ ...projectDraft, venue: e.target.value })
                    }
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  >
                    <option value="Multi-Venue / All">Multi-Venue / All</option>
                    {locations.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    value={projectDraft.targetDate || ""}
                    onChange={(e) =>
                      setProjectDraft({
                        ...projectDraft,
                        targetDate: e.target.value,
                      })
                    }
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Status
                  </label>
                  <select
                    value={projectDraft.status || "Planning"}
                    onChange={(e) =>
                      setProjectDraft({
                        ...projectDraft,
                        status: e.target.value as ProjectStatus,
                      })
                    }
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  >
                    {PROJECT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Assigned Personnel
                  </label>
                  <div className="flex gap-2 pt-1">
                    {IT_STAFF.map((member) => {
                      const active = (
                        projectDraft.assignedPersonnel || []
                      ).includes(member);
                      return (
                        <button
                          key={member}
                          type="button"
                          onClick={() => togglePersonnel(member)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            active
                              ? "bg-slate-900 dark:bg-blue-600 text-white border-transparent"
                              : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {member}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-slate-900 dark:bg-blue-600 text-white rounded-lg flex items-center gap-2"
                >
                  <Save size={15} /> Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedProject.name}
                  </h3>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[selectedProject.status]}`}
                  >
                    {selectedProject.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  <span className="flex items-center gap-1">
                    <Building2 size={13} />{" "}
                    {selectedProject.venue || "Multi-Venue / All"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={13} />{" "}
                    {(selectedProject.assignedPersonnel || ["Ryan"]).join(", ")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={13} /> Target:{" "}
                    {selectedProject.targetDate || "TBD"}
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {computeProgress(selectedProject)}% Complete
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {canEdit && (
                  <button
                    onClick={() => openEditModal(selectedProject)}
                    className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                    title="Edit Project"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDeleteProject(selectedProject.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="Delete Project"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  onClick={() => setSelectedId(null)}
                  className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 gap-6 text-sm overflow-x-auto">
              {[
                {
                  id: "milestones",
                  label: `Milestones (${(selectedProject.milestones || []).length})`,
                  icon: Flag,
                },
                {
                  id: "blockers",
                  label: `Blockers & Deps (${
                    (selectedProject.blockers || []).filter((b) => !b.resolved)
                      .length
                  })`,
                  icon: AlertTriangle,
                },
                {
                  id: "decisions",
                  label: `Mgmt Decisions (${
                    (selectedProject.decisionsRequired || []).filter(
                      (d) => d.status === "Pending"
                    ).length
                  })`,
                  icon: Scale,
                },
                {
                  id: "procurement",
                  label: `Procurement (${(selectedProject.items || []).length})`,
                  icon: ShoppingBag,
                },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setDetailTab(t.id as any)}
                    className={`py-3 border-b-2 font-medium flex items-center gap-2 whitespace-nowrap ${
                      detailTab === t.id
                        ? "border-slate-900 dark:border-blue-500 text-slate-900 dark:text-white"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Icon size={15} /> {t.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {detailTab === "milestones" && (
                <div className="space-y-4">
                  {canEdit && (
                    <form
                      onSubmit={handleAddMilestone}
                      className="flex flex-col sm:flex-row gap-2"
                    >
                      <input
                        type="text"
                        placeholder="Add milestone (e.g. Complete cabling at Dubai Mall)"
                        value={msTitle}
                        onChange={(e) => setMsTitle(e.target.value)}
                        className="flex-1 p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                      />
                      <input
                        type="date"
                        value={msDate}
                        onChange={(e) => setMsDate(e.target.value)}
                        className="p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                      />
                      <select
                        value={msOwner}
                        onChange={(e) => setMsOwner(e.target.value)}
                        className="p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                      >
                        {IT_STAFF.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-900 dark:bg-blue-600 text-white text-sm font-semibold rounded-lg"
                      >
                        Add
                      </button>
                    </form>
                  )}

                  {(selectedProject.milestones || []).length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                      No milestones yet. Adding milestones automatically tracks project progress %.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(selectedProject.milestones || []).map((m) => (
                        <div
                          key={m.id}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                        >
                          <button
                            disabled={!canEdit}
                            onClick={() => toggleMilestone(m.id)}
                            className="flex items-center gap-3 text-left flex-1"
                          >
                            {m.status === "Completed" ? (
                              <CheckCircle2
                                size={18}
                                className="text-emerald-500 shrink-0"
                              />
                            ) : (
                              <Circle
                                size={18}
                                className="text-slate-300 dark:text-slate-600 shrink-0"
                              />
                            )}
                            <div>
                              <div
                                className={`text-sm font-medium ${
                                  m.status === "Completed"
                                    ? "line-through text-slate-400"
                                    : "text-slate-900 dark:text-white"
                                }`}
                              >
                                {m.title}
                              </div>
                              <div className="text-xs text-slate-400">
                                {m.owner || "IT"} •{" "}
                                {m.targetDate || "No target date"}
                              </div>
                            </div>
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => deleteMilestone(m.id)}
                              className="text-slate-400 hover:text-red-500 p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {detailTab === "blockers" && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-white">
                      Active & Resolved Blockers
                    </h4>
                    {canEdit && (
                      <form
                        onSubmit={handleAddBlocker}
                        className="flex flex-col sm:flex-row gap-2"
                      >
                        <input
                          type="text"
                          placeholder="Log a blocker (e.g. Waiting for Etisalat fiber activation)"
                          value={blockerTitle}
                          onChange={(e) => setBlockerTitle(e.target.value)}
                          className="flex-1 p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                        />
                        <select
                          value={blockerSeverity}
                          onChange={(e) =>
                            setBlockerSeverity(e.target.value as any)
                          }
                          className="p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                        >
                          <option value="Critical">Critical</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg"
                        >
                          Add Blocker
                        </button>
                      </form>
                    )}
                    {(selectedProject.blockers || []).map((b) => (
                      <div
                        key={b.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                          b.resolved
                            ? "border-slate-200 dark:border-slate-800 opacity-60"
                            : "border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-900/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                            {b.severity}
                          </span>
                          <span
                            className={`text-sm ${
                              b.resolved ? "line-through text-slate-400" : ""
                            }`}
                          >
                            {b.title}
                          </span>
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => toggleBlocker(b.id)}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700"
                          >
                            {b.resolved ? "Reopen" : "Mark Resolved"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                      <GitBranch size={15} /> Dependencies
                    </h4>
                    {canEdit && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add dependency (e.g. Landlord ceiling access approval)"
                          value={depText}
                          onChange={(e) => setDepText(e.target.value)}
                          className="flex-1 p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                        />
                        <button
                          type="button"
                          onClick={handleAddDependency}
                          className="px-4 py-2 bg-slate-900 dark:bg-blue-600 text-white text-sm font-semibold rounded-lg"
                        >
                          Add
                        </button>
                      </div>
                    )}
                    <ul className="space-y-1.5">
                      {(selectedProject.dependencies || []).map((dep, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                        >
                          <span>• {dep}</span>
                          {canEdit && (
                            <button
                              onClick={() => removeDependency(idx)}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {detailTab === "decisions" && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Items logged here are surfaced directly on the{" "}
                    <strong>Executive Management Dashboard</strong> for leadership sign-off.
                  </p>
                  {canEdit && (
                    <form onSubmit={handleAddDecision} className="space-y-2">
                      <input
                        type="text"
                        placeholder="Decision required (e.g. Approve AED 18,000 Fortinet HA firewall quote)"
                        value={decTitle}
                        onChange={(e) => setDecTitle(e.target.value)}
                        className="w-full p-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Context / options / cost impact (optional)"
                          value={decDetails}
                          onChange={(e) => setDecDetails(e.target.value)}
                          className="flex-1 p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg"
                        >
                          Flag for Mgmt
                        </button>
                      </div>
                    </form>
                  )}

                  {(selectedProject.decisionsRequired || []).length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                      No management decisions pending for this project.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {(selectedProject.decisionsRequired || []).map((d) => (
                        <div
                          key={d.id}
                          className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="font-semibold text-sm text-slate-900 dark:text-white">
                              {d.title}
                            </div>
                            {d.details && (
                              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                {d.details}
                              </div>
                            )}
                          </div>
                          <select
                            disabled={!canEdit}
                            value={d.status}
                            onChange={(e) =>
                              updateDecisionStatus(d.id, e.target.value as any)
                            }
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          >
                            <option value="Pending">Pending Decision</option>
                            <option value="Approved">Approved</option>
                            <option value="Deferred">Deferred</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {detailTab === "procurement" && (
                <div className="space-y-4">
                  {canEdit && (
                    <form
                      onSubmit={handleAddItem}
                      className="grid grid-cols-1 sm:grid-cols-6 gap-2"
                    >
                      <input
                        type="text"
                        placeholder="Item name"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        className="sm:col-span-2 p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                      />
                      <select
                        value={itemCategory}
                        onChange={(e) => setItemCategory(e.target.value)}
                        className="p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        placeholder="Cost AED"
                        value={itemCost || ""}
                        onChange={(e) => setItemCost(Number(e.target.value))}
                        className="p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                      />
                      <input
                        type="date"
                        value={itemDue}
                        onChange={(e) => setItemDue(e.target.value)}
                        className="p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                      />
                      <button
                        type="submit"
                        className="px-3 py-2 bg-slate-900 dark:bg-blue-600 text-white text-sm font-semibold rounded-lg"
                      >
                        Add Item
                      </button>
                    </form>
                  )}

                  {(selectedProject.items || []).length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                      No procurement items attached to this project.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      {selectedProject.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="font-semibold text-sm text-slate-900 dark:text-white">
                              {item.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {item.category} • AED{" "}
                              {(item.estimatedCost || 0).toLocaleString()} ×{" "}
                              {item.quantity || 1} • Due:{" "}
                              {item.dueDate || "TBD"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              disabled={!canEdit}
                              value={item.status}
                              onChange={(e) =>
                                updateItemStatus(item.id, e.target.value as any)
                              }
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Ordered">Ordered</option>
                              <option value="Received">Received</option>
                            </select>
                            {canEdit && (
                              <button
                                onClick={() => deleteItem(item.id)}
                                className="text-slate-400 hover:text-red-500 p-1"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Planner;
