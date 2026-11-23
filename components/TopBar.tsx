import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Bell,
  XCircle,
  CheckCircle,
  Info,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
  Settings as SettingsIcon,
  LogOut,
  Plus,
  Box,
  ClipboardList,
  FolderKanban,
  Building2,
  LifeBuoy,
} from "lucide-react";
import { AppNotification, UserProfile } from "../types";
import {
  markNotificationRead,
  markAllNotificationsRead,
  canManageOperations,
} from "../services/storageService";

const ROUTE_META: Record<string, { section: string; label: string }> = {
  "/": { section: "Overview", label: "IT Operations" },
  "/executive": { section: "Overview", label: "Executive View" },
  "/assets": { section: "Infrastructure", label: "Assets" },
  "/venues": { section: "Infrastructure", label: "Venues & Sites" },
  "/staff": { section: "Infrastructure", label: "Employees & Handovers" },
  "/tasks": { section: "Workflows", label: "Tasks" },
  "/repairs": { section: "Workflows", label: "Help Desk" },
  "/planner": { section: "Workflows", label: "Projects" },
  "/requests": { section: "Workflows", label: "Procurement" },
  "/invoices": { section: "Governance", label: "Invoices" },
  "/reports": { section: "Governance", label: "Reports & Backup" },
  "/settings": { section: "Governance", label: "Settings" },
};

