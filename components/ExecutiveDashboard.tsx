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
import { ArrowUpRight, CheckCircle2, Clock } from "lucide-react";
import { MetricTile, OpsPanel, StatusPill } from "./ui/OpsPrimitives";

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

  const health = useMemo(() => {
    if (criticalTickets.length > 0) {
      return {
        tone: "red" as const,
        label: "Critical Issues Active",
        summary: `${criticalTickets.length} critical ticket(s) require immediate attention.`,
      };
    }
    if (overdueTasks.length > 0 || pendingDecisions.length > 0) {
      return {
        tone: "amber" as const,
        label: "Operational — Action Items Pending",
        summary: `${overdueTasks.length} overdue task(s) • ${pendingDecisions.length} leadership decision(s) awaiting review.`,
      };
    }
    return {
      tone: "emerald" as const,
      label: "All Systems Operational",
      summary: `${venues.length || 28} venues monitored • ${activeProjects.length} active project(s).`,
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
    <div className="space-y-5">
      {/* Executive Status Strip */}
      <div className="bg-white dark:bg-[#12151C] border border-[#E4E6EB] dark:border-[#222733] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg font-semibold tracking-tight text-[#111318] dark:text-[#F1F3F7]">
              Executive IT Summary
            </h1>
            <StatusPill
              label={health.label}
              tone={health.tone}
              pulse={health.tone === "red"}
            />
          </div>
          <p className="text-xs text-[#5A6270] dark:text-[#8B94A5]">
            {health.summary}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-[11px] text-[#8C95A6]">
            {new Date().toLocaleDateString()}
          </span>
          <Link
            to="/venues"
            className="h-7 px-2.5 rounded-md border border-[#E4E6EB] dark:border-[#222733] bg-[#F8F9FB] dark:bg-[#181C25] text-[#111318] dark:text-[#F1F3F7] font-medium inline-flex items-center gap-1"
          >
            {venues.length} Venues <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      {/* Executive KPI Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricTile
          label="Active Projects"
          value={activeProjects.length}
          subtext={`${pendingDecisions.length} pending decision(s)`}
          tone="blue"
          to="/planner"
        />
        <MetricTile
          label="Outstanding Tasks"
          value={outstandingTasks.length}
          subtext={`${overdueTasks.length} overdue`}
          tone={overdueTasks.length > 0 ? "red" : "emerald"}
          alert={overdueTasks.length > 0}
          to="/tasks"
        />
        <MetricTile
          label="Critical Issues"
          value={criticalTickets.length}
          subtext={`${openTickets.length} total open tickets`}
          tone={criticalTickets.length > 0 ? "red" : "emerald"}
          alert={criticalTickets.length > 0}
          to="/repairs"
        />
        <MetricTile
          label="Asset Portfolio"
          value={assetStats.totalAssets}
          subtext={`AED ${assetStats.totalValue.toLocaleString()}`}
          tone="slate"
          to="/assets"
        />
      </div>

      {/* Decisions Required */}
      <OpsPanel
        title={`Management Decisions Required (${pendingDecisions.length})`}
        action={
          <Link
            to="/planner"
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            Projects <ArrowUpRight size={12} />
          </Link>
        }
      >
        {pendingDecisions.length === 0 ? (
          <div className="text-xs text-[#5A6270] dark:text-[#8B94A5] flex items-center gap-2 py-1">
            <CheckCircle2 size={14} className="text-emerald-500" />
            No pending decisions requiring management approval.
          </div>
        ) : (
          <div className="divide-y divide-[#E4E6EB] dark:divide-[#222733] -my-1">
            {pendingDecisions.map((d) => (
              <div
                key={d.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="font-mono text-[10px] uppercase text-amber-600 dark:text-amber-400 font-semibold">
                    {d.projectName}
                  </div>
                  <div className="text-sm font-medium text-[#111318] dark:text-[#F1F3F7] mt-0.5">
                    {d.title}
                  </div>
                  {d.details && (
                    <div className="text-xs text-[#5A6270] dark:text-[#8B94A5] mt-0.5">
                      {d.details}
                    </div>
                  )}
                </div>
                <StatusPill label="Pending" tone="amber" />
              </div>
            ))}
          </div>
        )}
      </OpsPanel>

      {/* Projects & Risks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OpsPanel
          title="Active IT Projects"
          action={
            <Link
              to="/planner"
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all
            </Link>
          }
        >
          {activeProjects.length === 0 ? (
            <div className="text-xs text-[#8C95A6] py-3">No active projects.</div>
          ) : (
            <div className="divide-y divide-[#E4E6EB] dark:divide-[#222733] -my-1">
              {activeProjects.slice(0, 5).map((p) => {
                const pct = computeProjectProgress(p);
                return (
                  <div key={p.id} className="py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[#111318] dark:text-[#F1F3F7] truncate">
                        {p.name}
                      </span>
                      <span className="font-mono text-xs font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#F4F5F7] dark:bg-[#181C25] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-[#8C95A6]">
                      <span>{p.venue || "Multi-Venue"}</span>
                      <span className="font-mono">Target {p.targetDate || "TBD"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </OpsPanel>

        <OpsPanel
          title="Overdue Tasks & Critical Issues"
          action={
            <Link
              to="/tasks"
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Task Board
            </Link>
          }
        >
          {criticalTickets.length === 0 && overdueTasks.length === 0 ? (
            <div className="text-xs text-[#5A6270] dark:text-[#8B94A5] flex items-center gap-2 py-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              Zero critical incidents or overdue tasks.
            </div>
          ) : (
            <div className="divide-y divide-[#E4E6EB] dark:divide-[#222733] -my-1">
              {criticalTickets.slice(0, 3).map((t) => (
                <div key={t.id} className="py-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] text-red-600 dark:text-red-400 font-semibold">
                      {t.ticketNumber} • {t.location}
                    </div>
                    <div className="text-sm font-medium text-[#111318] dark:text-[#F1F3F7] truncate">
                      {t.assetName} — {t.description}
                    </div>
                  </div>
                  <StatusPill label="Critical" tone="red" />
                </div>
              ))}
              {overdueTasks.slice(0, 4).map((t) => (
                <div key={t.id} className="py-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#111318] dark:text-[#F1F3F7] truncate">
                      {t.title}
                    </div>
                    <div className="text-xs text-[#5A6270] dark:text-[#8B94A5]">
                      {t.assignedTo || "Unassigned"} • Due{" "}
                      <span className="font-mono">{t.dueDate}</span>
                    </div>
                  </div>
                  <StatusPill label="Overdue" tone="red" />
                </div>
              ))}
            </div>
          )}
        </OpsPanel>
      </div>

      {/* Warranties & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OpsPanel
          title="Warranty Expirations (60 Days)"
          action={
            <Link
              to="/reports"
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Full Forecast
            </Link>
          }
        >
          {expiringWarrantyAssets.length === 0 ? (
            <div className="text-xs text-[#8C95A6] py-2">
              No hardware warranties expiring within 60 days.
            </div>
          ) : (
            <div className="divide-y divide-[#E4E6EB] dark:divide-[#222733] -my-1">
              {expiringWarrantyAssets.map((a) => {
                const expired = getWarrantyStatus(a.warrantyExpiry) === "expired";
                return (
                  <div
                    key={a.id}
                    className="py-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#111318] dark:text-[#F1F3F7] truncate">
                        {a.name}
                      </div>
                      <div className="text-xs text-[#5A6270] dark:text-[#8B94A5]">
                        {a.location} • {a.category}
                      </div>
                    </div>
                    <StatusPill
                      label={expired ? "Expired" : a.warrantyExpiry || ""}
                      tone={expired ? "red" : "amber"}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </OpsPanel>

        <OpsPanel title="Recent IT Activity">
          {notifications.length === 0 && visits.length === 0 ? (
            <div className="text-xs text-[#8C95A6] py-2">
              No recent IT activity recorded.
            </div>
          ) : (
            <div className="divide-y divide-[#E4E6EB] dark:divide-[#222733] -my-1">
              {visits.slice(0, 3).map((v) => (
                <div key={v.id} className="py-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      Site Visit • {v.venueName}
                    </span>
                    <span className="font-mono text-[10px] text-[#8C95A6] inline-flex items-center gap-1">
                      <Clock size={10} /> {v.visitDate}
                    </span>
                  </div>
                  <div className="text-xs text-[#111318] dark:text-[#F1F3F7] mt-0.5">
                    {v.technician}: {v.purpose} — {v.findings}
                  </div>
                </div>
              ))}
              {notifications.slice(0, 4).map((n) => (
                <div key={n.id} className="py-2.5">
                  <div className="text-xs font-semibold text-[#111318] dark:text-[#F1F3F7]">
                    {n.title}
                  </div>
                  <div className="text-xs text-[#5A6270] dark:text-[#8B94A5] mt-0.5">
                    {n.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </OpsPanel>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
