import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { IncidentReport, Task, Venue, VenueVisit } from "../types";
import {
  listenToIncidents,
  listenToTasks,
  listenToVenues,
  listenToVenueVisits,
  getStats,
  getWarrantyStatus,
} from "../services/storageService";
import { useAppData } from "../context/AppDataContext";

const ExecutiveDashboard: React.FC = () => {
  const { assets, projects } = useAppData();
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [visits, setVisits] = useState<VenueVisit[]>([]);

  useEffect(() => {
    const u1 = listenToIncidents(setIncidents);
    const u2 = listenToTasks(setTasks);
    const u3 = listenToVenues(setVenues);
    const u4 = listenToVenueVisits(setVisits);
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, []);

  const assetStats = useMemo(() => getStats(assets), [assets]);

  const openTickets = useMemo(
    () =>
      incidents.filter(
        (i) => i.status !== "Resolved" && i.status !== "Rejected"
      ),
    [incidents]
  );

  const criticalTickets = useMemo(
    () => openTickets.filter((i) => i.priority === "Critical"),
    [openTickets]
  );

  const outstandingTasks = useMemo(
    () => openTickets.filter((t) => t.itemType === "Task"),
    [openTickets]
  );

  const overdueTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return openTickets.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      d.setHours(0, 0, 0, 0);
      return d < today;
    });
  }, [openTickets]);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== "Completed"),
    [projects]
  );

  const pendingDecisions = useMemo(() => {
    const list: {
      id: string;
      projectName: string;
      title: string;
      details?: string;
    }[] = [];
    projects.forEach((p) => {
      (p.decisionsRequired || [])
        .filter((d) => d.status === "Pending")
        .forEach((d) =>
          list.push({
            id: d.id,
            projectName: p.name,
            title: d.title,
            details: d.details,
          })
        );
    });
    return list;
  }, [projects]);

  const expiringWarranties = useMemo(() => {
    return assets
      .filter((a) => {
        if (a.status === "Retired") return false;
        const st = getWarrantyStatus(a.warrantyExpiry, 60);
        return st === "expiring" || st === "expired";
      })
      .sort((a, b) =>
        (a.warrantyExpiry || "").localeCompare(b.warrantyExpiry || "")
      )
      .slice(0, 6);
  }, [assets]);

  const health = useMemo(() => {
    if (criticalTickets.length > 0) {
      return {
        border: "border-l-[#DE350B]",
        badgeText: "text-[#DE350B]",
        title: "Critical attention required",
        summary: `${criticalTickets.length} critical ticket(s) currently open across EATX venues.`,
      };
    }
    if (overdueTasks.length > 0 || pendingDecisions.length > 0) {
      return {
        border: "border-l-[#FF991F]",
        badgeText: "text-[#D97706]",
        title: "Operational with pending items",
        summary: `${overdueTasks.length} overdue task(s) and ${pendingDecisions.length} item(s) awaiting management decision.`,
      };
    }
    return {
      border: "border-l-[#00875A]",
      badgeText: "text-[#00875A] dark:text-[#36B37E]",
      title: "All IT operations healthy",
      summary: `${venues.length || 28} venues monitored, ${activeProjects.length} active project(s), zero critical incidents.`,
    };
  }, [
    criticalTickets.length,
    overdueTasks.length,
    pendingDecisions.length,
    venues.length,
    activeProjects.length,
  ]);

  const computeProgress = (p: (typeof projects)[number]) => {
    const ms = p.milestones || [];
    if (ms.length > 0) {
      return Math.round(
        (ms.filter((m) => m.status === "Completed").length / ms.length) * 100
      );
    }
    return p.progress || 0;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-[20px] font-semibold text-[#172B4D] dark:text-[#E6EDF5] tracking-tight">
            Executive IT Summary
          </h1>
          <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8]">
            EATX Group IT operations, project delivery, and asset accountability.
          </p>
        </div>
        <div className="text-xs text-[#6B778C]">
          As of {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Operational Status Bar */}
      <div
        className={`bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] border-l-4 ${health.border} rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2`}
      >
        <div>
          <div className={`text-[13px] font-semibold ${health.badgeText}`}>
            {health.title}
          </div>
          <div className="text-[13px] text-[#42526E] dark:text-[#CBD5E1] mt-0.5">
            {health.summary}
          </div>
        </div>
        <Link
          to="/venues"
          className="text-xs font-medium text-[#0052CC] dark:text-[#4C9AFF] hover:underline shrink-0"
        >
          View {venues.length} venues
        </Link>
      </div>

      {/* Unified Executive Summary Strip */}
      <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#EBECF0] dark:divide-[#242E40]">
        <div className="p-4">
          <div className="text-[12px] text-[#5E6C84] dark:text-[#94A3B8]">
            Active projects
          </div>
          <div className="text-[22px] font-semibold text-[#172B4D] dark:text-[#E6EDF5] tabular-nums mt-1">
            {activeProjects.length}
          </div>
          <div className="text-[12px] text-[#6B778C] mt-0.5">
            {pendingDecisions.length} awaiting decision
          </div>
        </div>
        <div className="p-4">
          <div className="text-[12px] text-[#5E6C84] dark:text-[#94A3B8]">
            Outstanding tasks
          </div>
          <div className="text-[22px] font-semibold text-[#172B4D] dark:text-[#E6EDF5] tabular-nums mt-1">
            {outstandingTasks.length}
          </div>
          <div
            className={`text-[12px] mt-0.5 ${
              overdueTasks.length > 0
                ? "text-[#DE350B] font-medium"
                : "text-[#6B778C]"
            }`}
          >
            {overdueTasks.length} overdue
          </div>
        </div>
        <div className="p-4">
          <div className="text-[12px] text-[#5E6C84] dark:text-[#94A3B8]">
            Critical issues
          </div>
          <div
            className={`text-[22px] font-semibold tabular-nums mt-1 ${
              criticalTickets.length > 0
                ? "text-[#DE350B]"
                : "text-[#172B4D] dark:text-[#E6EDF5]"
            }`}
          >
            {criticalTickets.length}
          </div>
          <div className="text-[12px] text-[#6B778C] mt-0.5">
            {openTickets.length} open help desk tickets
          </div>
        </div>
        <div className="p-4">
          <div className="text-[12px] text-[#5E6C84] dark:text-[#94A3B8]">
            IT asset portfolio
          </div>
          <div className="text-[22px] font-semibold text-[#172B4D] dark:text-[#E6EDF5] tabular-nums mt-1">
            {assetStats.totalAssets}
          </div>
          <div className="text-[12px] text-[#6B778C] mt-0.5">
            AED {assetStats.totalValue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Management Decisions Table */}
      <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-[#EBECF0] dark:border-[#242E40] flex items-center justify-between bg-[#F9FAFB] dark:bg-[#1B2230]">
          <h2 className="text-[13px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
            Items awaiting management decision ({pendingDecisions.length})
          </h2>
          <Link
            to="/planner"
            className="text-xs font-medium text-[#0052CC] dark:text-[#4C9AFF] hover:underline"
          >
            Open projects
          </Link>
        </div>
        {pendingDecisions.length === 0 ? (
          <div className="px-4 py-5 text-[13px] text-[#5E6C84] dark:text-[#94A3B8]">
            No items currently awaiting management sign-off.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[#EBECF0] dark:border-[#242E40] text-[11px] font-semibold uppercase tracking-wide text-[#6B778C]">
                  <th className="px-4 py-2">Project</th>
                  <th className="px-4 py-2">Decision required</th>
                  <th className="px-4 py-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBECF0] dark:divide-[#242E40]">
                {pendingDecisions.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-2.5 font-medium text-[#0052CC] dark:text-[#4C9AFF] whitespace-nowrap">
                      {d.projectName}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-[#172B4D] dark:text-[#E6EDF5]">
                      {d.title}
                    </td>
                    <td className="px-4 py-2.5 text-[#5E6C84] dark:text-[#94A3B8]">
                      {d.details || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Projects & Risks Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EBECF0] dark:border-[#242E40] flex items-center justify-between bg-[#F9FAFB] dark:bg-[#1B2230]">
            <h2 className="text-[13px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
              Active IT projects
            </h2>
            <Link
              to="/planner"
              className="text-xs font-medium text-[#0052CC] dark:text-[#4C9AFF] hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[#EBECF0] dark:border-[#242E40] text-[11px] font-semibold uppercase tracking-wide text-[#6B778C]">
                  <th className="px-4 py-2">Project</th>
                  <th className="px-4 py-2">Progress</th>
                  <th className="px-4 py-2 text-right">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBECF0] dark:divide-[#242E40]">
                {activeProjects.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-[#6B778C]"
                    >
                      No active projects.
                    </td>
                  </tr>
                ) : (
                  activeProjects.slice(0, 6).map((p) => {
                    const pct = computeProgress(p);
                    return (
                      <tr key={p.id}>
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-[#172B4D] dark:text-[#E6EDF5]">
                            {p.name}
                          </div>
                          <div className="text-xs text-[#6B778C]">
                            {p.venue || "Multi-Venue"}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 w-32">
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
                        <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-[#5E6C84]">
                          {p.targetDate || "TBD"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Overdue & Critical */}
        <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EBECF0] dark:border-[#242E40] flex items-center justify-between bg-[#F9FAFB] dark:bg-[#1B2230]">
            <h2 className="text-[13px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
              Overdue tasks & critical issues
            </h2>
            <Link
              to="/tasks"
              className="text-xs font-medium text-[#0052CC] dark:text-[#4C9AFF] hover:underline"
            >
              Tasks
            </Link>
          </div>
          {criticalTickets.length === 0 && overdueTasks.length === 0 ? (
            <div className="px-4 py-6 text-[13px] text-[#00875A] dark:text-[#36B37E]">
              No critical issues or overdue tasks.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[#EBECF0] dark:border-[#242E40] text-[11px] font-semibold uppercase tracking-wide text-[#6B778C]">
                    <th className="px-4 py-2">Item</th>
                    <th className="px-4 py-2">Owner / Venue</th>
                    <th className="px-4 py-2 text-right">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBECF0] dark:divide-[#242E40]">
                  {criticalTickets.slice(0, 3).map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2.5 font-medium text-[#172B4D] dark:text-[#E6EDF5]">
                        {t.ticketNumber}: {t.assetName}
                      </td>
                      <td className="px-4 py-2.5 text-[#5E6C84] dark:text-[#94A3B8]">
                        {t.location}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-[#DE350B]">
                        Critical
                      </td>
                    </tr>
                  ))}
                  {overdueTasks.slice(0, 5).map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2.5 font-medium text-[#172B4D] dark:text-[#E6EDF5]">
                        {t.title || t.assetName}
                      </td>
                      <td className="px-4 py-2.5 text-[#5E6C84] dark:text-[#94A3B8]">
                        {t.assignedTo || "Unassigned"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-[#DE350B]">
                        {t.dueDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Warranties & Recent Visits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EBECF0] dark:border-[#242E40] flex items-center justify-between bg-[#F9FAFB] dark:bg-[#1B2230]">
            <h2 className="text-[13px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
              Upcoming warranty expirations
            </h2>
            <Link
              to="/reports"
              className="text-xs font-medium text-[#0052CC] dark:text-[#4C9AFF] hover:underline"
            >
              Full forecast
            </Link>
          </div>
          {expiringWarranties.length === 0 ? (
            <div className="px-4 py-5 text-[13px] text-[#6B778C]">
              No warranties expiring within 60 days.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-[13px]">
              <tbody className="divide-y divide-[#EBECF0] dark:divide-[#242E40]">
                {expiringWarranties.map((a) => {
                  const expired = getWarrantyStatus(a.warrantyExpiry) === "expired";
                  return (
                    <tr key={a.id}>
                      <td className="px-4 py-2.5 font-medium text-[#172B4D] dark:text-[#E6EDF5]">
                        {a.name}
                      </td>
                      <td className="px-4 py-2.5 text-[#5E6C84] dark:text-[#94A3B8]">
                        {a.location}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono text-xs ${
                          expired
                            ? "text-[#DE350B] font-semibold"
                            : "text-[#D97706]"
                        }`}
                      >
                        {expired ? "Expired" : a.warrantyExpiry}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EBECF0] dark:border-[#242E40] flex items-center justify-between bg-[#F9FAFB] dark:bg-[#1B2230]">
            <h2 className="text-[13px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
              Recent venue site visits
            </h2>
            <Link
              to="/venues"
              className="text-xs font-medium text-[#0052CC] dark:text-[#4C9AFF] hover:underline"
            >
              Venues
            </Link>
          </div>
          {visits.length === 0 ? (
            <div className="px-4 py-5 text-[13px] text-[#6B778C]">
              No venue site visits logged yet.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-[13px]">
              <tbody className="divide-y divide-[#EBECF0] dark:divide-[#242E40]">
                {visits.slice(0, 5).map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-2.5 font-medium text-[#172B4D] dark:text-[#E6EDF5]">
                      {v.venueName}
                      <div className="text-xs font-normal text-[#6B778C]">
                        {v.technician} • {v.purpose}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-[#5E6C84]">
                      {v.visitDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
