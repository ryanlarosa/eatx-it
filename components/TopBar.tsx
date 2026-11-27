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
  "/": { section: "Dashboards", label: "IT Operations" },
  "/executive": { section: "Dashboards", label: "Executive Summary" },
  "/assets": { section: "Infrastructure", label: "Asset Inventory" },
  "/venues": { section: "Infrastructure", label: "Venues & Sites" },
  "/staff": { section: "Infrastructure", label: "Employees & Handovers" },
  "/tickets": { section: "Service & Delivery", label: "Tickets & Tasks" },
  "/pos-supy": { section: "Service & Delivery", label: "POS / Supy Issues" },
  "/tasks": { section: "Service & Delivery", label: "Tickets & Tasks" },
  "/repairs": { section: "Service & Delivery", label: "Tickets & Tasks" },
  "/planner": { section: "Service & Delivery", label: "Projects" },
  "/requests": { section: "Service & Delivery", label: "Procurement" },
  "/invoices": { section: "Administration", label: "Invoices" },
  "/reports": { section: "Administration", label: "Reports & Backup" },
  "/settings": { section: "Administration", label: "Settings" },
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
      className="absolute top-10 right-0 w-80 md:w-96 z-40 bg-white dark:bg-[#161C26] rounded border border-[#DFE3E8] dark:border-[#2A3444] shadow-lg flex flex-col max-h-[440px]"
    >
      <div className="px-4 py-2.5 border-b border-[#DFE3E8] dark:border-[#2A3444] flex justify-between items-center bg-[#F9FAFB] dark:bg-[#1B2230]">
        <div className="text-[13px] font-semibold text-[#172B4D] dark:text-[#E6EDF5] flex items-center gap-2">
          Notifications
          {unread.length > 0 && (
            <span className="bg-[#DE350B] text-white text-[11px] px-1.5 rounded">
              {unread.length}
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <button
            onClick={markAllNotificationsRead}
            className="text-xs text-[#0052CC] dark:text-[#4C9AFF] hover:underline font-medium"
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="overflow-y-auto flex-1 divide-y divide-[#EBECF0] dark:divide-[#242E40]">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-[#6B778C] text-xs">
            No notifications
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={`p-3 cursor-pointer transition-colors ${
                n.read
                  ? "hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534]"
                  : "bg-[#DEEBFF]/40 dark:bg-[#0052CC]/15 hover:bg-[#DEEBFF]/60"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`mt-0.5 shrink-0 ${
                    n.type === "error"
                      ? "text-[#DE350B]"
                      : n.type === "success"
                      ? "text-[#00875A]"
                      : "text-[#0052CC]"
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
                  <div className="text-[13px] font-medium text-[#172B4D] dark:text-[#E6EDF5]">
                    {n.title}
                  </div>
                  <p className="text-xs text-[#5E6C84] dark:text-[#94A3B8] mt-0.5 line-clamp-2">
                    {n.message}
                  </p>
                  <div className="text-[11px] text-[#7A869A] mt-1">
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
    { label: "Register Asset", to: "/assets?new=1", icon: Box },
    { label: "New Ticket / Task", to: "/tickets", icon: ClipboardList },
    { label: "New IT Project", to: "/planner", icon: FolderKanban },
    { label: "Log Venue Site Visit", to: "/venues?logVisit=1", icon: Building2 },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="h-8 px-3 rounded bg-[#0052CC] hover:bg-[#0043A8] text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
      >
        <Plus size={15} />
        <span className="hidden sm:inline">Create</span>
        <ChevronDown size={13} className="hidden sm:inline opacity-80" />
      </button>

      {open && (
        <div className="absolute top-10 right-0 w-52 bg-white dark:bg-[#161C26] rounded border border-[#DFE3E8] dark:border-[#2A3444] shadow-lg py-1 z-40">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={() => {
                  setOpen(false);
                  navigate(a.to);
                }}
                className="w-full px-3 py-2 text-left text-[13px] text-[#172B4D] dark:text-[#E6EDF5] hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] flex items-center gap-2.5 transition-colors"
              >
                <Icon size={15} className="text-[#5E6C84] dark:text-[#94A3B8]" />
                <span>{a.label}</span>
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
        className="flex items-center gap-2 h-8 px-2 rounded hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-[#0052CC] text-white flex items-center justify-center text-[11px] font-semibold">
          {user?.email?.[0]?.toUpperCase() || <UserIcon size={12} />}
        </div>
        <span className="hidden md:inline text-[13px] font-medium text-[#172B4D] dark:text-[#E6EDF5]">
          {user?.displayName || user?.email?.split("@")[0] || "User"}
        </span>
        <ChevronDown size={13} className="text-[#6B778C] hidden md:block" />
      </button>

      {isOpen && (
        <div className="absolute top-10 right-0 w-52 bg-white dark:bg-[#161C26] rounded border border-[#DFE3E8] dark:border-[#2A3444] shadow-lg py-1 z-40">
          <div className="px-3 py-2 border-b border-[#EBECF0] dark:border-[#242E40]">
            <div className="text-[13px] font-medium text-[#172B4D] dark:text-[#E6EDF5] truncate">
              {user?.email}
            </div>
            <div className="text-[11px] text-[#6B778C] capitalize mt-0.5">
              {user?.role?.replace("_", " ")}
            </div>
          </div>
          <div className="p-1">
            {canEdit && (
              <Link
                to="/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-2.5 py-1.5 text-[13px] text-[#42526E] dark:text-[#CBD5E1] hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] rounded"
              >
                <SettingsIcon size={14} /> Settings
              </Link>
            )}
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[13px] text-[#DE350B] hover:bg-[#FFEBE6] dark:hover:bg-red-900/20 rounded"
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
    <header className="h-12 bg-white dark:bg-[#161C26] border-b border-[#DFE3E8] dark:border-[#242E40] flex items-center justify-between px-3 sm:px-5 sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-1.5 text-[#42526E] dark:text-[#94A3B8] hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] rounded"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 text-[#5E6C84] dark:text-[#94A3B8] hover:text-[#172B4D] dark:hover:text-white hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] rounded transition-colors"
          title={isSidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen size={17} />
          ) : (
            <PanelLeftClose size={17} />
          )}
        </button>

        <div className="h-4 w-px bg-[#DFE3E8] dark:bg-[#242E40] hidden md:block mx-0.5" />

        <nav className="flex items-center gap-1.5 text-[13px] min-w-0">
          <span className="hidden sm:inline text-[#6B778C] dark:text-[#8A99B0]">
            {meta.section}
          </span>
          <ChevronRight
            size={14}
            className="hidden sm:inline text-[#B3BAC5] dark:text-[#475569] shrink-0"
          />
          <span className="font-semibold text-[#172B4D] dark:text-[#E6EDF5] truncate">
            {meta.label}
          </span>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {canEdit && <QuickActionsMenu />}

        <button
          onClick={toggleTheme}
          className="h-8 w-8 flex items-center justify-center rounded text-[#5E6C84] dark:text-[#94A3B8] hover:text-[#172B4D] dark:hover:text-white hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] transition-colors"
          title={isDarkMode ? "Light theme" : "Dark theme"}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="h-8 w-8 flex items-center justify-center rounded text-[#5E6C84] dark:text-[#94A3B8] hover:text-[#172B4D] dark:hover:text-white hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] relative transition-colors"
            title="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#DE350B] rounded-full ring-2 ring-white dark:ring-[#161C26]" />
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

        <div className="h-4 w-px bg-[#DFE3E8] dark:bg-[#242E40]" />
        <UserDropdown user={user} onLogout={onLogout} />
      </div>
    </header>
  );
};

export default TopBar;
