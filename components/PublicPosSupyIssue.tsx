import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import {
  getAppConfig,
  createIncidentReport,
  getSandboxStatus,
} from "../services/storageService";
import { Send, Loader2, CheckCircle2, Upload, X } from "lucide-react";
import StaffPortalGate from "./StaffPortalGate";

const PosSupyFormContent: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [posSystem, setPosSystem] = useState<"Linga" | "Supy">("Linga");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Critical">(
    "Medium"
  );
  const [imageBase64, setImageBase64] = useState("");
  const [reportedBy, setReportedBy] = useState(
    user.displayName || user.email.split("@")[0] || ""
  );
  const [reporterEmail] = useState(user.email || "");

  const isSandbox = getSandboxStatus();

  useEffect(() => {
    getAppConfig()
      .then((c) => setLocations(c.locations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
      const refNum = await createIncidentReport({
        itemType: "POS_Supy",
        posSystem,
        title: `${posSystem} Request — ${location}`,
        assetName: `${posSystem} System`,
        deviceType: posSystem,
        location,
        description: description.trim(),
        reportedBy,
        reporterEmail,
        priority,
        imageBase64,
      });
      setSubmittedRef(refNum || "Logged");
    } catch {
      alert("Error submitting request. Please try again.");
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmittedRef(null);
    setSubmitting(false);
    setDescription("");
    setImageBase64("");
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

  if (submittedRef) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] border-l-4 border-l-[#00875A] rounded p-6 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={22} className="text-[#00875A] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-[16px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
                {posSystem} issue submitted ({submittedRef})
              </h2>
              <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8] mt-1">
                Your <strong>{posSystem}</strong> request for{" "}
                <strong>{location}</strong> has been logged. You can track it
                using reference <strong className="font-mono">{submittedRef}</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-[#0052CC] hover:bg-[#0043A8] text-white text-[13px] font-medium rounded"
          >
            Submit another POS / Supy request
          </button>
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
          POS / Supy Issue Portal
        </h1>
        <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8]">
          Submit Linga POS or Supy inventory/menu/integration requests directly to EATX IT.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-hidden"
      >
        <div className="px-5 py-3 border-b border-[#EBECF0] dark:border-[#242E40] bg-[#F9FAFB] dark:bg-[#1B2230]">
          <h2 className="text-[13px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
            POS / Supy request details
          </h2>
        </div>

        <div className="p-5 space-y-5">
          {/* Radio Option: Linga / Supy */}
          <div>
            <label className={labelClass}>System *</label>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              {(["Linga", "Supy"] as const).map((sys) => {
                const selected = posSystem === sys;
                return (
                  <label
                    key={sys}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded border cursor-pointer text-[14px] font-medium transition-colors ${
                      selected
                        ? "border-[#0052CC] bg-[#DEEBFF]/40 dark:bg-[#0052CC]/20 text-[#0052CC] dark:text-[#4C9AFF]"
                        : "border-[#C1C7D0] dark:border-[#2E3A4D] bg-white dark:bg-[#0F141C] text-[#172B4D] dark:text-[#E6EDF5]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="posSystem"
                      value={sys}
                      checked={selected}
                      onChange={() => setPosSystem(sys)}
                      className="accent-[#0052CC]"
                    />
                    <span>{sys}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Your name *</label>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Venue / Location *</label>
              <select
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
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
              <label className={labelClass}>Urgency</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className={inputClass}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical (Service Impacted)</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Description of request *</label>
            <textarea
              required
              rows={5}
              placeholder={`Describe the ${posSystem} issue, menu/item change, sync problem, or request in detail...`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Screenshot / photo (optional)</label>
            {imageBase64 ? (
              <div className="relative inline-block border border-[#DFE3E8] dark:border-[#242E40] rounded p-2">
                <img src={imageBase64} alt="Preview" className="max-h-44 rounded" />
                <button
                  type="button"
                  onClick={() => setImageBase64("")}
                  className="absolute -top-2 -right-2 bg-[#DE350B] text-white p-1 rounded-full"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 px-4 py-4 border border-dashed border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-[#FAFBFC] dark:bg-[#0F141C] hover:border-[#0052CC] cursor-pointer text-[13px] text-[#5E6C84]">
                <Upload size={15} />
                <span>Attach screenshot or photo</span>
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

        <div className="px-5 py-3.5 border-t border-[#EBECF0] dark:border-[#242E40] bg-[#F9FAFB] dark:bg-[#1B2230] flex items-center justify-between">
          <span className="text-xs text-[#6B778C]">
            Routed to EATX POS / Supy Support Queue
          </span>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-[#0052CC] hover:bg-[#0043A8] text-white text-[13px] font-medium rounded flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <>
                Submit {posSystem} request <Send size={14} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const PublicPosSupyIssue: React.FC = () => (
  <StaffPortalGate
    title="POS / Supy Issue Portal"
    subtitle="Report Linga POS or Supy issues and requests to EATX IT."
  >
    {(user) => <PosSupyFormContent user={user} />}
  </StaffPortalGate>
);

export default PublicPosSupyIssue;
