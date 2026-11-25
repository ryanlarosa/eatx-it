import React, { useState, useEffect, useMemo } from "react";
import {
  getAppConfig,
  saveAppConfig,
  getAssets,
  getCurrentUserProfile,
  getAllUsers,
  updateUserRole,
  adminCreateUser,
  resetDatabase,
  renameMasterDataItem,
  getSandboxStatus,
  setSandboxMode,
  getEmailConfig,
  saveEmailConfig,
  sendSystemEmail,
} from "../services/storageService";
import { AppConfig, UserProfile, UserRole, EmailConfig } from "../types";
import {
  Plus,
  X,
  Shield,
  Loader2,
  Check,
  Lock,
  AlertTriangle,
  Trash2,
  Edit2,
  Save,
  Send,
  Search,
  RefreshCw,
} from "lucide-react";

type SettingsTab = "users" | "master" | "email" | "environment";
type MasterTab = "location" | "category" | "department";

const ROLE_LABELS: Record<string, string> = {
  admin: "IT Admin",
  technician: "IT Support",
  management: "Management",
  viewer: "Viewer",
  requester: "Portal Requester",
  vendor: "Vendor",
  sandbox_user: "Sandbox User",
};

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("users");
  const [masterTab, setMasterTab] = useState<MasterTab>("location");
  const [masterSearch, setMasterSearch] = useState("");

  const [config, setConfig] = useState<AppConfig>({
    categories: [],
    locations: [],
    departments: [],
  });
  const [newItemVal, setNewItemVal] = useState("");

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    serviceId: "",
    templateId: "",
    confirmationTemplateId: "",
    publicKey: "",
    targetEmail: "",
    enabled: false,
  });
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPass, setNewUserPass] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("management");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const [checkingItem, setCheckingItem] = useState<string | null>(null);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: "category" | "location" | "department" | "reset" | null;
    value: string;
  }>({ isOpen: false, type: null, value: "" });

  const [editState, setEditState] = useState<{
    isOpen: boolean;
    type: "category" | "location" | "department" | null;
    oldValue: string;
    newValue: string;
    isProcessing: boolean;
  }>({
    isOpen: false,
    type: null,
    oldValue: "",
    newValue: "",
    isProcessing: false,
  });

  const isSandbox = getSandboxStatus();
  const currentUser = getCurrentUserProfile();
  const isAdmin = currentUser?.role === "admin";
  const isSandboxUser = currentUser?.role === "sandbox_user";

  useEffect(() => {
    const init = async () => {
      setConfig(await getAppConfig());
      const mailConf = await getEmailConfig();
      if (mailConf) setEmailConfig(mailConf);
      if (isAdmin) refreshUsers();
    };
    init();
  }, [isAdmin]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 5000);
  };

  const refreshUsers = async () => {
    setIsLoadingUsers(true);
    try {
      setUsers(await getAllUsers());
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    try {
      await updateUserRole(uid, newRole);
      setUsers(users.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)));
      showSuccess(`User role updated to ${ROLE_LABELS[newRole] || newRole}.`);
    } catch {
      showError("Failed to update role.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPass) return;
    if (newUserPass.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }

    setIsCreatingUser(true);
    setErrorMsg("");
    try {
      await adminCreateUser(newUserEmail, newUserPass, newUserRole);
      setNewUserEmail("");
      setNewUserPass("");
      await refreshUsers();
      showSuccess(`Account created for ${newUserEmail}.`);
    } catch (e: any) {
      if (e.code === "auth/email-already-in-use") {
        showError("Email already exists.");
      } else {
        showError("Failed to create user. " + e.message);
      }
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleSaveEmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEmail(true);
    try {
      await saveEmailConfig(emailConfig);
      showSuccess("Email configuration saved.");
    } catch {
      showError("Failed to save email settings.");
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleTestEmail = async () => {
    if (
      !emailConfig.enabled ||
      !emailConfig.serviceId ||
      !emailConfig.publicKey ||
      !emailConfig.templateId
    ) {
      showError("Complete all EmailJS fields and enable automation first.");
      return;
    }
    setIsTestingEmail(true);
    try {
      await saveEmailConfig(emailConfig);
      await sendSystemEmail(
        "EATX IT: Integration Test (Alert)",
        "This is a test alert from EATX IT Management.",
        window.location.origin
      );
      if (emailConfig.confirmationTemplateId) {
        await sendSystemEmail(
          "EATX IT: Integration Test (Staff Confirmation)",
          "This confirms staff ticket receipt emails are active.",
          window.location.origin,
          emailConfig.targetEmail,
          true
        );
      }
      showSuccess(`Test sent to ${emailConfig.targetEmail}.`);
    } catch {
      showError("Dispatch failed. Check console for EmailJS logs.");
    } finally {
      setIsTestingEmail(false);
    }
  };

  const currentMasterItems = useMemo(() => {
    const list =
      masterTab === "location"
        ? config.locations || []
        : masterTab === "category"
        ? config.categories || []
        : config.departments || [];
    const q = masterSearch.trim().toLowerCase();
    return q ? list.filter((i) => i.toLowerCase().includes(q)) : list;
  }, [config, masterTab, masterSearch]);

  const handleAddMasterItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = newItemVal.trim();
    if (!val) return;
    const updated = { ...config };
    if (masterTab === "location") {
      if (updated.locations.includes(val)) return;
      updated.locations = [...updated.locations, val].sort((a, b) =>
        a.localeCompare(b)
      );
    } else if (masterTab === "category") {
      if (updated.categories.includes(val)) return;
      updated.categories = [...updated.categories, val].sort((a, b) =>
        a.localeCompare(b)
      );
    } else {
      const depts = updated.departments || [];
      if (depts.includes(val)) return;
      updated.departments = [...depts, val].sort((a, b) => a.localeCompare(b));
    }
    setConfig(updated);
    await saveAppConfig(updated);
    setNewItemVal("");
    showSuccess(`Added "${val}".`);
  };

  const requestDeleteMasterItem = async (val: string) => {
    setCheckingItem(val);
    try {
      const assets = await getAssets();
      const linked = assets.some((a) =>
        masterTab === "location"
          ? a.location === val
          : masterTab === "category"
          ? a.category === val
          : a.department === val
      );
      if (linked) {
        showError(`Cannot delete "${val}": currently assigned to active assets.`);
        return;
      }
      setDeleteConfirmation({ isOpen: true, type: masterTab, value: val });
    } catch {
      showError("Failed to verify linked assets.");
    } finally {
      setCheckingItem(null);
    }
  };

  const confirmDelete = async () => {
    const { type, value } = deleteConfirmation;
    if (type === "reset") {
      await resetDatabase();
      showSuccess("Database has been reset.");
      setDeleteConfirmation({ isOpen: false, type: null, value: "" });
      return;
    }
    if (!type || !value) return;
    const updated = { ...config };
    if (type === "category")
      updated.categories = config.categories.filter((c) => c !== value);
    if (type === "location")
      updated.locations = config.locations.filter((l) => l !== value);
    if (type === "department")
      updated.departments = (config.departments || []).filter(
        (d) => d !== value
      );

    setConfig(updated);
    await saveAppConfig(updated);
    setDeleteConfirmation({ isOpen: false, type: null, value: "" });
    showSuccess(`Removed "${value}".`);
  };

  const confirmEdit = async () => {
    const { type, oldValue, newValue } = editState;
    if (!type || !newValue.trim() || oldValue === newValue) {
      setEditState((prev) => ({ ...prev, isOpen: false }));
      return;
    }
    setEditState((prev) => ({ ...prev, isProcessing: true }));
    try {
      await renameMasterDataItem(type, oldValue, newValue.trim());
      const updated = { ...config };
      if (type === "category")
        updated.categories = config.categories.map((c) =>
          c === oldValue ? newValue.trim() : c
        );
      if (type === "location")
        updated.locations = config.locations.map((l) =>
          l === oldValue ? newValue.trim() : l
        );
      if (type === "department")
        updated.departments = (config.departments || []).map((d) =>
          d === oldValue ? newValue.trim() : d
        );
      setConfig(updated);
      showSuccess(`Renamed to "${newValue.trim()}" and updated linked assets.`);
      setEditState((prev) => ({ ...prev, isOpen: false }));
    } catch {
      showError("Failed to rename item.");
    } finally {
      setEditState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-[#C1C7D0] dark:border-[#2E3A4D] rounded text-[13px] bg-white dark:bg-[#0F141C] text-[#172B4D] dark:text-[#E6EDF5] focus:border-[#0052CC] outline-none transition-colors";
  const labelClass =
    "block text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1";

  if (!isAdmin && !isSandboxUser) {
    return (
      <div className="p-10 text-center bg-white dark:bg-[#161C26] rounded border border-[#DFE3E8] dark:border-[#242E40]">
        <Shield className="mx-auto text-[#DE350B] mb-3" size={36} />
        <h2 className="text-[16px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
          Access Denied
        </h2>
        <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8] mt-1">
          Only IT Administrators can access system settings.
        </p>
      </div>
    );
  }

  if (isSandboxUser) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-[20px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
            Settings
          </h1>
          <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8]">
            Environment status
          </p>
        </div>
        <div className="bg-white dark:bg-[#161C26] p-5 rounded border border-[#DFE3E8] dark:border-[#242E40] flex items-center gap-3 text-[13px]">
          <Lock size={18} className="text-[#D97706] shrink-0" />
          <span>
            Your account is restricted to Sandbox Mode and cannot modify
            production settings.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-[#172B4D] dark:text-[#E6EDF5]">
            Settings
          </h1>
          <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8]">
            Manage user access, master data lists, email alerts, and database
            environment.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#00875A] dark:text-[#36B37E] bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-900/40 w-fit">
          <Check size={13} /> {isSandbox ? "Sandbox Connected" : "Production Connected"}
        </div>
      </div>

      {/* Top-Level Enterprise Tabs */}
      <div className="border-b border-[#DFE3E8] dark:border-[#242E40] flex items-center gap-6 text-[13px] overflow-x-auto">
        {(
          [
            { id: "users", label: `Users & Roles (${users.length})` },
            {
              id: "master",
              label: `Master Data (${
                config.locations.length +
                config.categories.length +
                (config.departments?.length || 0)
              })`,
            },
            { id: "email", label: "Email & Alerts" },
            { id: "environment", label: "Environment & Reset" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-2.5 border-b-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === t.id
                ? "border-[#0052CC] text-[#0052CC] dark:text-[#4C9AFF] dark:border-[#4C9AFF]"
                : "border-transparent text-[#5E6C84] dark:text-[#94A3B8] hover:text-[#172B4D] dark:hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: USERS & ROLES */}
      {activeTab === "users" && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-[#EBECF0] dark:border-[#242E40] bg-[#F9FAFB] dark:bg-[#1B2230]">
              <h2 className="text-[13px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
                Create user account
              </h2>
            </div>
            <form
              onSubmit={handleCreateUser}
              className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
            >
              <div className="md:col-span-4">
                <label className={labelClass}>Email address</label>
                <input
                  type="email"
                  required
                  placeholder="name@eatx.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-3">
                <label className={labelClass}>Temporary password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newUserPass}
                  onChange={(e) => setNewUserPass(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-3">
                <label className={labelClass}>Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className={inputClass}
                >
                  <option value="management">Management (Read-Only)</option>
                  <option value="technician">IT Support (Technician)</option>
                  <option value="admin">IT Admin</option>
                  <option value="requester">Portal Requester</option>
                  <option value="sandbox_user">Sandbox User</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <button
                  disabled={isCreatingUser}
                  type="submit"
                  className="w-full h-[38px] bg-[#0052CC] hover:bg-[#0043A8] text-white rounded text-[13px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
                >
                  {isCreatingUser ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <>
                      <Plus size={15} /> Create
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-[#EBECF0] dark:border-[#242E40] bg-[#F9FAFB] dark:bg-[#1B2230] flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
                Registered accounts
              </h2>
              <button
                onClick={refreshUsers}
                className="text-xs font-medium text-[#0052CC] dark:text-[#4C9AFF] hover:underline flex items-center gap-1"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
            {isLoadingUsers ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="animate-spin text-[#0052CC]" size={22} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-[#EBECF0] dark:border-[#242E40] text-[11px] font-semibold uppercase tracking-wide text-[#6B778C] bg-[#FAFBFC] dark:bg-[#181F2B]">
                      <th className="px-4 py-2.5">User</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Current Role</th>
                      <th className="px-4 py-2.5 text-right">Change Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBECF0] dark:divide-[#242E40]">
                    {users.map((u) => (
                      <tr
                        key={u.uid}
                        className="hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534]"
                      >
                        <td className="px-4 py-2.5 font-medium text-[#172B4D] dark:text-[#E6EDF5]">
                          {u.email}
                          {currentUser?.uid === u.uid && (
                            <span className="ml-2 px-1.5 py-0.5 text-[11px] rounded bg-[#EBECF0] dark:bg-[#242E40] text-[#5E6C84] dark:text-[#94A3B8]">
                              You
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs font-medium text-[#00875A] dark:text-[#36B37E]">
                          Active
                        </td>
                        <td className="px-4 py-2.5 text-xs font-medium">
                          {ROLE_LABELS[u.role] || u.role}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <select
                            value={u.role}
                            onChange={(e) =>
                              handleRoleChange(u.uid, e.target.value as UserRole)
                            }
                            disabled={currentUser?.uid === u.uid}
                            className="px-2.5 py-1.5 border border-[#C1C7D0] dark:border-[#2E3A4D] rounded text-xs bg-white dark:bg-[#0F141C] disabled:opacity-50"
                          >
                            <option value="admin">IT Admin</option>
                            <option value="technician">IT Support (Technician)</option>
                            <option value="management">Management (Read-Only)</option>
                            <option value="requester">Portal Requester</option>
                            <option value="sandbox_user">Sandbox User</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MASTER DATA (Full-width structured table instead of 3 cramped boxes) */}
      {activeTab === "master" && (
        <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EBECF0] dark:border-[#242E40] bg-[#F9FAFB] dark:bg-[#1B2230] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: "location", label: `Locations / Venues (${config.locations.length})` },
                  { id: "category", label: `Categories (${config.categories.length})` },
                  { id: "department", label: `Departments (${config.departments?.length || 0})` },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMasterTab(m.id);
                    setMasterSearch("");
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    masterTab === m.id
                      ? "bg-[#0052CC] text-white"
                      : "text-[#5E6C84] dark:text-[#94A3B8] hover:bg-[#EBECF0] dark:hover:bg-[#242E40]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B778C]"
              />
              <input
                type="text"
                placeholder={`Filter ${masterTab}s...`}
                value={masterSearch}
                onChange={(e) => setMasterSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
              />
            </div>
          </div>

          <form
            onSubmit={handleAddMasterItem}
            className="p-4 border-b border-[#EBECF0] dark:border-[#242E40] flex gap-2"
          >
            <input
              value={newItemVal}
              onChange={(e) => setNewItemVal(e.target.value)}
              placeholder={`Add new ${masterTab}...`}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={!newItemVal.trim()}
              className="px-4 py-2 bg-[#0052CC] hover:bg-[#0043A8] text-white text-[13px] font-medium rounded flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <Plus size={15} /> Add
            </button>
          </form>

          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#EBECF0] dark:border-[#242E40] text-[11px] font-semibold uppercase tracking-wide text-[#6B778C] bg-[#FAFBFC] dark:bg-[#181F2B]">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBECF0] dark:divide-[#242E40]">
              {currentMasterItems.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-[#6B778C]">
                    No items found.
                  </td>
                </tr>
              ) : (
                currentMasterItems.map((item) => (
                  <tr
                    key={item}
                    className="hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534]"
                  >
                    <td className="px-4 py-2.5 font-medium text-[#172B4D] dark:text-[#E6EDF5]">
                      {item}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() =>
                            setEditState({
                              isOpen: true,
                              type: masterTab,
                              oldValue: item,
                              newValue: item,
                              isProcessing: false,
                            })
                          }
                          className="p-1.5 text-[#5E6C84] hover:text-[#0052CC] dark:hover:text-[#4C9AFF] rounded"
                          title="Rename (updates linked assets)"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => requestDeleteMasterItem(item)}
                          disabled={checkingItem === item}
                          className="p-1.5 text-[#5E6C84] hover:text-[#DE350B] rounded"
                          title="Remove"
                        >
                          {checkingItem === item ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: EMAIL & ALERTS */}
      {activeTab === "email" && (
        <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EBECF0] dark:border-[#242E40] bg-[#F9FAFB] dark:bg-[#1B2230]">
            <h2 className="text-[13px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
              EmailJS automated alerts
            </h2>
          </div>
          <form onSubmit={handleSaveEmailConfig} className="p-5 space-y-4">
            <label className="flex items-center gap-2 text-[13px] font-medium text-[#172B4D] dark:text-[#E6EDF5]">
              <input
                type="checkbox"
                checked={emailConfig.enabled}
                onChange={(e) =>
                  setEmailConfig({ ...emailConfig, enabled: e.target.checked })
                }
              />
              Enable automated email notifications for new tickets &amp; requests
            </label>

            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${
                !emailConfig.enabled ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <div>
                <label className={labelClass}>Service ID</label>
                <input
                  className={inputClass}
                  value={emailConfig.serviceId}
                  onChange={(e) =>
                    setEmailConfig({ ...emailConfig, serviceId: e.target.value })
                  }
                  placeholder="service_xxx"
                />
              </div>
              <div>
                <label className={labelClass}>Public Key</label>
                <input
                  className={inputClass}
                  type="password"
                  value={emailConfig.publicKey}
                  onChange={(e) =>
                    setEmailConfig({ ...emailConfig, publicKey: e.target.value })
                  }
                  placeholder="user_xxx"
                />
              </div>
              <div>
                <label className={labelClass}>IT Alert Template ID</label>
                <input
                  className={inputClass}
                  value={emailConfig.templateId}
                  onChange={(e) =>
                    setEmailConfig({
                      ...emailConfig,
                      templateId: e.target.value,
                    })
                  }
                  placeholder="template_alert_xxx"
                />
              </div>
              <div>
                <label className={labelClass}>Staff Receipt Template ID</label>
                <input
                  className={inputClass}
                  value={emailConfig.confirmationTemplateId || ""}
                  onChange={(e) =>
                    setEmailConfig({
                      ...emailConfig,
                      confirmationTemplateId: e.target.value,
                    })
                  }
                  placeholder="template_confirm_xxx"
                />
              </div>
              <div>
                <label className={labelClass}>IT Manager Recipient Email</label>
                <input
                  className={inputClass}
                  type="email"
                  value={emailConfig.targetEmail}
                  onChange={(e) =>
                    setEmailConfig({
                      ...emailConfig,
                      targetEmail: e.target.value,
                    })
                  }
                  placeholder="it@eatx.com"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#EBECF0] dark:border-[#242E40] flex justify-end gap-2">
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={isTestingEmail || !emailConfig.enabled}
                className="px-3.5 py-2 border border-[#DFE3E8] dark:border-[#2A3444] rounded text-[13px] font-medium hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] flex items-center gap-1.5 disabled:opacity-50"
              >
                {isTestingEmail ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Send test email
              </button>
              <button
                type="submit"
                disabled={isSavingEmail}
                className="px-4 py-2 bg-[#0052CC] hover:bg-[#0043A8] text-white rounded text-[13px] font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingEmail ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: ENVIRONMENT & DANGER ZONE */}
      {activeTab === "environment" && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-[14px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
                Sandbox testing mode
              </h3>
              <p className="text-xs text-[#5E6C84] dark:text-[#94A3B8] mt-1">
                Switches the application to isolated `sandbox_` collections so
                you can test safely without touching production data.
              </p>
            </div>
            <button
              onClick={() => setSandboxMode(!isSandbox)}
              className={`px-4 py-2 rounded text-[13px] font-medium shrink-0 border transition-colors ${
                isSandbox
                  ? "bg-[#FFAB00] text-[#172B4D] border-[#FFAB00]"
                  : "bg-white dark:bg-[#0F141C] text-[#172B4D] dark:text-[#E6EDF5] border-[#C1C7D0] dark:border-[#2E3A4D]"
              }`}
            >
              {isSandbox ? "Disable Sandbox Mode" : "Enable Sandbox Mode"}
            </button>
          </div>

          <div className="bg-white dark:bg-[#161C26] border border-[#FFBDAD] dark:border-red-900/50 border-l-4 border-l-[#DE350B] rounded p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-[14px] font-semibold text-[#BF2600] dark:text-red-400">
                Reset {isSandbox ? "Sandbox" : "Production"} database
              </h3>
              <p className="text-xs text-[#5E6C84] dark:text-[#94A3B8] mt-1">
                Permanently deletes all assets, logs, tickets, projects, and
                invoices in the current environment. Cannot be undone.
              </p>
            </div>
            <button
              onClick={() =>
                setDeleteConfirmation({
                  isOpen: true,
                  type: "reset",
                  value: "ALL DATA",
                })
              }
              className="px-4 py-2 bg-[#DE350B] hover:bg-[#BF2600] text-white rounded text-[13px] font-medium flex items-center gap-1.5 shrink-0"
            >
              <Trash2 size={14} /> Reset Database
            </button>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {successMsg && (
          <div className="bg-[#00875A] text-white px-4 py-2.5 rounded shadow-lg flex items-center gap-2 text-[13px]">
            <Check size={15} /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="bg-[#DE350B] text-white px-4 py-2.5 rounded shadow-lg flex items-center gap-2 text-[13px]">
            <AlertTriangle size={15} /> {errorMsg}
          </div>
        )}
      </div>

      {/* Delete / Reset Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#161C26] rounded border border-[#DFE3E8] dark:border-[#2A3444] shadow-xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-[15px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
              {deleteConfirmation.type === "reset"
                ? "Reset entire database?"
                : `Delete ${deleteConfirmation.type}?`}
            </h3>
            <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8]">
              {deleteConfirmation.type === "reset"
                ? `This will permanently delete all records in ${
                    isSandbox ? "SANDBOX" : "PRODUCTION"
                  } mode.`
                : `Remove "${deleteConfirmation.value}" from configuration?`}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() =>
                  setDeleteConfirmation({ isOpen: false, type: null, value: "" })
                }
                className="px-3.5 py-2 text-[13px] border border-[#DFE3E8] dark:border-[#2A3444] rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-3.5 py-2 text-[13px] bg-[#DE350B] text-white rounded font-medium"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {editState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#161C26] rounded border border-[#DFE3E8] dark:border-[#2A3444] shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
                Rename {editState.type}
              </h3>
              <button
                onClick={() =>
                  setEditState((prev) => ({ ...prev, isOpen: false }))
                }
              >
                <X size={16} className="text-[#6B778C]" />
              </button>
            </div>
            <p className="text-xs text-[#5E6C84] dark:text-[#94A3B8]">
              Renaming <strong>{editState.oldValue}</strong> automatically
              updates all linked assets.
            </p>
            <input
              value={editState.newValue}
              onChange={(e) =>
                setEditState((prev) => ({ ...prev, newValue: e.target.value }))
              }
              className={inputClass}
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() =>
                  setEditState((prev) => ({ ...prev, isOpen: false }))
                }
                disabled={editState.isProcessing}
                className="px-3.5 py-2 text-[13px] border border-[#DFE3E8] dark:border-[#2A3444] rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmEdit}
                disabled={
                  editState.isProcessing ||
                  !editState.newValue.trim() ||
                  editState.newValue === editState.oldValue
                }
                className="px-3.5 py-2 text-[13px] bg-[#0052CC] text-white rounded font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                {editState.isProcessing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
