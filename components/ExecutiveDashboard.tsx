import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  IncidentReport,
  Task,
  Venue,
  VenueVisit,
} from "../types";
import {
  listenToIncidents,
  listenToTasks,
  listenToVenues,
  listenToVenueVisits,
  getStats,
  getWarrantyStatus,
} from "../services/storageService";
import { useAppData } from "../context/AppDataContext";
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  FolderKanban,
  ClipboardList,
  Scale,
  Box,
  CalendarClock,
  Activity,
  Building2,
  ArrowRight,
  Clock,
  CheckCircle2,
} from "lucide-react";

const ExecutiveDashboard: React.FC = () => {
  const { assets, projects, notifications } = useAppData();
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

  // Operational metrics
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
    () => tasks.filter((t) => t.status !== "Completed"),
    [tasks]
  );

  const overdueTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return outstandingTasks.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      d.setHours(0, 0, 0, 0);
      return d < today;
    });
  }, [outstandingTasks]);

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
      requestedAt: string;
    }[] = [];
    projects.forEach((p) => {
      (p.decisionsRequired || [])
        .filter((d) => d.status === "Pending")
        .forEach((d) => {
          list.push({
            id: d.id,
            projectName: p.name,
            title: d.title,
            details: d.details,
            requestedAt: d.requestedAt,
          });
        });
    });
    return list;
  }, [projects]);

  const expiringWarrantyAssets = useMemo(() => {
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

  // Overall Operational Status
  const healthStatus = useMemo(() => {
    if (criticalTickets.length > 0) {
      return {
        level: "critical" as const,
        label: "Critical Attention Required",
        summary: `${criticalTickets.length} critical issue${
          criticalTickets.length > 1 ? "s" : ""
        } active across operations.`,
      };
    }
    if (overdueTasks.length > 0 || pendingDecisions.length > 0) {
      return {
        level: "warning" as const,
        label: "Operational — Action Items Pending",
        summary: `${overdueTasks.length} overdue task${
          overdueTasks.length === 1 ? "" : "s"
        } • ${pendingDecisions.length} management decision${
          pendingDecisions.length === 1 ? "" : "s"
        } pending.`,
      };
    }
    return {
      level: "healthy" as const,
      label: "All IT Operations Healthy",
      summary: `${venues.length || "All"} venues monitored • ${
        activeProjects.length
      } active project${activeProjects.length === 1 ? "" : "s"}.`,
    };
  }, [
    criticalTickets.length,
    overdueTasks.length,
    pendingDecisions.length,
    venues.length,
    activeProjects.length,
  ]);

  const computeProjectProgress = (p: (typeof projects)[number]) => {
    const ms = p.milestones || [];
    if (ms.length > 0) {
      return Math.round(
        (ms.filter((m) => m.status === "Completed").length / ms.length) * 100
      );
    }
    return p.progress || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Executive IT Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time visibility into EATX IT operations, projects, decisions, and assets.
          </p>
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Updated {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Overall Operational Health Banner */}
      <div
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          healthStatus.level === "critical"
            ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
            : healthStatus.level === "warning"
            ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60"
            : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60"
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              healthStatus.level === "critical"
                ? "bg-red-600 text-white"
                : healthStatus.level === "warning"
                ? "bg-amber-500 text-white"
                : "bg-emerald-600 text-white"
            }`}
          >
            {healthStatus.level === "critical" ? (
              <AlertOctagon size={22} />
            ) : healthStatus.level === "warning" ? (
              <AlertTriangle size={22} />
            ) : (
              <ShieldCheck size={22} />
            )}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Overall IT Status
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {healthStatus.label}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              {healthStatus.summary}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Link
            to="/venues"
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-sm"
          >
            <Building2 size={14} /> {venues.length} Venues
          </Link>
        </div>
      </div>

      {/* Executive KPI Grid (2-col mobile, 4-col desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link
          to="/planner"
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Active Projects
            </span>
            <FolderKanban size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {activeProjects.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {pendingDecisions.length} awaiting decision
          </div>
        </Link>

        <Link
          to="/tasks"
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Open Tasks
            </span>
            <ClipboardList size={16} className="text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {outstandingTasks.length}
          </div>
          <div
            className={`text-xs mt-1 font-medium ${
              overdueTasks.length > 0
                ? "text-red-600 dark:text-red-400"
                : "text-slate-500"
            }`}
          >
            {overdueTasks.length} overdue
          </div>
        </Link>

        <Link
          to="/repairs"
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Critical Issues
            </span>
            <AlertOctagon size={16} className="text-red-500" />
          </div>
          <div
            className={`text-2xl sm:text-3xl font-bold ${
              criticalTickets.length > 0
                ? "text-red-600 dark:text-red-400"
                : "text-slate-900 dark:text-white"
            }`}
          >
            {criticalTickets.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {openTickets.length} total open tickets
          </div>
        </Link>

        <Link
          to="/assets"
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Asset Fleet
            </span>
            <Box size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {assetStats.totalAssets}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            AED {assetStats.totalValue.toLocaleString()}
          </div>
        </Link>
      </div>

      {/* Section 1: Items Awaiting Management Decisions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
            <Scale size={18} className="text-amber-500" />
            Awaiting Management Decisions ({pendingDecisions.length})
          </h3>
          <Link
            to="/planner"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
          >
            View Projects <ArrowRight size={13} />
          </Link>
        </div>

        {pendingDecisions.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm text-slate-500 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            No pending decisions requiring leadership sign-off.
          </div>
        ) : (
          <div className="space-y-2.5">
            {pendingDecisions.map((d) => (
              <div
                key={d.id}
                className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-900/10"
              >
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  {d.projectName}
                </div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white mt-0.5">
                  {d.title}
                </div>
                {d.details && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {d.details}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Active Projects & Overdue/Critical Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
              <FolderKanban size={18} className="text-blue-500" />
              Active IT Projects
            </h3>
            <Link
              to="/planner"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              All Projects
            </Link>
          </div>
          {activeProjects.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">No active projects.</p>
          ) : (
            <div className="space-y-3.5">
              {activeProjects.slice(0, 5).map((p) => {
                const pct = computeProjectProgress(p);
                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {p.name}
                      </span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                      <span>{p.venue || "Multi-Venue"}</span>
                      <span>Target: {p.targetDate || "TBD"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Overdue Tasks & Critical Tickets */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
              <AlertTriangle size={18} className="text-red-500" />
              Overdue Tasks & Critical Issues
            </h3>
            <Link
              to="/tasks"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Task Board
            </Link>
          </div>
          {criticalTickets.length === 0 && overdueTasks.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={16} /> No critical incidents or overdue tasks.
            </div>
          ) : (
            <div className="space-y-2.5">
              {criticalTickets.slice(0, 3).map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-red-700 dark:text-red-400">
                    <span>CRITICAL TICKET • {t.ticketNumber}</span>
                    <span>{t.location}</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                    {t.assetName} — {t.description}
                  </div>
                </div>
              ))}
              {overdueTasks.slice(0, 4).map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-900/10 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {t.title}
                    </div>
                    <div className="text-xs text-slate-500">
                      Owner: {t.assignedTo || "Unassigned"} • Due: {t.dueDate}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-600 text-white">
                    Overdue
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Upcoming Warranty Expirations & Recent IT Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Warranty Expirations */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
              <CalendarClock size={18} className="text-amber-500" />
              Warranty Expirations (Next 60 Days)
            </h3>
            <Link
              to="/assets"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Registry
            </Link>
          </div>
          {expiringWarrantyAssets.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">
              No hardware warranties expiring within 60 days.
            </p>
          ) : (
            <div className="space-y-2">
              {expiringWarrantyAssets.map((a) => {
                const expired = getWarrantyStatus(a.warrantyExpiry) === "expired";
                return (
                  <div
                    key={a.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {a.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {a.location} • {a.category}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        expired
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                      }`}
                    >
                      {expired ? "Expired" : a.warrantyExpiry}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent IT Activity */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
              <Activity size={18} className="text-emerald-500" />
              Recent IT Activity
            </h3>
          </div>
          {notifications.length === 0 && visits.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">No recent activity logged yet.</p>
          ) : (
            <div className="space-y-2.5">
              {visits.slice(0, 3).map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800"
                >
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    Site Visit • {v.venueName}
                  </div>
                  <div className="text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                    {v.technician}: {v.purpose} — {v.findings}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Clock size={11} /> {v.visitDate}
                  </div>
                </div>
              ))}
              {notifications.slice(0, 4).map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800"
                >
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {n.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{n.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
