import React, { useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs";
import {
  IncidentReport,
  Task,
  Venue,
  VenueVisit,
  EmployeeITProfile,
  Vendor,
} from "../types";
import {
  listenToIncidents,
  listenToTasks,
  listenToVenues,
  listenToVenueVisits,
  listenToEmployees,
  listenToVendors,
  getWarrantyStatus,
  getCurrentUserProfile,
  isAdminRole,
} from "../services/storageService";
import { useAppData } from "../context/AppDataContext";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  DatabaseBackup,
  ShieldAlert,
  Building2,
  ClipboardCheck,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const Reports: React.FC = () => {
  const { assets, projects } = useAppData();
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [visits, setVisits] = useState<VenueVisit[]>([]);
  const [employees, setEmployees] = useState<EmployeeITProfile[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const user = getCurrentUserProfile();
  const isAdmin = isAdminRole(user);

  useEffect(() => {
    const u1 = listenToIncidents(setIncidents);
    const u2 = listenToTasks(setTasks);
    const u3 = listenToVenues(setVenues);
    const u4 = listenToVenueVisits(setVisits);
    const u5 = listenToEmployees(setEmployees);
    const u6 = listenToVendors(setVendors);
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
      u6();
    };
  }, []);

  const flash = (msg: string) => {
    setExportMsg(msg);
    setTimeout(() => setExportMsg(null), 4000);
  };

  // 1. Asset Valuation by Location/Venue
  const venueValuation = useMemo(() => {
    const map = new Map<
      string,
      { location: string; count: number; active: number; repair: number; value: number }
    >();
    assets.forEach((a) => {
      const loc = a.location || "Unassigned";
      const cur = map.get(loc) || {
        location: loc,
        count: 0,
        active: 0,
        repair: 0,
        value: 0,
      };
      cur.count++;
      if (a.status === "Active") cur.active++;
      if (a.status === "Under Repair") cur.repair++;
      cur.value += a.purchaseCost || 0;
      map.set(loc, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [assets]);

  // 2. Warranty Forecast
  const warrantySummary = useMemo(() => {
    let expired = 0;
    let within30 = 0;
    let within90 = 0;
    let valid = 0;
    let none = 0;
    assets.forEach((a) => {
      if (a.status === "Retired") return;
      if (!a.warrantyExpiry) {
        none++;
        return;
      }
      const st30 = getWarrantyStatus(a.warrantyExpiry, 30);
      const st90 = getWarrantyStatus(a.warrantyExpiry, 90);
      if (st30 === "expired") expired++;
      else if (st30 === "expiring") within30++;
      else if (st90 === "expiring") within90++;
      else valid++;
    });
    return { expired, within30, within90, valid, none };
  }, [assets]);

  // 3. Workload by Owner
  const ownerWorkload = useMemo(() => {
    const map = new Map<
      string,
      { owner: string; open: number; completed: number; overdue: number }
    >();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    tasks.forEach((t) => {
      const owner = t.assignedTo || "Unassigned";
      const cur = map.get(owner) || { owner, open: 0, completed: 0, overdue: 0 };
      if (t.status === "Completed") {
        cur.completed++;
      } else {
        cur.open++;
        if (t.dueDate) {
          const d = new Date(t.dueDate);
          d.setHours(0, 0, 0, 0);
          if (d < today) cur.overdue++;
        }
      }
      map.set(owner, cur);
    });
    return Array.from(map.values());
  }, [tasks]);

  // --- EXPORTS ---

  const exportExecutiveWorkbook = async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = "EATX IT Management Platform";
    wb.created = new Date();

    // Sheet 1: Asset Valuation by Venue
    const s1 = wb.addWorksheet("Venue Valuation");
    s1.columns = [
      { header: "Venue / Location", key: "location", width: 28 },
      { header: "Total Assets", key: "count", width: 14 },
      { header: "Active", key: "active", width: 12 },
      { header: "Under Repair", key: "repair", width: 14 },
      { header: "Total Value (AED)", key: "value", width: 20 },
    ];
    venueValuation.forEach((r) => s1.addRow(r));

    // Sheet 2: Warranty Forecast
    const s2 = wb.addWorksheet("Warranty Expirations");
    s2.columns = [
      { header: "Asset Tag", key: "assetTag", width: 16 },
      { header: "Name", key: "name", width: 28 },
      { header: "Category", key: "category", width: 22 },
      { header: "Location", key: "location", width: 22 },
      { header: "Serial Number", key: "serialNumber", width: 20 },
      { header: "Warranty Expiry", key: "warrantyExpiry", width: 16 },
      { header: "Status", key: "wStatus", width: 14 },
    ];
    assets
      .filter((a) => a.warrantyExpiry)
      .forEach((a) =>
        s2.addRow({
          assetTag: a.assetTag || "",
          name: a.name,
          category: a.category,
          location: a.location,
          serialNumber: a.serialNumber || "",
          warrantyExpiry: a.warrantyExpiry,
          wStatus: getWarrantyStatus(a.warrantyExpiry, 60).toUpperCase(),
        })
      );

    // Sheet 3: IT Tasks & Projects
    const s3 = wb.addWorksheet("IT Tasks");
    s3.columns = [
      { header: "Title", key: "title", width: 34 },
      { header: "Owner", key: "assignedTo", width: 14 },
      { header: "Priority", key: "priority", width: 12 },
      { header: "Status", key: "status", width: 18 },
      { header: "Venue", key: "venue", width: 20 },
      { header: "Vendor", key: "vendor", width: 18 },
      { header: "Due Date", key: "dueDate", width: 14 },
      { header: "Resolution Notes", key: "resolutionNotes", width: 36 },
    ];
    tasks.forEach((t) => s3.addRow(t));

    // Sheet 4: Venues & Visits
    const s4 = wb.addWorksheet("Venue Visits");
    s4.columns = [
      { header: "Date", key: "visitDate", width: 14 },
      { header: "Venue", key: "venueName", width: 24 },
      { header: "Technician", key: "technician", width: 14 },
      { header: "Purpose", key: "purpose", width: 22 },
      { header: "Findings", key: "findings", width: 40 },
      { header: "Follow-Up", key: "followUpRequired", width: 12 },
    ];
    visits.forEach((v) => s4.addRow(v));

    const buf = await wb.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().split("T")[0];
    downloadBlob(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `EATX-IT-Executive-Report-${dateStr}.xlsx`
    );
    flash("Executive Excel report downloaded.");
  };

  const exportFullJsonBackup = () => {
    if (!isAdmin) return;
    const backup = {
      exportedAt: new Date().toISOString(),
      exportedBy: user?.email || "admin",
      counts: {
        assets: assets.length,
        employees: employees.length,
        venues: venues.length,
        venueVisits: visits.length,
        projects: projects.length,
        tasks: tasks.length,
        incidents: incidents.length,
        vendors: vendors.length,
      },
      data: {
        assets,
        employees,
        venues,
        venueVisits: visits,
        projects,
        tasks,
        incidents,
        vendors,
      },
    };
    const dateStr = new Date().toISOString().split("T")[0];
    downloadBlob(
      new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
      `eatx-it-full-backup-${dateStr}.json`
    );
    flash("Full JSON system backup downloaded.");
  };

  return (
    <div className="space-y-6">
      {exportMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle2 size={16} /> {exportMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-[#172B4D] dark:text-[#E6EDF5]">
            Reports & Backup
          </h1>
          <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8]">
            Executive exports, warranty forecasts, IT workload analytics, and system backups.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportExecutiveWorkbook}
            className="px-3.5 py-2 bg-[#0052CC] hover:bg-[#0043A8] text-white text-[13px] font-medium rounded flex items-center gap-2 transition-colors"
          >
            <FileSpreadsheet size={15} /> Export Excel Report
          </button>
          {isAdmin && (
            <button
              onClick={exportFullJsonBackup}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <DatabaseBackup size={16} /> Full JSON Backup
            </button>
          )}
        </div>
      </div>

      {/* Warranty Forecast Strip */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base mb-4">
          <CalendarClock size={18} className="text-amber-500" />
          Hardware Warranty Forecast
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/40">
            <div className="text-[11px] font-bold uppercase text-red-600">Expired</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">
              {warrantySummary.expired}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/40">
            <div className="text-[11px] font-bold uppercase text-amber-600">≤ 30 Days</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
              {warrantySummary.within30}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/40">
            <div className="text-[11px] font-bold uppercase text-blue-600">31–90 Days</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
              {warrantySummary.within90}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/40">
            <div className="text-[11px] font-bold uppercase text-emerald-600">Valid (&gt;90d)</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
              {warrantySummary.valid}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase text-slate-400">No Date Set</div>
            <div className="text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1">
              {warrantySummary.none}
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Valuation by Venue */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base mb-4">
            <Building2 size={18} className="text-blue-500" />
            Asset Valuation by Venue
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase text-slate-500">
                  <th className="py-2">Venue</th>
                  <th className="py-2 text-right">Assets</th>
                  <th className="py-2 text-right">Repair</th>
                  <th className="py-2 text-right">Value (AED)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {venueValuation.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No asset data yet.
                    </td>
                  </tr>
                ) : (
                  venueValuation.map((r) => (
                    <tr key={r.location}>
                      <td className="py-2.5 font-medium text-slate-900 dark:text-white">
                        {r.location}
                      </td>
                      <td className="py-2.5 text-right">{r.count}</td>
                      <td className="py-2.5 text-right text-amber-600">
                        {r.repair}
                      </td>
                      <td className="py-2.5 text-right font-semibold">
                        {r.value.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* IT Team Workload */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base mb-4">
            <ClipboardCheck size={18} className="text-emerald-500" />
            IT Task Workload by Owner
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase text-slate-500">
                  <th className="py-2">Owner</th>
                  <th className="py-2 text-right">Open</th>
                  <th className="py-2 text-right">Overdue</th>
                  <th className="py-2 text-right">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ownerWorkload.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No task data yet.
                    </td>
                  </tr>
                ) : (
                  ownerWorkload.map((w) => (
                    <tr key={w.owner}>
                      <td className="py-2.5 font-medium text-slate-900 dark:text-white">
                        {w.owner}
                      </td>
                      <td className="py-2.5 text-right">{w.open}</td>
                      <td className="py-2.5 text-right text-red-600 font-semibold">
                        {w.overdue}
                      </td>
                      <td className="py-2.5 text-right text-emerald-600 font-semibold">
                        {w.completed}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Backup Guidance */}
      {isAdmin && (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Weekly Backup Recommendation
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Download a Full JSON Backup weekly and store it in your EATX IT Google Drive folder for instant disaster recovery.
              </p>
            </div>
          </div>
          <button
            onClick={exportFullJsonBackup}
            className="px-4 py-2 bg-slate-900 dark:bg-blue-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0"
          >
            <Download size={14} /> Download Snapshot
          </button>
        </div>
      )}
    </div>
  );
};

export default Reports;
