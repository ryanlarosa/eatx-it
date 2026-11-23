import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Presentation,
  Box,
  Building2,
  Users,
  ClipboardList,
  LifeBuoy,
  FolderKanban,
  ShoppingBag,
  Receipt,
  BarChart3,
  Settings as SettingsIcon,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  getSandboxStatus,
  getCurrentUserProfile,
  canManageOperations,
} from "../services/storageService";

interface SidebarProps {
  notificationCount: number;
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  opsOnly?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  notificationCount,
  isOpen,
  isCollapsed,
  onClose,
}) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const user = getCurrentUserProfile();
  const canEdit = canManageOperations(user);
  const isSandbox = getSandboxStatus();

  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: "Overview",
      items: [
        { to: "/", label: "Operations", icon: LayoutDashboard },
        { to: "/executive", label: "Executive View", icon: Presentation },
      ],
    },
    {
      title: "Infrastructure",
      items: [
        { to: "/assets", label: "Assets", icon: Box },
        { to: "/venues", label: "Venues & Sites", icon: Building2 },
        { to: "/staff", label: "Employees", icon: Users, opsOnly: true },
      ],
    },
    {
      title: "Workflows",
      items: [
        { to: "/tasks", label: "Tasks", icon: ClipboardList },
        { to: "/repairs", label: "Help Desk", icon: LifeBuoy },
        {
          to: "/planner",
          label: "Projects",
          icon: FolderKanban,
          badge: notificationCount,
        },
        { to: "/requests", label: "Procurement", icon: ShoppingBag },
      ],
    },
    {
      title: "Governance",
      items: [
        { to: "/invoices", label: "Invoices", icon: Receipt },
        { to: "/reports", label: "Reports & Backup", icon: BarChart3 },
        { to: "/settings", label: "Settings", icon: SettingsIcon, opsOnly: true },
      ],
    },
  ];

  const linkClass = (path: string) => {
    const active = isActive(path);
    return `group relative flex items-center ${
      isCollapsed ? "md:justify-center md:px-0" : "px-2.5"
    } gap-2.5 py-2 rounded-md text-[13px] font-medium transition-colors ${
      active
        ? "bg-[#111318] text-white dark:bg-[#1D2330] dark:text-[#F1F3F7]"
        : "text-[#5A6270] hover:bg-[#EBEEF2] hover:text-[#111318] dark:text-[#8B94A5] dark:hover:bg-[#181C25] dark:hover:text-[#F1F3F7]"
    }`;
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-[#0E1117] border-r border-[#E4E6EB] dark:border-[#222733] transition-all duration-200 ease-out
          w-60 ${isCollapsed ? "md:w-[68px]" : "md:w-60"}
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Brand Header */}
        <div
          className={`h-14 flex items-center border-b border-[#E4E6EB] dark:border-[#222733] shrink-0 ${
            isCollapsed ? "px-4 md:justify-center md:px-0" : "px-4 justify-between"
          }`}
        >
          <Link
            to="/"
            onClick={onClose}
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="w-7 h-7 rounded-md bg-[#111318] dark:bg-blue-600 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0 tracking-tighter">
              EX
            </div>
            <div className={`${isCollapsed ? "md:hidden" : "block"} min-w-0`}>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[15px] tracking-tight text-[#111318] dark:text-[#F1F3F7]">
                  eatx.
                </span>
                <span className="font-mono text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#F4F5F7] dark:bg-[#181C25] text-[#5A6270] dark:text-[#8B94A5] border border-[#E4E6EB] dark:border-[#222733]">
                  IT OPS
                </span>
              </div>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="md:hidden p-1 text-[#5A6270] hover:text-[#111318] dark:text-[#8B94A5] dark:hover:text-white rounded-md"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
          {groups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.opsOnly || canEdit
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.title}>
                <div
                  className={`px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8C95A6] dark:text-[#5C6475] ${
                    isCollapsed ? "md:hidden" : "block"
                  }`}
                >
                  {group.title}
                </div>
                {isCollapsed && (
                  <div className="hidden md:block h-px bg-[#E4E6EB] dark:bg-[#222733] mx-2 mb-2" />
                )}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={onClose}
                        title={isCollapsed ? item.label : undefined}
                        className={linkClass(item.to)}
                      >
                        {active && (
                          <span className="hidden md:block absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-r bg-blue-500" />
                        )}
                        <Icon
                          size={16}
                          className={`shrink-0 ${
                            active
                              ? "text-white dark:text-blue-400"
                              : "text-[#6B7280] dark:text-[#7E8799] group-hover:text-[#111318] dark:group-hover:text-[#F1F3F7]"
                          }`}
                        />
                        <span
                          className={`truncate ${
                            isCollapsed ? "md:hidden" : "flex-1"
                          }`}
                        >
                          {item.label}
                        </span>
                        {item.badge && item.badge > 0 ? (
                          <span
                            className={`font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded bg-red-500 text-white ${
                              isCollapsed
                                ? "md:absolute md:top-1 md:right-1 md:w-2 md:h-2 md:p-0 md:rounded-full md:text-[0px]"
                                : ""
                            }`}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Compact Status Footer */}
        <div className="p-3 border-t border-[#E4E6EB] dark:border-[#222733] shrink-0">
          <div
            className={`flex items-center ${
              isCollapsed ? "md:justify-center" : "justify-between"
            } px-2 py-1.5 rounded-md bg-[#F8F9FB] dark:bg-[#141821] border border-[#E4E6EB] dark:border-[#222733]`}
            title={isSandbox ? "Sandbox Environment" : "Production Environment"}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isSandbox ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                }`}
              />
              <span
                className={`text-[11px] font-medium text-[#5A6270] dark:text-[#8B94A5] truncate ${
                  isCollapsed ? "md:hidden" : "block"
                }`}
              >
                {isSandbox ? "Sandbox" : "Production"}
              </span>
            </div>
            <span
              className={`font-mono text-[10px] text-[#8C95A6] dark:text-[#5C6475] ${
                isCollapsed ? "md:hidden" : "block"
              }`}
            >
              v2.0
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