const NotificationPanel = ({
  notifications,
  onClose,
  onRead,
}: {
  notifications: AppNotification[];
  onClose: () => void;
  onRead: (id: string) => void;
}) => {
  const unread = notifications.filter((n) => !n.read);
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node))
        onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleClick = (n: AppNotification) => {
    onRead(n.id);
    if (n.link) navigate(n.link);
    onClose();
  };

  return (
    <div
      ref={panelRef}
      className="absolute top-11 right-0 w-80 md:w-96 z-50 bg-white dark:bg-[#12151C] rounded-lg shadow-xl border border-[#E4E6EB] dark:border-[#222733] flex flex-col max-h-[460px]"
    >
      <div className="px-4 py-3 border-b border-[#E4E6EB] dark:border-[#222733] flex justify-between items-center bg-[#F8F9FB] dark:bg-[#151922] rounded-t-lg">
        <div className="text-xs font-semibold uppercase tracking-[0.06em] text-[#111318] dark:text-[#F1F3F7] flex items-center gap-2">
          Notifications
          {unread.length > 0 && (
            <span className="font-mono bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded">
              {unread.length}
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <button
            onClick={markAllNotificationsRead}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="overflow-y-auto flex-1 divide-y divide-[#E4E6EB] dark:divide-[#222733]">
        {notifications.length === 0 ? (
          <div className="p-10 text-center text-[#8C95A6] flex flex-col items-center">
            <Bell size={24} className="opacity-30 mb-2" />
            <p className="text-xs font-medium">All caught up</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={`p-3 cursor-pointer transition-colors relative ${
                n.read
                  ? "hover:bg-[#F8F9FB] dark:hover:bg-[#181C25]"
                  : "bg-blue-500/[0.04] hover:bg-blue-500/[0.08]"
              }`}
            >
              {!n.read && (
                <span className="absolute right-3 top-3.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
              )}
              <div className="flex items-start gap-2.5 pr-4">
                <div
                  className={`mt-0.5 shrink-0 ${
                    n.type === "error"
                      ? "text-red-500"
                      : n.type === "success"
                      ? "text-emerald-500"
                      : "text-blue-500"
                  }`}
                >
                  {n.type === "error" ? (
                    <XCircle size={15} />
                  ) : n.type === "success" ? (
                    <CheckCircle size={15} />
                  ) : (
                    <Info size={15} />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-[#111318] dark:text-[#F1F3F7]">
                    {n.title}
                  </h4>
                  <p className="text-xs text-[#5A6270] dark:text-[#8B94A5] mt-0.5 line-clamp-2">
                    {n.message}
                  </p>
                  <div className="font-mono text-[10px] text-[#8C95A6] mt-1">
                    {new Date(n.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const QuickActionsMenu = () => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const actions = [
    { label: "Add Asset", sub: "Register hardware", to: "/assets?new=1", icon: Box },
    { label: "New IT Task", sub: "Assign Ryan or Diego", to: "/tasks", icon: ClipboardList },
    { label: "New Project", sub: "Milestones & budget", to: "/planner", icon: FolderKanban },
    { label: "Log Help Desk Ticket", sub: "Incident / repair", to: "/repairs", icon: LifeBuoy },
    { label: "Venue / Site Visit", sub: "28 EATX outlets", to: "/venues", icon: Building2 },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="h-8 px-2.5 sm:px-3 rounded-md bg-[#111318] dark:bg-blue-600 text-white hover:bg-black dark:hover:bg-blue-500 text-xs font-medium flex items-center gap-1.5 transition-colors"
      >
        <Plus size={14} />
        <span className="hidden sm:inline">Quick Action</span>
        <ChevronDown size={13} className="hidden sm:inline opacity-75" />
      </button>

      {open && (
        <div className="absolute top-10 right-0 w-60 bg-white dark:bg-[#12151C] rounded-lg shadow-xl border border-[#E4E6EB] dark:border-[#222733] py-1.5 z-50">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8C95A6]">
            Create / Navigate
          </div>
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={() => {
                  setOpen(false);
                  navigate(a.to);
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#F4F5F7] dark:hover:bg-[#181C25] flex items-center gap-2.5 transition-colors"
              >
                <Icon size={15} className="text-[#5A6270] dark:text-[#8B94A5]" />
                <div>
                  <div className="text-xs font-medium text-[#111318] dark:text-[#F1F3F7]">
                    {a.label}
                  </div>
                  <div className="text-[11px] text-[#8C95A6]">{a.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const UserDropdown = ({
  user,
  onLogout,
}: {
  user: UserProfile | null;
  onLogout: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const canEdit = canManageOperations(user);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      )
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-8 px-2 rounded-md hover:bg-[#F4F5F7] dark:hover:bg-[#181C25] border border-transparent hover:border-[#E4E6EB] dark:hover:border-[#222733] transition-colors"
      >
        <div className="w-6 h-6 rounded bg-[#111318] dark:bg-[#222733] text-white flex items-center justify-center font-mono text-[11px] font-semibold">
          {user?.email?.[0]?.toUpperCase() || <UserIcon size={12} />}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-xs font-medium text-[#111318] dark:text-[#F1F3F7] leading-none">
            {user?.displayName || "User"}
          </div>
          <div className="font-mono text-[10px] text-[#8C95A6] uppercase mt-0.5 leading-none">
            {user?.role?.replace("_", " ")}
          </div>
        </div>
        <ChevronDown size={13} className="text-[#8C95A6] hidden md:block" />
      </button>

      {isOpen && (
        <div className="absolute top-10 right-0 w-52 bg-white dark:bg-[#12151C] rounded-lg shadow-xl border border-[#E4E6EB] dark:border-[#222733] py-1.5 z-50">
          <div className="px-3 py-2 border-b border-[#E4E6EB] dark:border-[#222733]">
            <div className="text-xs font-medium text-[#111318] dark:text-[#F1F3F7] truncate">
              {user?.email}
            </div>
            <div className="font-mono text-[10px] text-[#8C95A6] uppercase mt-0.5">
              Role: {user?.role?.replace("_", " ")}
            </div>
          </div>
          <div className="p-1">
            {canEdit && (
              <Link
                to="/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#5A6270] dark:text-[#8B94A5] hover:bg-[#F4F5F7] dark:hover:bg-[#181C25] hover:text-[#111318] dark:hover:text-white rounded-md"
              >
                <SettingsIcon size={14} /> Settings
              </Link>
            )}
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-md"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface TopBarProps {
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  user: UserProfile | null;
  notifications: AppNotification[];
  onLogout: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  onToggleSidebar,
  isSidebarCollapsed,
  onToggleCollapse,
  isDarkMode,
  toggleTheme,
  user,
  notifications,
  onLogout,
}) => {
  const [showNotif, setShowNotif] = useState(false);
  const location = useLocation();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const meta = ROUTE_META[location.pathname] || {
    section: "EATX IT",
    label: "Workspace",
  };
  const canEdit = canManageOperations(user);

  return (
    <header className="h-14 bg-white/90 dark:bg-[#0E1117]/90 backdrop-blur-md border-b border-[#E4E6EB] dark:border-[#222733] flex items-center justify-between px-3 sm:px-5 sticky top-0 z-30 shrink-0">
      {/* Left: Drawer / Collapse + Breadcrumbs */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-1.5 text-[#5A6270] dark:text-[#8B94A5] hover:bg-[#F4F5F7] dark:hover:bg-[#181C25] rounded-md"
          aria-label="Open menu"
        >
          <Menu size={19} />
        </button>

        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 text-[#5A6270] dark:text-[#8B94A5] hover:text-[#111318] dark:hover:text-white hover:bg-[#F4F5F7] dark:hover:bg-[#181C25] rounded-md transition-colors"
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen size={17} />
          ) : (
            <PanelLeftClose size={17} />
          )}
        </button>

        <div className="h-4 w-px bg-[#E4E6EB] dark:bg-[#222733] hidden md:block" />

        {/* Dynamic Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs min-w-0">
          <span className="hidden sm:inline text-[#8C95A6] dark:text-[#636C7E] font-medium">
            {meta.section}
          </span>
          <ChevronRight
            size={13}
            className="hidden sm:inline text-[#C7CCD6] dark:text-[#343C4F] shrink-0"
          />
          <span className="font-semibold text-[#111318] dark:text-[#F1F3F7] truncate">
            {meta.label}
          </span>
        </div>
      </div>

      {/* Right: Quick Action + Theme + Notifications + User */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {canEdit && <QuickActionsMenu />}

        <button
          onClick={toggleTheme}
          className="h-8 w-8 flex items-center justify-center rounded-md text-[#5A6270] dark:text-[#8B94A5] hover:text-[#111318] dark:hover:text-white hover:bg-[#F4F5F7] dark:hover:bg-[#181C25] transition-colors"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Ops Mode"}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className={`h-8 w-8 flex items-center justify-center rounded-md transition-colors relative ${
              showNotif
                ? "bg-[#F4F5F7] dark:bg-[#181C25] text-[#111318] dark:text-white"
                : "text-[#5A6270] dark:text-[#8B94A5] hover:bg-[#F4F5F7] dark:hover:bg-[#181C25]"
            }`}
            title="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-[#0E1117]" />
            )}
          </button>
          {showNotif && (
            <NotificationPanel
              notifications={notifications}
              onClose={() => setShowNotif(false)}
              onRead={markNotificationRead}
            />
          )}
        </div>

        <div className="h-4 w-px bg-[#E4E6EB] dark:bg-[#222733] mx-0.5" />
        <UserDropdown user={user} onLogout={onLogout} />
      </div>
    </header>
  );
};

export default TopBar;
