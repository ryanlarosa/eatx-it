import React, { useState, useEffect } from "react";
import { Asset, UserProfile } from "../types";
import {
  getAppConfig,
  getAssets,
  createIncidentReport,
  getSandboxStatus,
  hasInternalConsoleAccess,
} from "../services/storageService";
import {
  Send,
  Loader2,
  CheckCircle2,
  Upload,
  X,
} from "lucide-react";
import StaffPortalGate from "./StaffPortalGate";

const ReportIssueContent: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [locations, setLocations] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [location, setLocation] = useState("");
  const [assetId, setAssetId] = useState("");
  const [assetName, setAssetName] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [reportedSerial, setReportedSerial] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [description, setDescription] = useState("");
  const [reportedBy, setReportedBy] = useState(
    user.displayName || user.email.split("@")[0] || ""
  );
  const [reporterEmail] = useState(user.email || "");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Critical">(
    "Medium"
  );

  const isSandbox = getSandboxStatus();

  useEffect(() => {
    const init = async () => {
      try {
        const c = await getAppConfig();
        setLocations(c.locations || []);
        setCategories(c.categories || []);
      } catch (e) {
        console.warn("Could not load config:", e);
      }
      if (hasInternalConsoleAccess(user)) {
        try {
          const a = await getAssets();
          setAssets(a);
        } catch {
          setAssets([]);
        }
      }
      setLoading(false);
    };
    init();
  }, [user]);

  const filteredAssets = location
    ? assets.filter((a) => a.location === location)
    : [];

  const handleAssetChange = (id: string) => {
    setAssetId(id);
    if (id) {
      const asset = assets.find((a) => a.id === id);
      if (asset) {
        setAssetName(asset.name);
        setDeviceType(asset.category);
        setReportedSerial(asset.serialNumber);
      }
    } else {
      setAssetName("");
      setDeviceType("");
      setReportedSerial("");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 800;
        let width = img.width;
        let height = img.height;
        if (width > height && width > MAX) {
          height *= MAX / width;
          width = MAX;
        } else if (height >= width && height > MAX) {
          width *= MAX / height;
          height = MAX;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
        setImageBase64(canvas.toDataURL("image/jpeg", 0.7));
      };
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await createIncidentReport({
        location,
        assetId: assetId || undefined,
        assetName: assetName || deviceType || "General IT Issue",
        deviceType,
        reportedSerial,
        imageBase64,
        description,
        reportedBy,
        reporterEmail,
        priority,
      });
      setSubmitted(true);
    } catch {
      alert("Error submitting ticket. Please try again.");
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setSubmitting(false);
    setAssetId("");
    setAssetName("");
    setDeviceType("");
    setReportedSerial("");
    setImageBase64("");
    setDescription("");
    setPriority("Medium");
  };

  const inputClass =
    "w-full px-3 py-2 text-[14px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C] text-[#172B4D] dark:text-[#E6EDF5] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] outline-none transition-colors";
  const labelClass =
    "block text-[12px] font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1";

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="animate-spin text-[#0052CC]" size={26} />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] border-l-4 border-l-[#00875A] rounded p-6 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={22} className="text-[#00875A] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-[16px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
                Support ticket submitted
              </h2>
              <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8] mt-1">
                Your issue for <strong>{location}</strong> has been logged with the EATX IT team. Updates will be sent to <strong>{reporterEmail}</strong>.
              </p>
            </div>
          </div>
          <div className="pt-2 flex gap-2">
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-[#0052CC] hover:bg-[#0043A8] text-white text-[13px] font-medium rounded transition-colors"
            >
              Submit another ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {isSandbox && (
        <div className="px-3 py-2 rounded bg-[#FFFAE6] border border-[#FFE380] text-[#974F0C] text-xs font-medium">
          Sandbox Mode — test submissions only.
        </div>
      )}

      <div>
        <h1 className="text-[20px] font-semibold text-[#172B4D] dark:text-[#E6EDF5] tracking-tight">
          Report an IT Issue
        </h1>
        <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8]">
          Log a hardware fault, POS issue, network outage, or support request for your venue.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-hidden"
      >
        <div className="px-5 py-3 border-b border-[#EBECF0] dark:border-[#242E40] bg-[#F9FAFB] dark:bg-[#1B2230]">
          <h2 className="text-[13px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
            Ticket details
          </h2>
        </div>

        <div className="p-5 space-y-5">
          {/* Reporter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Reporter name *</label>
              <input
                required
                type="text"
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Verified company email</label>
              <input
                type="email"
                readOnly
                value={reporterEmail}
                className={`${inputClass} bg-[#F4F5F7] dark:bg-[#1B2230] text-[#5E6C84] dark:text-[#94A3B8] cursor-not-allowed`}
              />
            </div>
          </div>

          {/* Venue & Device Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Venue / Location *</label>
              <select
                required
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setAssetId("");
                }}
                className={inputClass}
              >
                <option value="">Select venue...</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Equipment category *</label>
              <select
                required
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
                className={inputClass}
              >
                <option value="">Select category...</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Registered Asset (for IT staff) or Device Name/Serial */}
          {filteredAssets.length > 0 && (
            <div>
              <label className={labelClass}>Registered asset (optional)</label>
              <select
                value={assetId}
                onChange={(e) => handleAssetChange(e.target.value)}
                className={inputClass}
              >
                <option value="">Not listed / manual entry</option>
                {filteredAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} {a.serialNumber ? `(${a.serialNumber})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Device or system name *</label>
              <input
                required
                type="text"
                placeholder="e.g. Bar POS Terminal 1, Kitchen Printer, Main Wi-Fi"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Serial number / Asset tag (optional)</label>
              <input
                type="text"
                placeholder="If visible on label"
                value={reportedSerial}
                onChange={(e) => setReportedSerial(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Issue Description */}
          <div>
            <label className={labelClass}>Issue description *</label>
            <textarea
              required
              rows={4}
              placeholder="Describe what happened, any error messages shown, and whether service is impacted..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Urgency */}
          <div>
            <label className={labelClass}>Priority / Urgency</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["Low", "Medium", "High", "Critical"] as const).map((p) => {
                const active = priority === p;
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`py-2 px-3 rounded text-[13px] font-medium border transition-colors ${
                      active
                        ? p === "Critical"
                          ? "bg-[#DE350B] text-white border-[#DE350B]"
                          : "bg-[#0052CC] text-white border-[#0052CC]"
                        : "bg-white dark:bg-[#0F141C] text-[#42526E] dark:text-[#CBD5E1] border-[#C1C7D0] dark:border-[#2E3A4D] hover:bg-[#F4F5F7] dark:hover:bg-[#1D2534]"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Photo Attachment */}
          <div>
            <label className={labelClass}>Photo attachment (optional)</label>
            {imageBase64 ? (
              <div className="relative inline-block border border-[#DFE3E8] dark:border-[#242E40] rounded p-2 bg-[#F9FAFB] dark:bg-[#0F141C]">
                <img
                  src={imageBase64}
                  alt="Attachment preview"
                  className="max-h-44 rounded"
                />
                <button
                  type="button"
                  onClick={() => setImageBase64("")}
                  className="absolute -top-2 -right-2 bg-[#DE350B] text-white p-1 rounded-full"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 px-4 py-5 border border-dashed border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-[#FAFBFC] dark:bg-[#0F141C] hover:border-[#0052CC] cursor-pointer text-[13px] text-[#5E6C84] dark:text-[#94A3B8] transition-colors">
                <Upload size={16} />
                <span>Click to attach a screenshot or photo of the issue</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="px-5 py-3.5 border-t border-[#EBECF0] dark:border-[#242E40] bg-[#F9FAFB] dark:bg-[#1B2230] flex items-center justify-between gap-3">
          <span className="text-xs text-[#6B778C]">
            Routed directly to EATX IT Help Desk
          </span>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-[#0052CC] hover:bg-[#0043A8] text-white text-[13px] font-medium rounded flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <>
                Submit ticket <Send size={14} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const PublicReportIssue: React.FC = () => (
  <StaffPortalGate
    title="Report an IT Issue"
    subtitle="Submit a repair or support ticket directly to the EATX IT team."
  >
    {(user) => <ReportIssueContent user={user} />}
  </StaffPortalGate>
);

export default PublicReportIssue;
