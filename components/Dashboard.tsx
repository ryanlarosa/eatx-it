import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Asset,
  AssetStats,
  IncidentReport,
  AssetRequest,
  Task,
} from "../types";
import {
  listenToIncidents,
  listenToRequests,
  listenToTasks,
  getWarrantyStatus,
} from "../services/storageService";
import { useAppData } from "../context/AppDataContext";

interface DashboardProps {
  stats: AssetStats;
  allAssets: Asset[];
}

const Dashboard: React.FC<DashboardProps> = ({ stats, allAssets }) => {
  const { projects } = useAppData();
  const [tickets, setTickets] = useState<IncidentReport[]>([]);
  const [requests, setRequests] = useState<AssetRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [queueTab, setQueueTab] = useState<"tasks" | "tickets" | "projects">(
    "tasks"
  );

  useEffect(() => {
    const unsub1 = listenToIncidents(setTickets);
    const unsub2 = listenToRequests(setRequests);
    const unsub3 = listenToTasks(setTasks);
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  const openWorkItems = useMemo(
    () =>
      tickets.filter(
        (t) => t.status !== "Resolved" && t.status !== "Rejected"
      ),
    [tickets]
  );

  const openTickets = useMemo(
    () => openWorkItems.filter((t) => (t.itemType || "Ticket") === "Ticket"),
    [openWorkItems]
  );

  const criticalTickets = useMemo(
    () => openWorkItems.filter((t) => t.priority === "Critical"),
    [openWorkItems]
  );

  const openTasks = useMemo(
    () => openWorkItems.filter((t) => t.itemType === "Task"),
    [openWorkItems]
  );

  const overdueTaskCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return openWorkItems.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      d.setHours(0, 0, 0, 0);
      return d < today;
    }).length;
  }, [openWorkItems]);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== "Completed"),
    [projects]
  );

  const pendingRequests = useMemo(
    () =>
      requests.filter((r) =>
        ["New", "Acknowledged", "Pending Finance", "Approved"].includes(
          r.status
        )
      ).length,
    [requests]
  );

  const storageAssets = Math.max(
    0,
    stats.totalAssets - stats.activeAssets - stats.repairAssets
  );
  const totalSafe = stats.totalAssets || 1;
  const activePct = Math.round((stats.activeAssets / totalSafe) * 100);
  const storagePct = Math.round((storageAssets / totalSafe) * 100);
  const repairPct = Math.max(0, 100 - activePct - storagePct);

  const venueLedger = useMemo(() => {
    const map = new Map<string, { name: string; count: number; value: number }>();
    allAssets.forEach((a) => {
      const name = a.location || "Unassigned";
      const cur = map.get(name) || { name, count: 0, value: 0 };
      cur.count++;
      cur.value += a.purchaseCost || 0;
      map.set(name, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [allAssets]);

  const warrantyAlerts = useMemo(() => {
    return allAssets
      .filter((a) => {
        if (a.status === "Retired") return false;
        const st = getWarrantyStatus(a.warrantyExpiry, 60);
        return st === "expiring" || st === "expired";
      })
      .sort((a, b) =>
        (a.warrantyExpiry || "").localeCompare(b.warrantyExpiry || "")
      )
      .slice(0, 5);
  }, [allAssets]);

  const computeProjectProgress = (p: (typeof projects)[number]) => {
    const ms = p.milestones || [];
    if (ms.length > 0) {
      return Math.round(
        (ms.filter((m) => m.status === "Completed").length / ms.length) * 100
      );
    }
    return p.progress || 0;
  };

  const priorityColor = (p: string) => {
    if (p === "Critical") return "text-[#DE350B] font-semibold";
    if (p === "High") return "text-[#D97706] font-medium";
    return "text-[#5E6C84] dark:text-[#94A3B8]";
  };

  return (
    <div className="space-y-5">
      {/* Page Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-[20px] font-semibold text-[#172B4D] dark:text-[#E6EDF5] tracking-tight">
            IT Operations
          </h1>
          <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8]">
            Operational queues, hardware fleet status, and venue asset allocation.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[13px]">
          <Link
            to="/executive"
            className="px-3 py-1.5 rounded border border-[#DFE3E8] dark:border-[#2A3444] bg-white dark:bg-[#161C26] text-[#172B4D] dark:text-[#E6EDF5] hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] font-medium transition-colors"
          >
            Executive Summary
          </Link>
          <Link
            to="/reports"
            className="px-3 py-1.5 rounded bg-[#0052CC] hover:bg-[#0043A8] text-white font-medium transition-colors"
          >
            Reports
          </Link>
        </div>
      </div>

      {/* Unified Enterprise Summary Bar (Meraki / Intune style) */}
      <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[#EBECF0] dark:divide-[#242E40]">
        <Link
          to="/repairs"
          className="p-4 hover:bg-[#F9FAFB] dark:hover:bg-[#1B2230] transition-colors"
        >
          <div className="text-[12px] font-medium text-[#5E6C84] dark:text-[#94A3B8]">
            Open tickets
          </div>
          <div className="text-[22px] font-semibold text-[#172B4D] dark:text-[#E6EDF5] tabular-nums mt-1">
            {openTickets.length}
          </div>
          <div
            className={`text-[12px] mt-0.5 ${
              criticalTickets.length > 0
                ? "text-[#DE350B] font-medium"
                : "text-[#6B778C]"
            }`}
          >
            {criticalTickets.length > 0
              ? `${criticalTickets.length} critical`
              : "No critical alerts"}
          </div>
        </Link>

        <Link
          to="/tasks"
          className="p-4 hover:bg-[#F9FAFB] dark:hover:bg-[#1B2230] transition-colors"
        >
          <div className="text-[12px] font-medium text-[#5E6C84] dark:text-[#94A3B8]">
            Open tasks
          </div>
          <div className="text-[22px] font-semibold text-[#172B4D] dark:text-[#E6EDF5] tabular-nums mt-1">
            {openTasks.length}
          </div>
          <div
            className={`text-[12px] mt-0.5 ${
              overdueTaskCount > 0
                ? "text-[#DE350B] font-medium"
                : "text-[#6B778C]"
            }`}
          >
            {overdueTaskCount > 0
              ? `${overdueTaskCount} overdue`
              : "All on schedule"}
          </div>
        </Link>

        <Link
          to="/planner"
          className="p-4 hover:bg-[#F9FAFB] dark:hover:bg-[#1B2230] transition-colors"
        >
          <div className="text-[12px] font-medium text-[#5E6C84] dark:text-[#94A3B8]">
            Active projects
          </div>
          <div className="text-[22px] font-semibold text-[#172B4D] dark:text-[#E6EDF5] tabular-nums mt-1">
            {activeProjects.length}
          </div>
          <div className="text-[12px] text-[#6B778C] mt-0.5">
            {pendingRequests} procurement pending
          </div>
        </Link>

        <Link
          to="/assets"
          className="p-4 hover:bg-[#F9FAFB] dark:hover:bg-[#1B2230] transition-colors"
        >
          <div className="text-[12px] font-medium text-[#5E6C84] dark:text-[#94A3B8]">
            Managed assets
          </div>
          <div className="text-[22px] font-semibold text-[#172B4D] dark:text-[#E6EDF5] tabular-nums mt-1">
            {stats.totalAssets}
          </div>
          <div className="text-[12px] text-[#00875A] dark:text-[#36B37E] mt-0.5">
            {activePct}% active deployed
          </div>
        </Link>

        <Link
          to="/reports"
          className="p-4 hover:bg-[#F9FAFB] dark:hover:bg-[#1B2230] transition-colors col-span-2 md:col-span-1"
        >
          <div className="text-[12px] font-medium text-[#5E6C84] dark:text-[#94A3B8]">
            Fleet valuation
          </div>
          <div className="text-[22px] font-semibold text-[#172B4D] dark:text-[#E6EDF5] tabular-nums mt-1">
            AED {stats.totalValue.toLocaleString()}
          </div>
          <div className="text-[12px] text-[#6B778C] mt-0.5">
            {stats.repairAssets} under repair
          </div>
        </Link>
      </div>

      {/* Main Split Workspace: Live Operational Table (2/3) + Fleet & Venue Ledger (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Live Operational Queues */}
        <div className="lg:col-span-8 bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-hidden">
          <div className="px-4 border-b border-[#DFE3E8] dark:border-[#242E40] flex items-center justify-between gap-2 bg-[#F9FAFB] dark:bg-[#1B2230]">
            <div className="flex items-center gap-5 text-[13px] overflow-x-auto">
              {[
                { id: "tasks", label: `Active tasks (${openTasks.length})` },
                { id: "tickets", label: `Open tickets (${openTickets.length})` },
                {
                  id: "projects",
                  label: `Active projects (${activeProjects.length})`,
                },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setQueueTab(t.id as any)}
                  className={`py-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
                    queueTab === t.id
                      ? "border-[#0052CC] text-[#0052CC] dark:text-[#4C9AFF] dark:border-[#4C9AFF]"
                      : "border-transparent text-[#5E6C84] dark:text-[#94A3B8] hover:text-[#172B4D] dark:hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <Link
              to={
                queueTab === "tasks"
                  ? "/tasks"
                  : queueTab === "tickets"
                  ? "/repairs"
                  : "/planner"
              }
              className="text-xs font-medium text-[#0052CC] dark:text-[#4C9AFF] hover:underline shrink-0"
            >
              Open full view
            </Link>
          </div>

          <div className="overflow-x-auto">
            {queueTab === "tasks" && (
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[#EBECF0] dark:border-[#242E40] text-[11px] font-semibold uppercase tracking-wide text-[#6B778C] bg-[#FAFBFC] dark:bg-[#181F2B]">
                    <th className="px-4 py-2.5">Task</th>
                    <th className="px-4 py-2.5">Venue</th>
                    <th className="px-4 py-2.5">Owner</th>
                    <th className="px-4 py-2.5">Priority</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBECF0] dark:divide-[#242E40]">
                  {openTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-[#6B778C]"
                      >
                        No active operational tasks.
                      </td>
                    </tr>
                  ) : (
                    openTasks.slice(0, 10).map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] transition-colors"
                      >
                        <td className="px-4 py-2.5 font-medium text-[#172B4D] dark:text-[#E6EDF5]">
                          {t.title || t.assetName}
                        </td>
                        <td className="px-4 py-2.5 text-[#5E6C84] dark:text-[#94A3B8]">
                          {t.location || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-[#172B4D] dark:text-[#CBD5E1]">
                          {t.assignedTo || "Unassigned"}
                        </td>
                        <td className={`px-4 py-2.5 ${priorityColor(t.priority)}`}>
                          {t.priority}
                        </td>
                        <td className="px-4 py-2.5 text-[#5E6C84] dark:text-[#94A3B8]">
                          {t.status}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-[#5E6C84] dark:text-[#94A3B8]">
                          {t.dueDate || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {queueTab === "tickets" && (
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[#EBECF0] dark:border-[#242E40] text-[11px] font-semibold uppercase tracking-wide text-[#6B778C] bg-[#FAFBFC] dark:bg-[#181F2B]">
                    <th className="px-4 py-2.5">Ticket</th>
                    <th className="px-4 py-2.5">Asset / Issue</th>
                    <th className="px-4 py-2.5">Venue</th>
                    <th className="px-4 py-2.5">Priority</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBECF0] dark:divide-[#242E40]">
                  {openTickets.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-[#6B778C]"
                      >
                        No open help desk tickets.
                      </td>
                    </tr>
                  ) : (
                    openTickets.slice(0, 10).map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] transition-colors"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-[#0052CC] dark:text-[#4C9AFF]">
                          {t.ticketNumber}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-[#172B4D] dark:text-[#E6EDF5]">
                          {t.assetName}
                          <div className="text-xs font-normal text-[#6B778C] truncate max-w-xs">
                            {t.description}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-[#5E6C84] dark:text-[#94A3B8]">
                          {t.location}
                        </td>
                        <td className={`px-4 py-2.5 ${priorityColor(t.priority)}`}>
                          {t.priority}
                        </td>
                        <td className="px-4 py-2.5 text-[#5E6C84] dark:text-[#94A3B8]">
                          {t.status}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {queueTab === "projects" && (
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[#EBECF0] dark:border-[#242E40] text-[11px] font-semibold uppercase tracking-wide text-[#6B778C] bg-[#FAFBFC] dark:bg-[#181F2B]">
                    <th className="px-4 py-2.5">Project</th>
                    <th className="px-4 py-2.5">Venue</th>
                    <th className="px-4 py-2.5">Progress</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBECF0] dark:divide-[#242E40]">
                  {activeProjects.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-[#6B778C]"
                      >
                        No active IT projects.
                      </td>
                    </tr>
                  ) : (
                    activeProjects.map((p) => {
                      const pct = computeProjectProgress(p);
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] transition-colors"
                        >
                          <td className="px-4 py-2.5 font-medium text-[#172B4D] dark:text-[#E6EDF5]">
                            {p.name}
                          </td>
                          <td className="px-4 py-2.5 text-[#5E6C84] dark:text-[#94A3B8]">
                            {p.venue || "Multi-Venue"}
                          </td>
                          <td className="px-4 py-2.5 w-36">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-[#EBECF0] dark:bg-[#242E40] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#0052CC] rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="font-mono text-xs tabular-nums text-[#5E6C84]">
                                {pct}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-[#5E6C84] dark:text-[#94A3B8]">
                            {p.status}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-[#5E6C84]">
                            {p.targetDate || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Fleet Health + Venue Valuation + Warranty Rail */}
        <div className="lg:col-span-4 space-y-5">
          {/* Fleet Health Segmented Bar */}
          <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
                Fleet health
              </h2>
              <span className="text-xs text-[#6B778C] tabular-nums">
                {stats.totalAssets} total
              </span>
            </div>

            <div className="h-2 w-full rounded-sm overflow-hidden flex bg-[#EBECF0] dark:bg-[#242E40]">
              {stats.totalAssets > 0 && (
                <>
                  <div
                    className="bg-[#00875A] h-full"
                    style={{ width: `${activePct}%` }}
                  />
                  <div
                    className="bg-[#6B778C] h-full"
                    style={{ width: `${storagePct}%` }}
                  />
                  <div
                    className="bg-[#FF991F] h-full"
                    style={{ width: `${repairPct}%` }}
                  />
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
              <div>
                <div className="text-[#6B778C]">Active</div>
                <div className="font-semibold text-[#172B4D] dark:text-[#E6EDF5] tabular-nums mt-0.5">
                  {stats.activeAssets}
                </div>
              </div>
              <div>
                <div className="text-[#6B778C]">In storage</div>
                <div className="font-semibold text-[#172B4D] dark:text-[#E6EDF5] tabular-nums mt-0.5">
                  {storageAssets}
                </div>
              </div>
              <div>
                <div className="text-[#6B778C]">Under repair</div>
                <div className="font-semibold text-[#D97706] tabular-nums mt-0.5">
                  {stats.repairAssets}
                </div>
              </div>
            </div>
          </div>

          {/* Venue Asset Ledger */}
          <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#EBECF0] dark:border-[#242E40] flex items-center justify-between bg-[#F9FAFB] dark:bg-[#1B2230]">
              <h2 className="text-[13px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
                Asset value by venue
              </h2>
              <Link
                to="/venues"
                className="text-xs text-[#0052CC] dark:text-[#4C9AFF] hover:underline"
              >
                Venues
              </Link>
            </div>
            <table className="w-full text-left text-[12px]">
              <tbody className="divide-y divide-[#EBECF0] dark:divide-[#242E40]">
                {venueLedger.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-[#6B778C]">
                      No venue data yet.
                    </td>
                  </tr>
                ) : (
                  venueLedger.map((v) => (
                    <tr key={v.name}>
                      <td className="px-4 py-2 font-medium text-[#172B4D] dark:text-[#E6EDF5] truncate max-w-[160px]">
                        {v.name}
                      </td>
                      <td className="px-2 py-2 text-right text-[#6B778C] tabular-nums">
                        {v.count}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-[#172B4D] dark:text-[#CBD5E1]">
                        AED {v.value.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Upcoming Warranties */}
          <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#EBECF0] dark:border-[#242E40] flex items-center justify-between bg-[#F9FAFB] dark:bg-[#1B2230]">
              <h2 className="text-[13px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
                Warranty expirations
              </h2>
              <Link
                to="/reports"
                className="text-xs text-[#0052CC] dark:text-[#4C9AFF] hover:underline"
              >
                Forecast
              </Link>
            </div>
            <div className="divide-y divide-[#EBECF0] dark:divide-[#242E40]">
              {warrantyAlerts.length === 0 ? (
                <div className="px-4 py-5 text-xs text-[#6B778C]">
                  No warranties expiring within 60 days.
                </div>
              ) : (
                warrantyAlerts.map((a) => {
                  const expired = getWarrantyStatus(a.warrantyExpiry) === "expired";
                  return (
                    <div
                      key={a.id}
                      className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-[#172B4D] dark:text-[#E6EDF5] truncate">
                          {a.name}
                        </div>
                        <div className="text-[#6B778C] truncate">{a.location}</div>
                      </div>
                      <span
                        className={`font-mono shrink-0 ${
                          expired
                            ? "text-[#DE350B] font-semibold"
                            : "text-[#D97706] font-medium"
                        }`}
                      >
                        {expired ? "Expired" : a.warrantyExpiry}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
