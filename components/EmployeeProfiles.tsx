import React, { useState, useEffect, useMemo } from "react";
import {
  Asset,
  EmployeeITProfile,
  EmployeeITStatus,
  HandoverDocument,
  ITChecklistItem,
} from "../types";
import {
  listenToEmployees,
  saveEmployeeProfile,
  deleteEmployeeProfile,
  syncEmployeesFromAssets,
  DEFAULT_ONBOARDING_CHECKLIST,
  DEFAULT_ACCESS_CHECKLIST,
  DEFAULT_OFFBOARDING_CHECKLIST,
  getHandoverDocuments,
  getAppConfig,
  getCurrentUserProfile,
  canManageOperations,
  isAdminRole,
} from "../services/storageService";
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  CheckCircle2,
  Circle,
  Laptop,
  ShieldCheck,
  UserMinus,
  History,
  X,
  Plus,
  Trash2,
  Building2,
  Mail,
  Briefcase,
  AlertTriangle,
  FileText,
  Save,
  CheckSquare,
} from "lucide-react";

interface EmployeeProfilesProps {
  assets: Asset[];
  onStartHandover?: (employeeName: string, mode: "onboard" | "offboard") => void;
}

const STATUS_STYLES: Record<EmployeeITStatus, string> = {
  Active:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/40",
  Onboarding:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/40",
  Offboarding:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/40",
  Offboarded:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

const EmployeeProfiles: React.FC<EmployeeProfilesProps> = ({
  assets,
  onStartHandover,
}) => {
  const [employees, setEmployees] = useState<EmployeeITProfile[]>([]);
  const [documents, setDocuments] = useState<HandoverDocument[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | EmployeeITStatus>("All");
  const [syncing, setSyncing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  // Selected profile drawer/modal
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "onboarding" | "offboarding" | "history"
  >("overview");
  const [newCheckItem, setNewCheckItem] = useState("");

  // Create / Edit Profile Modal
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Partial<EmployeeITProfile>>({
    name: "",
    email: "",
    jobTitle: "",
    department: "",
    location: "",
    status: "Onboarding",
    startDate: "",
    lastWorkingDay: "",
    notes: "",
  });

  const user = getCurrentUserProfile();
  const canEdit = canManageOperations(user);
  const isAdmin = isAdminRole(user);

  useEffect(() => {
    const unsub = listenToEmployees((data) => {
      setEmployees(data);
      setLoading(false);
    });
    getHandoverDocuments().then(setDocuments).catch(() => {});
    getAppConfig()
      .then((c) => {
        setLocations(c.locations || []);
        setDepartments(c.departments || []);
      })
      .catch(() => {});
    return () => unsub();
  }, []);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedId) || null,
    [employees, selectedId]
  );

  const assetsByEmployee = useMemo(() => {
    const map = new Map<string, Asset[]>();
    assets.forEach((a) => {
      const key = a.assignedEmployee?.trim().toLowerCase();
      if (!key) return;
      const list = map.get(key) || [];
      list.push(a);
      map.set(key, list);
    });
    return map;
  }, [assets]);

  const getEmployeeAssets = (name: string) =>
    assetsByEmployee.get(name.trim().toLowerCase()) || [];

  const getEmployeeDocs = (name: string) =>
    documents.filter(
      (d) => d.employeeName.trim().toLowerCase() === name.trim().toLowerCase()
    );

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const matchesStatus = statusFilter === "All" || e.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        (e.email || "").toLowerCase().includes(q) ||
        (e.department || "").toLowerCase().includes(q) ||
        (e.location || "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [employees, search, statusFilter]);

  const stats = useMemo(() => {
    const onboarding = employees.filter((e) => e.status === "Onboarding").length;
    const offboarding = employees.filter((e) => e.status === "Offboarding").length;
    const pendingReturns = employees.filter(
      (e) =>
        (e.status === "Offboarding" || e.status === "Offboarded") &&
        (!e.assetReturnConfirmed || getEmployeeAssets(e.name).length > 0)
    ).length;
    return { total: employees.length, onboarding, offboarding, pendingReturns };
  }, [employees, assetsByEmployee]);

  const flash = (msg: string) => {
    setBanner(msg);
    setTimeout(() => setBanner(null), 4000);
  };

  const handleSyncFromAssets = async () => {
    if (!canEdit) return;
    setSyncing(true);
    try {
      const created = await syncEmployeesFromAssets(assets, employees);
      flash(
        created > 0
          ? `Imported ${created} employee IT profile${created > 1 ? "s" : ""} from assigned assets.`
          : "All employees with assigned assets already have IT profiles."
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingProfile({
      name: "",
      email: "",
      jobTitle: "",
      department: departments[0] || "",
      location: locations[0] || "",
      status: "Onboarding",
      startDate: new Date().toISOString().split("T")[0],
      lastWorkingDay: "",
      notes: "",
    });
    setShowForm(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !editingProfile.name?.trim()) return;

    const existing = editingProfile.id
      ? employees.find((emp) => emp.id === editingProfile.id)
      : undefined;

    const payload: EmployeeITProfile = {
      id: existing?.id || "",
      name: editingProfile.name.trim(),
      email: editingProfile.email?.trim() || "",
      jobTitle: editingProfile.jobTitle?.trim() || "",
      department: editingProfile.department || "",
      location: editingProfile.location || "",
      status: (editingProfile.status as EmployeeITStatus) || "Active",
      startDate: editingProfile.startDate || "",
      lastWorkingDay: editingProfile.lastWorkingDay || "",
      notes: editingProfile.notes || "",
      assetReturnConfirmed: existing?.assetReturnConfirmed || false,
      assetReturnConfirmedAt: existing?.assetReturnConfirmedAt,
      assetReturnConfirmedBy: existing?.assetReturnConfirmedBy,
      onboardingChecklist:
        existing?.onboardingChecklist || DEFAULT_ONBOARDING_CHECKLIST(),
      accessChecklist: existing?.accessChecklist || DEFAULT_ACCESS_CHECKLIST(),
      offboardingChecklist:
        existing?.offboardingChecklist || DEFAULT_OFFBOARDING_CHECKLIST(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const savedId = await saveEmployeeProfile(payload);
    setShowForm(false);
    setSelectedId(savedId);
    flash(`Saved IT profile for ${payload.name}.`);
  };

  const toggleChecklist = async (
    emp: EmployeeITProfile,
    listKey: "onboardingChecklist" | "accessChecklist" | "offboardingChecklist",
    itemId: string
  ) => {
    if (!canEdit) return;
    const now = new Date().toISOString();
    const performer = user?.displayName || user?.email || "IT";
    const updatedList = (emp[listKey] || []).map((item) =>
      item.id === itemId
        ? {
            ...item,
            done: !item.done,
            completedBy: !item.done ? performer : undefined,
            completedAt: !item.done ? now : undefined,
          }
        : item
    );
    await saveEmployeeProfile({ ...emp, [listKey]: updatedList });
  };

  const addChecklistItem = async (
    emp: EmployeeITProfile,
    listKey: "onboardingChecklist" | "accessChecklist" | "offboardingChecklist"
  ) => {
    if (!canEdit || !newCheckItem.trim()) return;
    const item: ITChecklistItem = {
      id: `chk-${Date.now()}`,
      label: newCheckItem.trim(),
      done: false,
    };
    await saveEmployeeProfile({
      ...emp,
      [listKey]: [...(emp[listKey] || []), item],
    });
    setNewCheckItem("");
  };

  const handleConfirmAssetReturn = async (emp: EmployeeITProfile) => {
    if (!canEdit) return;
    const assigned = getEmployeeAssets(emp.name);
    if (
      assigned.length > 0 &&
      !confirm(
        `${emp.name} still has ${assigned.length} active asset(s) assigned in the registry. Confirm return anyway?`
      )
    ) {
      return;
    }
    await saveEmployeeProfile({
      ...emp,
      assetReturnConfirmed: true,
      assetReturnConfirmedAt: new Date().toISOString(),
      assetReturnConfirmedBy: user?.email || "IT",
      status: emp.status === "Offboarding" ? "Offboarded" : emp.status,
    });
    flash(`Asset return confirmed for ${emp.name}.`);
  };

  const handleStatusChange = async (
    emp: EmployeeITProfile,
    newStatus: EmployeeITStatus
  ) => {
    if (!canEdit) return;
    await saveEmployeeProfile({ ...emp, status: newStatus });
  };

  const handleDelete = async (emp: EmployeeITProfile) => {
    if (!isAdmin) return;
    if (!confirm(`Delete IT profile for ${emp.name}? Assigned assets will not be deleted.`)) {
      return;
    }
    await deleteEmployeeProfile(emp.id);
    if (selectedId === emp.id) setSelectedId(null);
  };

  const checklistProgress = (items: ITChecklistItem[] = []) => {
    if (items.length === 0) return 0;
    return Math.round((items.filter((i) => i.done).length / items.length) * 100);
  };

  return (
    <div className="space-y-6">
      {banner && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>{banner}</span>
          <button onClick={() => setBanner(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            IT Profiles
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats.total}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Onboarding
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats.onboarding}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Offboarding
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats.offboarding}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
            Pending Returns
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats.pendingReturns}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search employee, email, venue, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-blue-600"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Onboarding">Onboarding</option>
            <option value="Offboarding">Offboarding</option>
            <option value="Offboarded">Offboarded</option>
          </select>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncFromAssets}
              disabled={syncing}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
              title="Import employees found in Asset Registry"
            >
              <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Sync from Assets</span>
            </button>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-black dark:hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <UserPlus size={16} /> New IT Profile
            </button>
          </div>
        )}
      </div>

      {/* Main Directory Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading employee IT profiles...</div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Users size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="font-semibold text-slate-800 dark:text-white">
            No Employee IT Profiles Found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Create an IT profile for onboarding/offboarding checklists, or click{" "}
            <strong>Sync from Assets</strong> to auto-create profiles from your existing asset assignments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => {
            const empAssets = getEmployeeAssets(emp.name);
            const obPct = checklistProgress(emp.onboardingChecklist);
            const offPct = checklistProgress(emp.offboardingChecklist);
            return (
              <div
                key={emp.id}
                onClick={() => {
                  setSelectedId(emp.id);
                  setActiveTab("overview");
                }}
                className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-blue-500 cursor-pointer transition-all shadow-sm flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white truncate">
                      {emp.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {[emp.jobTitle, emp.department, emp.location]
                        .filter(Boolean)
                        .join(" • ") || "No venue/department set"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[emp.status]}`}
                  >
                    {emp.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Laptop size={14} className="text-slate-400" />
                    <span>
                      {empAssets.length} assigned device{empAssets.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="text-slate-400">
                    {emp.status === "Offboarding" || emp.status === "Offboarded"
                      ? `Offboarding ${offPct}%`
                      : `Onboarding ${obPct}%`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingProfile.id ? "Edit Employee IT Profile" : "New Employee IT Profile"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Lightweight IT profile for hardware assignments, access provisioning, and onboarding/offboarding checklists (HR records remain in Bayzat).
            </p>
            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={editingProfile.name || ""}
                    onChange={(e) =>
                      setEditingProfile({ ...editingProfile, name: e.target.value })
                    }
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Work Email
                  </label>
                  <input
                    type="email"
                    value={editingProfile.email || ""}
                    onChange={(e) =>
                      setEditingProfile({ ...editingProfile, email: e.target.value })
                    }
                    placeholder="name@eatx.com"
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Venue / Location
                  </label>
                  <select
                    value={editingProfile.location || ""}
                    onChange={(e) =>
                      setEditingProfile({ ...editingProfile, location: e.target.value })
                    }
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  >
                    <option value="">Select Location</option>
                    {locations.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    value={editingProfile.department || ""}
                    onChange={(e) =>
                      setEditingProfile({ ...editingProfile, department: e.target.value })
                    }
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    IT Status
                  </label>
                  <select
                    value={editingProfile.status || "Onboarding"}
                    onChange={(e) =>
                      setEditingProfile({
                        ...editingProfile,
                        status: e.target.value as EmployeeITStatus,
                      })
                    }
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  >
                    <option value="Onboarding">Onboarding</option>
                    <option value="Active">Active</option>
                    <option value="Offboarding">Offboarding</option>
                    <option value="Offboarded">Offboarded</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editingProfile.startDate || ""}
                    onChange={(e) =>
                      setEditingProfile({ ...editingProfile, startDate: e.target.value })
                    }
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Last Working Day
                  </label>
                  <input
                    type="date"
                    value={editingProfile.lastWorkingDay || ""}
                    onChange={(e) =>
                      setEditingProfile({
                        ...editingProfile,
                        lastWorkingDay: e.target.value,
                      })
                    }
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-slate-900 dark:bg-blue-600 text-white rounded-lg hover:bg-black dark:hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save size={15} /> Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedEmployee.name}
                  </h3>
                  <select
                    disabled={!canEdit}
                    value={selectedEmployee.status}
                    onChange={(e) =>
                      handleStatusChange(
                        selectedEmployee,
                        e.target.value as EmployeeITStatus
                      )
                    }
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border outline-none ${STATUS_STYLES[selectedEmployee.status]}`}
                  >
                    <option value="Onboarding">Onboarding</option>
                    <option value="Active">Active</option>
                    <option value="Offboarding">Offboarding</option>
                    <option value="Offboarded">Offboarded</option>
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {selectedEmployee.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={13} /> {selectedEmployee.email}
                    </span>
                  )}
                  {selectedEmployee.location && (
                    <span className="flex items-center gap-1">
                      <Building2 size={13} /> {selectedEmployee.location}
                    </span>
                  )}
                  {selectedEmployee.department && (
                    <span className="flex items-center gap-1">
                      <Briefcase size={13} /> {selectedEmployee.department}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(selectedEmployee)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="Delete IT Profile"
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
                { id: "overview", label: "Assigned Assets", icon: Laptop },
                { id: "onboarding", label: "Onboarding & Access", icon: ShieldCheck },
                { id: "offboarding", label: "Offboarding & Return", icon: UserMinus },
                { id: "history", label: "Asset History", icon: History },
              ].map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`py-3 border-b-2 font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
                      active
                        ? "border-slate-900 dark:border-blue-500 text-slate-900 dark:text-white"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Icon size={15} /> {t.label}
                  </button>
                );
              })}
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-6">
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-800 dark:text-white text-sm">
                      Currently Assigned Hardware ({getEmployeeAssets(selectedEmployee.name).length})
                    </h4>
                    {canEdit && onStartHandover && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedId(null);
                            onStartHandover(selectedEmployee.name, "onboard");
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 text-white font-medium"
                        >
                          + Assign / Handover
                        </button>
                        <button
                          onClick={() => {
                            setSelectedId(null);
                            onStartHandover(selectedEmployee.name, "offboard");
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium"
                        >
                          Return / Transfer
                        </button>
                      </div>
                    )}
                  </div>

                  {getEmployeeAssets(selectedEmployee.name).length === 0 ? (
                    <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-sm text-slate-400">
                      No hardware currently assigned to {selectedEmployee.name}.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      {getEmployeeAssets(selectedEmployee.name).map((a) => (
                        <div
                          key={a.id}
                          className="p-3.5 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/40"
                        >
                          <div>
                            <div className="font-semibold text-sm text-slate-900 dark:text-white">
                              {a.name}{" "}
                              {a.assetTag && (
                                <span className="ml-1 text-xs font-mono text-blue-600 dark:text-blue-400">
                                  [{a.assetTag}]
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {a.category} • SN: {a.serialNumber || "N/A"} • {a.location}
                            </div>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 font-medium">
                            {a.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "onboarding" && (
                <div className="space-y-6">
                  {(
                    [
                      {
                        key: "onboardingChecklist",
                        title: "Onboarding Checklist",
                        items: selectedEmployee.onboardingChecklist || [],
                      },
                      {
                        key: "accessChecklist",
                        title: "Access Provisioning Checklist",
                        items: selectedEmployee.accessChecklist || [],
                      },
                    ] as const
                  ).map((section) => (
                    <div key={section.key} className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                          <CheckSquare size={15} className="text-blue-500" />
                          {section.title}
                        </h4>
                        <span className="text-xs font-semibold text-slate-500">
                          {checklistProgress(section.items)}% Complete
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {section.items.map((item) => (
                          <button
                            key={item.id}
                            disabled={!canEdit}
                            onClick={() =>
                              toggleChecklist(selectedEmployee, section.key, item.id)
                            }
                            className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-start gap-3 transition-colors"
                          >
                            {item.done ? (
                              <CheckCircle2
                                size={18}
                                className="text-emerald-500 shrink-0 mt-0.5"
                              />
                            ) : (
                              <Circle
                                size={18}
                                className="text-slate-300 dark:text-slate-600 shrink-0 mt-0.5"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div
                                className={`text-sm ${
                                  item.done
                                    ? "line-through text-slate-400"
                                    : "text-slate-800 dark:text-slate-200 font-medium"
                                }`}
                              >
                                {item.label}
                              </div>
                              {item.completedBy && (
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  Completed by {item.completedBy}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {canEdit && (
                    <div className="flex gap-2 pt-2">
                      <input
                        type="text"
                        placeholder="Add custom onboarding step..."
                        value={newCheckItem}
                        onChange={(e) => setNewCheckItem(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                      />
                      <button
                        onClick={() =>
                          addChecklistItem(selectedEmployee, "onboardingChecklist")
                        }
                        className="px-3 py-2 text-sm bg-slate-900 dark:bg-blue-600 text-white rounded-lg flex items-center gap-1"
                      >
                        <Plus size={15} /> Add
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "offboarding" && (
                <div className="space-y-5">
                  {/* Asset Return Confirmation Card */}
                  <div
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      selectedEmployee.assetReturnConfirmed
                        ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                        : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {selectedEmployee.assetReturnConfirmed ? (
                        <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />
                      ) : (
                        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                      )}
                      <div>
                        <div className="font-semibold text-sm text-slate-900 dark:text-white">
                          {selectedEmployee.assetReturnConfirmed
                            ? "All IT Assets Return Confirmed"
                            : "Asset Return Confirmation Pending"}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          {selectedEmployee.assetReturnConfirmed
                            ? `Confirmed by ${selectedEmployee.assetReturnConfirmedBy} on ${new Date(
                                selectedEmployee.assetReturnConfirmedAt || ""
                              ).toLocaleDateString()}`
                            : `${getEmployeeAssets(selectedEmployee.name).length} active device(s) still assigned in registry.`}
                        </div>
                      </div>
                    </div>
                    {canEdit && !selectedEmployee.assetReturnConfirmed && (
                      <button
                        onClick={() => handleConfirmAssetReturn(selectedEmployee)}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-black shrink-0"
                      >
                        Confirm Asset Return
                      </button>
                    )}
                  </div>

                  {/* Offboarding Checklist */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm text-slate-800 dark:text-white">
                        Offboarding Checklist
                      </h4>
                      <span className="text-xs font-semibold text-slate-500">
                        {checklistProgress(selectedEmployee.offboardingChecklist)}% Complete
                      </span>
                    </div>
                    {(selectedEmployee.offboardingChecklist || []).map((item) => (
                      <button
                        key={item.id}
                        disabled={!canEdit}
                        onClick={() =>
                          toggleChecklist(
                            selectedEmployee,
                            "offboardingChecklist",
                            item.id
                          )
                        }
                        className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-start gap-3 transition-colors"
                      >
                        {item.done ? (
                          <CheckCircle2
                            size={18}
                            className="text-emerald-500 shrink-0 mt-0.5"
                          />
                        ) : (
                          <Circle
                            size={18}
                            className="text-slate-300 dark:text-slate-600 shrink-0 mt-0.5"
                          />
                        )}
                        <div className="flex-1">
                          <div
                            className={`text-sm ${
                              item.done
                                ? "line-through text-slate-400"
                                : "text-slate-800 dark:text-slate-200 font-medium"
                            }`}
                          >
                            {item.label}
                          </div>
                          {item.completedBy && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Completed by {item.completedBy}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-slate-800 dark:text-white">
                    Handover, Return & Transfer History
                  </h4>
                  {getEmployeeDocs(selectedEmployee.name).length === 0 ? (
                    <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-sm text-slate-400">
                      No signed handover or return records yet for {selectedEmployee.name}.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {getEmployeeDocs(selectedEmployee.name).map((doc) => (
                        <div
                          key={doc.id}
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white">
                              <FileText size={15} className="text-blue-500" />
                              {doc.type} Record
                            </div>
                            <span className="text-xs text-slate-500">
                              {new Date(doc.date).toLocaleDateString()}
                            </span>
                          </div>
                          <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                            {doc.assets.map((a) => (
                              <li key={a.id}>
                                • {a.name} (SN: {a.serialNumber || "N/A"})
                              </li>
                            ))}
                          </ul>
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

export default EmployeeProfiles;
