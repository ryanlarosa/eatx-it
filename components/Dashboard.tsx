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
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { ArrowUpRight } from "lucide-react";
import {
  listenToIncidents,
  listenToRequests,
  listenToTasks,
  getAllUsers,
} from "../services/storageService";
import { MetricTile, OpsPanel, StatusPill } from "./ui/OpsPrimitives";

interface DashboardProps {
  stats: AssetStats;
  allAssets: Asset[];
}

const Dashboard: React.FC<DashboardProps> = ({ stats, allAssets }) => {
  const [tickets, setTickets] = useState<IncidentReport[]>([]);
  const [requests, setRequests] = useState<AssetRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    const unsub1 = listenToIncidents(setTickets);
    const unsub2 = listenToRequests(setRequests);
    const unsub3 = listenToTasks(setTasks);
    getAllUsers()
      .then((u) => setUserCount(u.length))
      .catch(() => {});
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  const openTickets = tickets.filter(
    (t) => t.status !== "Resolved" && t.status !== "Rejected"
  ).length;
  const criticalTickets = tickets.filter(
    (t) =>
      t.status !== "Resolved" &&
      t.status !== "Rejected" &&
      t.priority === "Critical"
  ).length;
  const pendingRequests = requests.filter((r) =>
    ["New", "Acknowledged", "Pending Finance", "Approved"].includes(r.status)
  ).length;
  const pendingTasks = tasks.filter((t) => t.status !== "Completed").length;
  const overdueTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter((t) => {
      if (t.status === "Completed" || !t.dueDate) return false;
      const d = new Date(t.dueDate);
      d.setHours(0, 0, 0, 0);
      return d < today;
    }).length;
  }, [tasks]);

  const storageAssets = Math.max(
    0,
    stats.totalAssets - stats.activeAssets - stats.repairAssets
  );
  const utilizationPct = Math.round(
    (stats.activeAssets / (stats.totalAssets || 1)) * 100
  );

  const statusData = [
    { name: "Active", value: stats.activeAssets, color: "#10b981" },
    { name: "In Storage", value: storageAssets, color: "#64748b" },
    { name: "Under Repair", value: stats.repairAssets, color: "#f59e0b" },
  ].filter((d) => d.value > 0);

  const valueByLocation = useMemo(() => {
    const map = new Map<string, number>();
    allAssets.forEach((a) => {
      const loc = a.location || "Unassigned";
      map.set(loc, (map.get(loc) || 0) + (a.purchaseCost || 0));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [allAssets]);

  const categoryData = useMemo(() => {
    return (stats.byCategory || [])
      .slice()
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [stats.byCategory]);

  const tooltipStyle = {
    backgroundColor: "#12151C",
    borderRadius: "6px",
    border: "1px solid #222733",
    color: "#F1F3F7",
    fontSize: "12px",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#111318] dark:text-[#F1F3F7]">
            IT Operations Console
          </h1>
          <p className="text-xs text-[#5A6270] dark:text-[#8B94A5] mt-0.5">
            Live infrastructure telemetry, help desk queues, tasks, and fleet capital.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill
            label={`${userCount} Active Users`}
            tone="emerald"
          />
          <Link
            to="/executive"
            className="h-7 px-2.5 rounded-md border border-[#E4E6EB] dark:border-[#222733] bg-white dark:bg-[#12151C] text-xs font-medium text-[#111318] dark:text-[#F1F3F7] hover:border-[#C7CCD6] dark:hover:border-[#343C4F] inline-flex items-center gap-1 transition-colors"
          >
            Executive View <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricTile
          label="Open Tickets"
          value={openTickets}
          subtext={
            criticalTickets > 0
              ? `${criticalTickets} critical priority`
              : "No critical alerts"
          }
          tone={criticalTickets > 0 ? "red" : openTickets > 0 ? "amber" : "emerald"}
          alert={criticalTickets > 0}
          to="/repairs"
        />
        <MetricTile
          label="Operational Tasks"
          value={pendingTasks}
          subtext={
            overdueTasks > 0 ? `${overdueTasks} overdue` : "All on schedule"
          }
          tone={overdueTasks > 0 ? "red" : "blue"}
          alert={overdueTasks > 0}
          to="/tasks"
        />
        <MetricTile
          label="Procurement Queue"
          value={pendingRequests}
          subtext="Pending approval / deploy"
          tone={pendingRequests > 0 ? "purple" : "slate"}
          to="/requests"
        />
        <MetricTile
          label="Managed Fleet"
          value={stats.totalAssets}
          subtext={`AED ${stats.totalValue.toLocaleString()}`}
          tone="emerald"
          to="/assets"
        />
      </div>

      {/* Secondary Fleet Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricTile
          label="Active Deployed"
          value={stats.activeAssets}
          subtext={`${utilizationPct}% fleet utilization`}
          tone="emerald"
        />
        <MetricTile
          label="In Storage"
          value={storageAssets}
          subtext="Available spares"
          tone="slate"
        />
        <MetricTile
          label="Under Repair"
          value={stats.repairAssets}
          subtext="Vendor / bench queue"
          tone={stats.repairAssets > 0 ? "amber" : "slate"}
        />
        <MetricTile
          label="Warranty Alerts"
          value={(stats.expiringWarranties || 0) + (stats.expiredWarranties || 0)}
          subtext={`${stats.expiringWarranties || 0} expiring • ${
            stats.expiredWarranties || 0
          } expired`}
          tone={
            (stats.expiredWarranties || 0) > 0
              ? "red"
              : (stats.expiringWarranties || 0) > 0
              ? "amber"
              : "emerald"
          }
          to="/reports"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <OpsPanel title="Fleet Status" subtitle="Distribution by lifecycle state">
          <div className="h-56 w-full">
            {statusData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#8C95A6]">
                No assets registered yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={74}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "#F1F3F7" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-4 pt-2 border-t border-[#E4E6EB] dark:border-[#222733] text-xs">
            {statusData.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-[#5A6270] dark:text-[#8B94A5]">{s.name}</span>
                <span className="font-mono font-semibold tabular-nums text-[#111318] dark:text-[#F1F3F7]">
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </OpsPanel>

        <OpsPanel title="Capital by Venue" subtitle="Top locations (AED)">
          <div className="h-64 w-full">
            {valueByLocation.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#8C95A6]">
                No location valuation data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={valueByLocation}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 10, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="2 2"
                    horizontal={false}
                    stroke="#334155"
                    opacity={0.15}
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={90}
                    tick={{ fontSize: 11, fill: "#8B94A5" }}
                    interval={0}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(59,130,246,0.06)" }}
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: "#F1F3F7" }}
                    formatter={(value: number) => `AED ${value.toLocaleString()}`}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 3, 3, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </OpsPanel>

        <OpsPanel title="Spend by Category" subtitle="Top hardware groups (AED)">
          <div className="space-y-2.5 pt-1">
            {categoryData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-xs text-[#8C95A6]">
                No category data yet
              </div>
            ) : (
              categoryData.map((c) => {
                const maxVal = categoryData[0]?.value || 1;
                const widthPct = Math.max(4, Math.round((c.value / maxVal) * 100));
                return (
                  <div key={c.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="text-[#111318] dark:text-[#F1F3F7] font-medium truncate">
                        {c.name}
                      </span>
                      <span className="font-mono text-[11px] text-[#5A6270] dark:text-[#8B94A5] tabular-nums shrink-0">
                        AED {c.value.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#F4F5F7] dark:bg-[#181C25] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#111318] dark:bg-blue-500 rounded-full"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </OpsPanel>
      </div>
    </div>
  );
};

export default Dashboard;
