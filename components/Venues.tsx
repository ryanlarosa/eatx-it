import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Asset,
  IncidentReport,
  Task,
  Venue,
  VenueISP,
  VenueStatus,
  VenueVisit,
  VisitPurpose,
} from "../types";
import {
  listenToVenues,
  saveVenue,
  deleteVenue,
  syncVenuesFromLocations,
  listenToVenueVisits,
  saveVenueVisit,
  deleteVenueVisit,
  listenToIncidents,
  listenToTasks,
  getAppConfig,
  getCurrentUserProfile,
  canManageOperations,
  isAdminRole,
} from "../services/storageService";
import { useAppData } from "../context/AppDataContext";
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Wifi,
  Monitor,
  Camera,
  Printer,
  Wrench,
  Calendar,
  MapPin,
  Phone,
  User,
  X,
  Save,
  Trash2,
  Edit2,
  Globe,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";

const VENUE_STATUSES: VenueStatus[] = [
  "Operational",
  "Opening Soon",
  "Under Maintenance",
  "Closed",
];

const VISIT_PURPOSES: VisitPurpose[] = [
  "Routine Check",
  "Incident Response",
  "Installation",
  "Preventive Maintenance",
  "Audit",
];

const IT_STAFF = ["Ryan", "Diego"];

const STATUS_BADGE: Record<VenueStatus, string> = {
  Operational:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
  "Opening Soon":
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  "Under Maintenance":
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  Closed:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

const classifyInfra = (asset: Asset): "network" | "pos" | "cctv" | "printer" | "other" => {
  const text = `${asset.category} ${asset.name} ${asset.manufacturer || ""}`.toLowerCase();
  if (text.includes("network") || text.includes("wi-fi") || text.includes("wifi") || text.includes("forti") || text.includes("unifi") || text.includes("switch") || text.includes("router")) {
    return "network";
  }
  if (text.includes("pos") || text.includes("kds") || text.includes("kitchen display")) {
    return "pos";
  }
  if (text.includes("cctv") || text.includes("camera") || text.includes("nvr") || text.includes("security")) {
    return "cctv";
  }
  if (text.includes("printer") || text.includes("scanner")) {
    return "printer";
  }
  return "other";
};

const Venues: React.FC = () => {
  const { assets } = useAppData();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [visits, setVisits] = useState<VenueVisit[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const [searchParams, setSearchParams] = useSearchParams();
  const [pageTab, setPageTab] = useState<"directory" | "visits">("directory");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | VenueStatus>("All");
  const [visitVenueFilter, setVisitVenueFilter] = useState("All");
  const [visitTechFilter, setVisitTechFilter] = useState("All");
  const [visitMonthFilter, setVisitMonthFilter] = useState("");
  const [visitFollowUpOnly, setVisitFollowUpOnly] = useState(false);
  const [showQuickVisitModal, setShowQuickVisitModal] = useState(false);
  const [quickVisitVenueName, setQuickVisitVenueName] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  // Selected Venue Detail
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<
    "infra" | "isp" | "maintenance" | "visits"
  >("infra");

  // Create / Edit Venue Modal
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [venueDraft, setVenueDraft] = useState<Partial<Venue>>({
    name: "",
    code: "",
    brand: "",
    address: "",
    managerName: "",
    managerContact: "",
    status: "Operational",
    networkNotes: "",
  });

  // ISP Form State
  const [ispDraft, setIspDraft] = useState<Partial<VenueISP>>({
    provider: "Etisalat",
    accountNumber: "",
    circuitId: "",
    staticIp: "",
    bandwidth: "",
    supportPhone: "",
    isBackup: false,
  });

  // Visit Form State
  const [visitDraft, setVisitDraft] = useState<Partial<VenueVisit>>({
    visitDate: new Date().toISOString().split("T")[0],
    technician: "Diego",
    purpose: "Routine Check",
    findings: "",
    actionsTaken: "",
    followUpRequired: false,
  });

  const user = getCurrentUserProfile();
  const canEdit = canManageOperations(user);
  const isAdmin = isAdminRole(user);

  useEffect(() => {
    const unsubV = listenToVenues(setVenues);
    const unsubVis = listenToVenueVisits(setVisits);
    const unsubInc = listenToIncidents(setIncidents);
    const unsubTsk = listenToTasks(setTasks);
    getAppConfig()
      .then((c) => setLocations(c.locations || []))
      .catch(() => {});
    return () => {
      unsubV();
      unsubVis();
      unsubInc();
      unsubTsk();
    };
  }, []);

  const selectedVenue = useMemo(
    () => venues.find((v) => v.id === selectedId) || null,
    [venues, selectedId]
  );

  const getVenueAssets = (venueName: string) =>
    assets.filter(
      (a) => a.location?.trim().toLowerCase() === venueName.trim().toLowerCase()
    );

  const getVenueIncidents = (venueName: string) =>
    incidents.filter(
      (i) => i.location?.trim().toLowerCase() === venueName.trim().toLowerCase()
    );

  const getVenueTasks = (venueName: string) =>
    tasks.filter(
      (t) => t.venue?.trim().toLowerCase() === venueName.trim().toLowerCase()
    );

  const getVenueVisits = (venueId: string) =>
    visits.filter((v) => v.venueId === venueId);

  const filteredVenues = useMemo(() => {
    return venues.filter((v) => {
      const matchesStatus = statusFilter === "All" || v.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        v.name.toLowerCase().includes(q) ||
        (v.brand || "").toLowerCase().includes(q) ||
        (v.code || "").toLowerCase().includes(q) ||
        (v.address || "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [venues, search, statusFilter]);

  const metrics = useMemo(() => {
    const operational = venues.filter((v) => v.status === "Operational").length;
    const attention = venues.filter(
      (v) => v.status === "Under Maintenance" || v.status === "Opening Soon"
    ).length;
    return {
      total: venues.length,
      operational,
      attention,
      visits: visits.length,
    };
  }, [venues, visits]);

  const flash = (msg: string) => {
    setBanner(msg);
    setTimeout(() => setBanner(null), 4000);
  };

  const handleSyncLocations = async () => {
    if (!canEdit) return;
    setSyncing(true);
    try {
      const created = await syncVenuesFromLocations(locations, venues);
      flash(
        created > 0
          ? `Imported ${created} venue${created > 1 ? "s" : ""} from Settings Locations.`
          : "All configured locations already exist in the Venue Directory."
      );
    } finally {
      setSyncing(false);
    }
  };

  const openCreateVenue = () => {
    setVenueDraft({
      name: "",
      code: "",
      brand: "",
      address: "",
      managerName: "",
      managerContact: "",
      status: "Operational",
      networkNotes: "",
    });
    setShowVenueModal(true);
  };

  const openEditVenue = (v: Venue) => {
    setVenueDraft({ ...v });
    setShowVenueModal(true);
  };

  const handleSaveVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !venueDraft.name?.trim()) return;
    const existing = venueDraft.id
      ? venues.find((v) => v.id === venueDraft.id)
      : undefined;

    const payload: Venue = {
      id: existing?.id || "",
      name: venueDraft.name.trim(),
      code: venueDraft.code?.trim() || "",
      brand: venueDraft.brand?.trim() || "",
      address: venueDraft.address?.trim() || "",
      managerName: venueDraft.managerName?.trim() || "",
      managerContact: venueDraft.managerContact?.trim() || "",
      status: (venueDraft.status as VenueStatus) || "Operational",
      ispDetails: existing?.ispDetails || [],
      networkNotes: venueDraft.networkNotes?.trim() || "",
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const id = await saveVenue(payload);
    setShowVenueModal(false);
    setSelectedId(id);
  };

  const handleDeleteVenue = async (v: Venue) => {
    if (!isAdmin) return;
    if (confirm(`Delete venue "${v.name}" from the directory?`)) {
      await deleteVenue(v.id);
      if (selectedId === v.id) setSelectedId(null);
    }
  };

  const handleAddISP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !selectedVenue || !ispDraft.provider?.trim()) return;
    const newIsp: VenueISP = {
      id: `isp-${Date.now()}`,
      provider: ispDraft.provider.trim(),
      accountNumber: ispDraft.accountNumber?.trim() || "",
      circuitId: ispDraft.circuitId?.trim() || "",
      staticIp: ispDraft.staticIp?.trim() || "",
      bandwidth: ispDraft.bandwidth?.trim() || "",
      supportPhone: ispDraft.supportPhone?.trim() || "",
      isBackup: !!ispDraft.isBackup,
    };
    await saveVenue({
      ...selectedVenue,
      ispDetails: [...(selectedVenue.ispDetails || []), newIsp],
    });
    setIspDraft({
      provider: "Etisalat",
      accountNumber: "",
      circuitId: "",
      staticIp: "",
      bandwidth: "",
      supportPhone: "",
      isBackup: false,
    });
  };

  const handleRemoveISP = async (ispId: string) => {
    if (!canEdit || !selectedVenue) return;
    await saveVenue({
      ...selectedVenue,
      ispDetails: (selectedVenue.ispDetails || []).filter((i) => i.id !== ispId),
    });
  };

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !selectedVenue || !visitDraft.findings?.trim()) return;
    await saveVenueVisit({
      id: "",
      venueId: selectedVenue.id,
      venueName: selectedVenue.name,
      visitDate: visitDraft.visitDate || new Date().toISOString().split("T")[0],
      technician: visitDraft.technician || "Diego",
      purpose: (visitDraft.purpose as VisitPurpose) || "Routine Check",
      findings: visitDraft.findings.trim(),
      actionsTaken: visitDraft.actionsTaken?.trim() || "",
      followUpRequired: !!visitDraft.followUpRequired,
      createdAt: new Date().toISOString(),
    });
    setVisitDraft({
      visitDate: new Date().toISOString().split("T")[0],
      technician: "Diego",
      purpose: "Routine Check",
      findings: "",
      actionsTaken: "",
      followUpRequired: false,
    });
  };

  useEffect(() => {
    if (searchParams.get("logVisit") === "1") {
      setPageTab("visits");
      if (canEdit) setShowQuickVisitModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, canEdit, setSearchParams]);

  const allVenueNames = useMemo(() => {
    const set = new Set<string>();
    venues.forEach((v) => set.add(v.name));
    locations.forEach((l) => set.add(l));
    return Array.from(set).sort();
  }, [venues, locations]);

  const filteredVisits = useMemo(() => {
    return visits.filter((vis) => {
      if (visitVenueFilter !== "All" && vis.venueName !== visitVenueFilter)
        return false;
      if (visitTechFilter !== "All" && vis.technician !== visitTechFilter)
        return false;
      if (visitMonthFilter && !vis.visitDate?.startsWith(visitMonthFilter))
        return false;
      if (visitFollowUpOnly && !vis.followUpRequired) return false;
      return true;
    });
  }, [visits, visitVenueFilter, visitTechFilter, visitMonthFilter, visitFollowUpOnly]);

  const handleQuickLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !quickVisitVenueName || !visitDraft.findings?.trim()) return;
    const matchedVenue = venues.find(
      (v) => v.name.toLowerCase() === quickVisitVenueName.toLowerCase()
    );
    await saveVenueVisit({
      id: "",
      venueId: matchedVenue?.id || quickVisitVenueName,
      venueName: quickVisitVenueName,
      visitDate: visitDraft.visitDate || new Date().toISOString().split("T")[0],
      technician: visitDraft.technician || "Diego",
      purpose: (visitDraft.purpose as VisitPurpose) || "Routine Check",
      findings: visitDraft.findings.trim(),
      actionsTaken: visitDraft.actionsTaken?.trim() || "",
      followUpRequired: !!visitDraft.followUpRequired,
      createdAt: new Date().toISOString(),
    });
    setVisitDraft({
      visitDate: new Date().toISOString().split("T")[0],
      technician: "Diego",
      purpose: "Routine Check",
      findings: "",
      actionsTaken: "",
      followUpRequired: false,
    });
    setQuickVisitVenueName("");
    setShowQuickVisitModal(false);
    setPageTab("visits");
    flash(`Site visit logged for ${quickVisitVenueName}.`);
  };

  return (
    <div className="space-y-6">
      {banner && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>{banner}</span>
          <button onClick={() => setBanner(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-[#172B4D] dark:text-[#E6EDF5]">
            Venues & Sites
          </h1>
          <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8]">
            Centralized IT directory for all EATX outlets — Network, POS, CCTV, Printers, ISP & Site Visits.
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowQuickVisitModal(true)}
              className="px-3.5 py-2 text-[13px] font-medium rounded bg-[#0052CC] hover:bg-[#0043A8] text-white flex items-center gap-1.5 transition-colors"
            >
              <ClipboardCheck size={15} /> Log Site Visit
            </button>
            <button
              onClick={handleSyncLocations}
              disabled={syncing}
              className="px-3 py-2 text-[13px] font-medium rounded border border-[#DFE3E8] dark:border-[#2A3444] bg-white dark:bg-[#161C26] text-[#172B4D] dark:text-[#E6EDF5] hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Sync Locations</span>
            </button>
            <button
              onClick={openCreateVenue}
              className="px-3 py-2 text-[13px] font-medium rounded border border-[#DFE3E8] dark:border-[#2A3444] bg-white dark:bg-[#161C26] text-[#172B4D] dark:text-[#E6EDF5] hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] flex items-center gap-1.5 transition-colors"
            >
              <Plus size={15} /> Add Venue
            </button>
          </div>
        )}
      </div>

      {/* Top-Level Page Tabs: Venues Directory vs. Site Visit Log */}
      <div className="border-b border-[#DFE3E8] dark:border-[#242E40] flex items-center gap-6 text-[13px]">
        <button
          onClick={() => setPageTab("directory")}
          className={`pb-2.5 border-b-2 font-medium transition-colors ${
            pageTab === "directory"
              ? "border-[#0052CC] text-[#0052CC] dark:text-[#4C9AFF] dark:border-[#4C9AFF]"
              : "border-transparent text-[#5E6C84] dark:text-[#94A3B8] hover:text-[#172B4D] dark:hover:text-white"
          }`}
        >
          Venues Directory ({venues.length})
        </button>
        <button
          onClick={() => setPageTab("visits")}
          className={`pb-2.5 border-b-2 font-medium transition-colors ${
            pageTab === "visits"
              ? "border-[#0052CC] text-[#0052CC] dark:text-[#4C9AFF] dark:border-[#4C9AFF]"
              : "border-transparent text-[#5E6C84] dark:text-[#94A3B8] hover:text-[#172B4D] dark:hover:text-white"
          }`}
        >
          Site Visit Log ({visits.length})
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Venues
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.total}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
            Operational
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.operational}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
            Maint. / Opening
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.attention}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
            Site Visits Logged
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.visits}
          </div>
        </div>
      </div>

      {pageTab === "visits" ? (
        <div className="space-y-4">
          {/* Visit Log Filters */}
          <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded p-3 flex flex-wrap gap-2.5 items-center">
            <select
              value={visitVenueFilter}
              onChange={(e) => setVisitVenueFilter(e.target.value)}
              className="px-2.5 py-1.5 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
            >
              <option value="All">All venues</option>
              {allVenueNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <select
              value={visitTechFilter}
              onChange={(e) => setVisitTechFilter(e.target.value)}
              className="px-2.5 py-1.5 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
            >
              <option value="All">All technicians</option>
              {IT_STAFF.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              type="month"
              value={visitMonthFilter}
              onChange={(e) => setVisitMonthFilter(e.target.value)}
              className="px-2.5 py-1.5 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
            />
            <label className="flex items-center gap-1.5 text-xs font-medium text-[#42526E] dark:text-[#CBD5E1] cursor-pointer px-1">
              <input
                type="checkbox"
                checked={visitFollowUpOnly}
                onChange={(e) => setVisitFollowUpOnly(e.target.checked)}
              />
              Follow-up required only
            </label>
          </div>

          {/* All-Venues Site Visits Table */}
          <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[#EBECF0] dark:border-[#242E40] text-[11px] font-semibold uppercase tracking-wide text-[#6B778C] bg-[#F9FAFB] dark:bg-[#1B2230]">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Venue</th>
                  <th className="px-4 py-2.5">Technician</th>
                  <th className="px-4 py-2.5">Purpose</th>
                  <th className="px-4 py-2.5">Findings &amp; Actions</th>
                  <th className="px-4 py-2.5">Follow-Up</th>
                  {isAdmin && <th className="px-4 py-2.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBECF0] dark:divide-[#242E40]">
                {filteredVisits.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 7 : 6}
                      className="px-4 py-10 text-center text-[#6B778C]"
                    >
                      No venue site visits logged yet. Click{" "}
                      <strong>Log Site Visit</strong> to record a visit.
                    </td>
                  </tr>
                ) : (
                  filteredVisits.map((vis) => (
                    <tr
                      key={vis.id}
                      className="hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534]"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                        {vis.visitDate}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-[#172B4D] dark:text-[#E6EDF5] whitespace-nowrap">
                        {vis.venueName}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {vis.technician}
                      </td>
                      <td className="px-4 py-2.5 text-[#5E6C84] dark:text-[#94A3B8] whitespace-nowrap">
                        {vis.purpose}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-[#172B4D] dark:text-[#E6EDF5]">
                          {vis.findings}
                        </div>
                        {vis.actionsTaken && (
                          <div className="text-xs text-[#6B778C] mt-0.5">
                            Actions: {vis.actionsTaken}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {vis.followUpRequired ? (
                          <span className="text-xs font-semibold text-[#D97706]">
                            Required
                          </span>
                        ) : (
                          <span className="text-xs text-[#6B778C]">None</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => deleteVenueVisit(vis.id)}
                            className="text-[#8A99B0] hover:text-[#DE350B] p-1"
                            title="Delete visit"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search venue name, brand, code, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950"
        >
          <option value="All">All Statuses</option>
          {VENUE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Venues Grid */}
      {filteredVenues.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Building2
            size={36}
            className="mx-auto text-slate-300 dark:text-slate-600 mb-3"
          />
          <h3 className="font-semibold text-slate-800 dark:text-white">
            No Venues Found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Add your venues manually or click <strong>Sync Locations</strong> to import from Settings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredVenues.map((v) => {
            const vAssets = getVenueAssets(v.name);
            const openTickets = getVenueIncidents(v.name).filter(
              (i) => i.status !== "Resolved" && i.status !== "Rejected"
            ).length;
            const counts = { network: 0, pos: 0, cctv: 0, printer: 0, other: 0 };
            vAssets.forEach((a) => counts[classifyInfra(a)]++);

            return (
              <div
                key={v.id}
                onClick={() => {
                  setSelectedId(v.id);
                  setDetailTab("infra");
                }}
                className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-blue-500 cursor-pointer transition-all shadow-sm flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white truncate">
                        {v.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {[v.brand, v.code].filter(Boolean).join(" • ") ||
                          "EATX Outlet"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_BADGE[v.status]}`}
                    >
                      {v.status}
                    </span>
                  </div>

                  {/* Mini Infra Counters */}
                  <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                      <Wifi size={13} className="mx-auto text-blue-500 mb-0.5" />
                      <div className="text-xs font-bold">{counts.network}</div>
                      <div className="text-[10px] text-slate-400">Net</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                      <Monitor size={13} className="mx-auto text-emerald-500 mb-0.5" />
                      <div className="text-xs font-bold">{counts.pos}</div>
                      <div className="text-[10px] text-slate-400">POS</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                      <Camera size={13} className="mx-auto text-purple-500 mb-0.5" />
                      <div className="text-xs font-bold">{counts.cctv}</div>
                      <div className="text-[10px] text-slate-400">CCTV</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                      <Printer size={13} className="mx-auto text-amber-500 mb-0.5" />
                      <div className="text-xs font-bold">{counts.printer}</div>
                      <div className="text-[10px] text-slate-400">Print</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <span className="flex items-center gap-1">
                    <Globe size={12} />{" "}
                    {v.ispDetails?.length
                      ? v.ispDetails.map((i) => i.provider).join(" / ")
                      : "No ISP set"}
                  </span>
                  {openTickets > 0 ? (
                    <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                      <AlertTriangle size={12} /> {openTickets} Open Ticket
                      {openTickets > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span>{vAssets.length} Total Assets</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Quick Log Site Visit Modal */}
      {showQuickVisitModal && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161C26] rounded border border-[#DFE3E8] dark:border-[#2A3444] max-w-lg w-full shadow-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#EBECF0] dark:border-[#242E40] bg-[#F9FAFB] dark:bg-[#1B2230] flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
                Log Venue Site Visit
              </h3>
              <button onClick={() => setShowQuickVisitModal(false)}>
                <X size={18} className="text-[#6B778C]" />
              </button>
            </div>
            <form onSubmit={handleQuickLogVisit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1">
                  Venue / Outlet *
                </label>
                <select
                  required
                  value={quickVisitVenueName}
                  onChange={(e) => setQuickVisitVenueName(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
                >
                  <option value="">Select venue...</option>
                  {allVenueNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1">
                    Visit Date *
                  </label>
                  <input
                    required
                    type="date"
                    value={visitDraft.visitDate || ""}
                    onChange={(e) =>
                      setVisitDraft({ ...visitDraft, visitDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1">
                    Technician
                  </label>
                  <select
                    value={visitDraft.technician || "Diego"}
                    onChange={(e) =>
                      setVisitDraft({ ...visitDraft, technician: e.target.value })
                    }
                    className="w-full px-3 py-2 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
                  >
                    {IT_STAFF.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1">
                    Purpose
                  </label>
                  <select
                    value={visitDraft.purpose || "Routine Check"}
                    onChange={(e) =>
                      setVisitDraft({
                        ...visitDraft,
                        purpose: e.target.value as VisitPurpose,
                      })
                    }
                    className="w-full px-3 py-2 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
                  >
                    {VISIT_PURPOSES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1">
                  Findings / Observations *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="What was inspected, repaired, or audited on site..."
                  value={visitDraft.findings || ""}
                  onChange={(e) =>
                    setVisitDraft({ ...visitDraft, findings: e.target.value })
                  }
                  className="w-full px-3 py-2 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1">
                  Actions Taken (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Replaced switch cable, verified POS & CCTV recording"
                  value={visitDraft.actionsTaken || ""}
                  onChange={(e) =>
                    setVisitDraft({ ...visitDraft, actionsTaken: e.target.value })
                  }
                  className="w-full px-3 py-2 text-[13px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C]"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-[#42526E] dark:text-[#CBD5E1]">
                <input
                  type="checkbox"
                  checked={!!visitDraft.followUpRequired}
                  onChange={(e) =>
                    setVisitDraft({
                      ...visitDraft,
                      followUpRequired: e.target.checked,
                    })
                  }
                />
                Follow-up visit or procurement required
              </label>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#EBECF0] dark:border-[#242E40]">
                <button
                  type="button"
                  onClick={() => setShowQuickVisitModal(false)}
                  className="px-4 py-2 text-[13px] text-[#5E6C84] hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0052CC] hover:bg-[#0043A8] text-white text-[13px] font-medium rounded flex items-center gap-1.5"
                >
                  <Save size={14} /> Save Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Venue Modal */}
      {showVenueModal && (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {venueDraft.id ? "Edit Venue" : "Add EATX Venue"}
              </h3>
              <button onClick={() => setShowVenueModal(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSaveVenue} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Venue Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={venueDraft.name || ""}
                    onChange={(e) =>
                      setVenueDraft({ ...venueDraft, name: e.target.value })
                    }
                    placeholder="e.g. The Guild — DIFC"
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Brand / Concept
                  </label>
                  <input
                    type="text"
                    value={venueDraft.brand || ""}
                    onChange={(e) =>
                      setVenueDraft({ ...venueDraft, brand: e.target.value })
                    }
                    placeholder="e.g. Common Grounds, The Guild"
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Venue Code
                  </label>
                  <input
                    type="text"
                    value={venueDraft.code || ""}
                    onChange={(e) =>
                      setVenueDraft({ ...venueDraft, code: e.target.value })
                    }
                    placeholder="e.g. DIFC-01"
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Status
                  </label>
                  <select
                    value={venueDraft.status || "Operational"}
                    onChange={(e) =>
                      setVenueDraft({
                        ...venueDraft,
                        status: e.target.value as VenueStatus,
                      })
                    }
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  >
                    {VENUE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Address / Mall / Building
                </label>
                <input
                  type="text"
                  value={venueDraft.address || ""}
                  onChange={(e) =>
                    setVenueDraft({ ...venueDraft, address: e.target.value })
                  }
                  className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Venue Manager
                  </label>
                  <input
                    type="text"
                    value={venueDraft.managerName || ""}
                    onChange={(e) =>
                      setVenueDraft({
                        ...venueDraft,
                        managerName: e.target.value,
                      })
                    }
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Manager Contact
                  </label>
                  <input
                    type="text"
                    value={venueDraft.managerContact || ""}
                    onChange={(e) =>
                      setVenueDraft({
                        ...venueDraft,
                        managerContact: e.target.value,
                      })
                    }
                    placeholder="+971 50 ..."
                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Network / Fortinet / UniFi Notes
                </label>
                <textarea
                  rows={2}
                  value={venueDraft.networkNotes || ""}
                  onChange={(e) =>
                    setVenueDraft({
                      ...venueDraft,
                      networkNotes: e.target.value,
                    })
                  }
                  placeholder="VLANs, rack location, FortiGate model, UniFi site name..."
                  className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowVenueModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-slate-900 dark:bg-blue-600 text-white rounded-lg flex items-center gap-2"
                >
                  <Save size={15} /> Save Venue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Venue Detail Modal */}
      {selectedVenue && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedVenue.name}
                  </h3>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_BADGE[selectedVenue.status]}`}
                  >
                    {selectedVenue.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  {selectedVenue.address && (
                    <span className="flex items-center gap-1">
                      <MapPin size={13} /> {selectedVenue.address}
                    </span>
                  )}
                  {selectedVenue.managerName && (
                    <span className="flex items-center gap-1">
                      <User size={13} /> {selectedVenue.managerName}
                    </span>
                  )}
                  {selectedVenue.managerContact && (
                    <span className="flex items-center gap-1">
                      <Phone size={13} /> {selectedVenue.managerContact}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {canEdit && (
                  <button
                    onClick={() => openEditVenue(selectedVenue)}
                    className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteVenue(selectedVenue)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  onClick={() => setSelectedId(null)}
                  className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 gap-6 text-sm overflow-x-auto">
              {[
                {
                  id: "infra",
                  label: `Infrastructure (${getVenueAssets(selectedVenue.name).length})`,
                  icon: Monitor,
                },
                {
                  id: "isp",
                  label: `ISP & Network (${selectedVenue.ispDetails?.length || 0})`,
                  icon: Globe,
                },
                {
                  id: "maintenance",
                  label: `Tickets & Tasks (${
                    getVenueIncidents(selectedVenue.name).length +
                    getVenueTasks(selectedVenue.name).length
                  })`,
                  icon: Wrench,
                },
                {
                  id: "visits",
                  label: `Site Visits (${getVenueVisits(selectedVenue.id).length})`,
                  icon: ClipboardCheck,
                },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setDetailTab(t.id as any)}
                    className={`py-3 border-b-2 font-medium flex items-center gap-2 whitespace-nowrap ${
                      detailTab === t.id
                        ? "border-slate-900 dark:border-blue-500 text-slate-900 dark:text-white"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Icon size={15} /> {t.label}
                  </button>
                );
              })}
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {detailTab === "infra" && (
                <div className="space-y-4">
                  {getVenueAssets(selectedVenue.name).length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                      No assets assigned to <strong>{selectedVenue.name}</strong> yet. Assign assets to this location in Inventory Registry to see them here automatically.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      {getVenueAssets(selectedVenue.name).map((a) => (
                        <div
                          key={a.id}
                          className="p-3.5 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="font-semibold text-sm text-slate-900 dark:text-white">
                              {a.name}{" "}
                              {a.assetTag && (
                                <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                                  [{a.assetTag}]
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              {a.category} •{" "}
                              {[a.manufacturer, a.model]
                                .filter(Boolean)
                                .join(" ") || "Generic"}{" "}
                              • SN: {a.serialNumber || "N/A"}
                            </div>
                          </div>
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                            {a.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {detailTab === "isp" && (
                <div className="space-y-5">
                  {selectedVenue.networkNotes && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Fortinet / UniFi / Network Notes
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {selectedVenue.networkNotes}
                      </p>
                    </div>
                  )}

                  {canEdit && (
                    <form
                      onSubmit={handleAddISP}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
                    >
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Add ISP Circuit
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          required
                          type="text"
                          placeholder="Provider (Etisalat / du)"
                          value={ispDraft.provider || ""}
                          onChange={(e) =>
                            setIspDraft({ ...ispDraft, provider: e.target.value })
                          }
                          className="p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                        />
                        <input
                          type="text"
                          placeholder="Account / Circuit ID"
                          value={ispDraft.circuitId || ""}
                          onChange={(e) =>
                            setIspDraft({
                              ...ispDraft,
                              circuitId: e.target.value,
                            })
                          }
                          className="p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                        />
                        <input
                          type="text"
                          placeholder="Static IP"
                          value={ispDraft.staticIp || ""}
                          onChange={(e) =>
                            setIspDraft({ ...ispDraft, staticIp: e.target.value })
                          }
                          className="p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Bandwidth (e.g. 500 Mbps)"
                          value={ispDraft.bandwidth || ""}
                          onChange={(e) =>
                            setIspDraft({
                              ...ispDraft,
                              bandwidth: e.target.value,
                            })
                          }
                          className="p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                        />
                        <input
                          type="text"
                          placeholder="Support Phone"
                          value={ispDraft.supportPhone || ""}
                          onChange={(e) =>
                            setIspDraft({
                              ...ispDraft,
                              supportPhone: e.target.value,
                            })
                          }
                          className="p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-1.5 text-xs">
                            <input
                              type="checkbox"
                              checked={!!ispDraft.isBackup}
                              onChange={(e) =>
                                setIspDraft({
                                  ...ispDraft,
                                  isBackup: e.target.checked,
                                })
                              }
                            />
                            Backup Line
                          </label>
                          <button
                            type="submit"
                            className="px-3 py-2 bg-slate-900 dark:bg-blue-600 text-white text-xs font-semibold rounded-lg"
                          >
                            Add ISP
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2.5">
                    {(selectedVenue.ispDetails || []).map((isp) => (
                      <div
                        key={isp.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            {isp.provider}
                            {isp.isBackup && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                Backup
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-3">
                            {isp.circuitId && <span>Circuit: {isp.circuitId}</span>}
                            {isp.staticIp && (
                              <span className="font-mono">IP: {isp.staticIp}</span>
                            )}
                            {isp.bandwidth && <span>Speed: {isp.bandwidth}</span>}
                            {isp.supportPhone && (
                              <span>Support: {isp.supportPhone}</span>
                            )}
                          </div>
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => handleRemoveISP(isp.id)}
                            className="text-slate-400 hover:text-red-500 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailTab === "maintenance" && (
                <div className="space-y-5">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-white mb-2">
                      Help Desk Incidents ({getVenueIncidents(selectedVenue.name).length})
                    </h4>
                    {getVenueIncidents(selectedVenue.name).length === 0 ? (
                      <p className="text-xs text-slate-400">No incidents recorded.</p>
                    ) : (
                      <div className="space-y-2">
                        {getVenueIncidents(selectedVenue.name).map((inc) => (
                          <div
                            key={inc.id}
                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                          >
                            <div>
                              <div className="text-sm font-semibold">
                                {inc.ticketNumber} — {inc.assetName}
                              </div>
                              <div className="text-xs text-slate-500">
                                {inc.description}
                              </div>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                              {inc.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-white mb-2">
                      Operational Tasks ({getVenueTasks(selectedVenue.name).length})
                    </h4>
                    {getVenueTasks(selectedVenue.name).length === 0 ? (
                      <p className="text-xs text-slate-400">No tasks assigned to this venue.</p>
                    ) : (
                      <div className="space-y-2">
                        {getVenueTasks(selectedVenue.name).map((t) => (
                          <div
                            key={t.id}
                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                          >
                            <div>
                              <div className="text-sm font-semibold">{t.title}</div>
                              <div className="text-xs text-slate-500">
                                Owner: {t.assignedTo || "Unassigned"} • Due:{" "}
                                {t.dueDate || "TBD"}
                              </div>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                              {t.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detailTab === "visits" && (
                <div className="space-y-5">
                  {canEdit && (
                    <form
                      onSubmit={handleLogVisit}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
                    >
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Log Venue Site Visit
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="date"
                          value={visitDraft.visitDate || ""}
                          onChange={(e) =>
                            setVisitDraft({
                              ...visitDraft,
                              visitDate: e.target.value,
                            })
                          }
                          className="p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                        />
                        <select
                          value={visitDraft.technician || "Diego"}
                          onChange={(e) =>
                            setVisitDraft({
                              ...visitDraft,
                              technician: e.target.value,
                            })
                          }
                          className="p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                        >
                          {IT_STAFF.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <select
                          value={visitDraft.purpose || "Routine Check"}
                          onChange={(e) =>
                            setVisitDraft({
                              ...visitDraft,
                              purpose: e.target.value as VisitPurpose,
                            })
                          }
                          className="p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                        >
                          {VISIT_PURPOSES.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        required
                        rows={2}
                        placeholder="Findings / observations on site..."
                        value={visitDraft.findings || ""}
                        onChange={(e) =>
                          setVisitDraft({
                            ...visitDraft,
                            findings: e.target.value,
                          })
                        }
                        className="w-full p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                      />
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-medium">
                          <input
                            type="checkbox"
                            checked={!!visitDraft.followUpRequired}
                            onChange={(e) =>
                              setVisitDraft({
                                ...visitDraft,
                                followUpRequired: e.target.checked,
                              })
                            }
                          />
                          Follow-up required
                        </label>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-slate-900 dark:bg-blue-600 text-white text-xs font-semibold rounded-lg"
                        >
                          Log Visit
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2.5">
                    {getVenueVisits(selectedVenue.id).length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                        No site visits logged yet for {selectedVenue.name}.
                      </div>
                    ) : (
                      getVenueVisits(selectedVenue.id).map((vis) => (
                        <div
                          key={vis.id}
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                              <Calendar size={14} className="text-blue-500" />
                              {vis.visitDate} • {vis.purpose}
                              {vis.followUpRequired && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                  Follow-Up
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Technician: {vis.technician}
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                              {vis.findings}
                            </p>
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => deleteVenueVisit(vis.id)}
                              className="text-slate-400 hover:text-red-500 p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Venues;
