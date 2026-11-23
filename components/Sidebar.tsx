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
      title: "Dashboards",
      items: [
        { to: "/", label: "IT Operations", icon: LayoutDashboard },
        { to: "/executive", label: "Executive Summary", icon: Presentation },
      ],
    },
    {
      title: "Infrastructure",
      items: [
        { to: "/assets", label: "Asset Inventory", icon: Box },
        { to: "/venues", label: "Venues & Sites", icon: Building2 },
        { to: "/staff", label: "Employees & Handovers", icon: Users, opsOnly: true },
      ],
    },
    {
      title: "Service & Delivery",
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
      title: "Administration",
      items: [
        { to: "/invoices", label: "Invoices", icon: Receipt },
        { to: "/reports", label: "Reports & Backup", icon: BarChart3 },
        { to: "/settings", label: "Settings", icon: SettingsIcon, opsOnly: true },
      ],
    },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#141A24] text-[#CBD5E1] border-r border-[#242E40] transition-all duration-200 ease-out
          w-[236px] ${isCollapsed ? "md:w-[60px]" : "md:w-[236px]"}
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Classic Enterprise Console Header */}
        <div
          className={`h-12 flex items-center border-b border-[#242E40] shrink-0 ${
            isCollapsed ? "px-4 md:justify-center md:px-0" : "px-4 justify-between"
          }`}
        >
          <Link to="/" onClick={onClose} className="flex items-center gap-2.5 min-w-0">
            <span className="w-2 h-5 rounded-[2px] bg-[#0052CC] shrink-0" />
            <div className={`${isCollapsed ? "md:hidden" : "block"} min-w-0 leading-tight`}>
              <div className="text-[14px] font-bold tracking-tight text-white">
                EATX IT
              </div>
              <div className="text-[11px] text-[#8A99B0] font-normal">
                Management Console
              </div>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="md:hidden p-1 text-[#94A3B8] hover:text-white rounded"
          >
            <X size={17} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-4">
          {groups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.opsOnly || canEdit
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.title}>
                <div
                  className={`px-4 mb-1.5 text-[11px] font-semibold text-[#6E7E96] ${
                    isCollapsed ? "md:hidden" : "block"
                  }`}
                >
                  {group.title}
                </div>
                {isCollapsed && (
                  <div className="hidden md:block h-px bg-[#242E40] mx-3 mb-2" />
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
                        className={`relative flex items-center ${
                          isCollapsed ? "md:justify-center md:px-0" : "px-4"
                        } gap-3 py-2 text-[13px] font-medium transition-colors ${
                          active
                            ? "bg-[#1F293B] text-white"
                            : "text-[#B0BDD0] hover:bg-[#1B2332] hover:text-white"
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#2684FF]" />
                        )}
                        <Icon
                          size={16}
                          className={`shrink-0 ${
                            active ? "text-[#4C9AFF]" : "text-[#7C8CA4]"
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
                            className={`text-[11px] font-semibold px-1.5 rounded bg-[#DE350B] text-white ${
                              isCollapsed
                                ? "md:absolute md:top-1.5 md:right-2 md:w-2 md:h-2 md:p-0 md:rounded-full md:text-[0px]"
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

        {/* Subtle Footer */}
        <div className="px-4 py-2.5 border-t border-[#242E40] shrink-0">
          <div
            className={`flex items-center ${
              isCollapsed ? "md:justify-center" : "justify-between"
            } text-[11px] text-[#8A99B0]`}
            title={isSandbox ? "Sandbox Environment" : "Production Environment"}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isSandbox ? "bg-[#FFAB00]" : "bg-[#36B37E]"
                }`}
              />
              <span className={`${isCollapsed ? "md:hidden" : "block"} truncate`}>
                {isSandbox ? "Sandbox Mode" : "Production"}
              </span>
            </div>
            <span className={`${isCollapsed ? "md:hidden" : "block"} text-[#6E7E96]`}>
              EATX Group
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
