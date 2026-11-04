import { useEffect, useRef, useState } from "react";
import { createFollowUp, updateFollowUp } from "../../services/api";
import { getBrowserTimeZone, getDateTimeParts, getTodayInTimeZone, isFollowUpInFuture } from "../../utils/followUpTime";

const types = ["Call", "WhatsApp", "Email", "Meeting", "Other"];
const getLeadIdentifier = (record) => String(record?._id || record?.id || record?.leadId?._id || record?.leadId || "");

const getDateKeyInTimeZone = (date, timeZone) => {
  const parts = getDateTimeParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const getNextDayInTimeZone = (timeZone, now = new Date()) => {
  const parts = getDateTimeParts(now, timeZone);
  const nextDay = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1));
  return `${nextDay.getUTCFullYear()}-${String(nextDay.getUTCMonth() + 1).padStart(2, "0")}-${String(nextDay.getUTCDate()).padStart(2, "0")}`;
};

const getInitialSchedule = (initialDate, timeZone) => {
  const today = getDateKeyInTimeZone(new Date(), timeZone);
  if (initialDate !== today) return { date: initialDate || getNextDayInTimeZone(timeZone), time: "10:00" };

  const parts = getDateTimeParts(new Date(), timeZone);
  const rounded = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute)));
  rounded.setUTCMinutes(Math.ceil(rounded.getUTCMinutes() / 15) * 15 + 30, 0, 0);
  if (getDateKeyInTimeZone(rounded, timeZone) !== today) return { date: getNextDayInTimeZone(timeZone), time: "10:00" };
  return {
    date: getDateKeyInTimeZone(rounded, timeZone),
    time: `${String(rounded.getUTCHours()).padStart(2, "0")}:${String(rounded.getUTCMinutes()).padStart(2, "0")}`,
  };
};

const FollowUpModal = ({ lead, leads = [], leadsLoading = false, leadsError = "", onRetryLeads, followUp, initialDate, timeZone = getBrowserTimeZone(), onClose, onSaved }) => {
  const matchingLead = leads.find((item) => lead?.email
    && String(item.email || "").trim().toLowerCase() === String(lead.email).trim().toLowerCase());
  const selectedLeadId = getLeadIdentifier(lead) || getLeadIdentifier(matchingLead);
  const canSelectLead = !followUp && !selectedLeadId;
  const [form, setForm] = useState(() => {
    const suggestedSchedule = getInitialSchedule(initialDate, timeZone);
    return {
      leadId: selectedLeadId,
      scheduledDate: followUp?.scheduledDate || suggestedSchedule.date,
      scheduledTime: followUp?.scheduledTime || suggestedSchedule.time,
      type: followUp?.type || "Call",
      note: followUp?.note || "",
    };
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusableElements = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  const handleChange = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const leadId = form.leadId || selectedLeadId;
    if (!followUp && !leadId) return setError("Choose a lead for this follow-up.");
    if (!form.scheduledDate || !form.scheduledTime) return setError("Date and time are required.");
    if (!isFollowUpInFuture(form.scheduledDate, form.scheduledTime, timeZone)) return setError("Choose a valid future date and time.");

    setSaving(true);
    setError("");
    try {
      const saved = followUp
        ? await updateFollowUp(followUp._id, form)
        : await createFollowUp({ ...form, leadId });
      onSaved(saved);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save follow-up.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={onClose}>
      <section ref={dialogRef} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="follow-up-form-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><span className="crm-eyebrow">Lead activity</span><h2 id="follow-up-form-title" className="mt-1 text-2xl font-bold text-slate-900">{followUp ? "Edit follow-up" : "Schedule follow-up"}</h2><p className="mt-1 text-sm text-slate-600">{lead?.name ? `${lead.name}${lead.company ? ` · ${lead.company}` : ""}` : "Choose the lead this follow-up is for."}</p></div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="text-xl text-slate-400 hover:text-slate-700" aria-label="Close">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {canSelectLead && leadsLoading && <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900" role="status">Loading leads…</p>}
          {canSelectLead && !leadsLoading && leadsError && <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert"><p>{leadsError}</p><button type="button" className="mt-1 font-bold underline underline-offset-2" onClick={onRetryLeads}>Retry lead list</button></div>}
          {canSelectLead && !leadsLoading && !leadsError && leads.length === 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">Add a lead before scheduling a follow-up.</p>}
          {canSelectLead && !leadsLoading && !leadsError && leads.length > 0 && <label htmlFor="follow-up-lead" className="block text-sm font-semibold text-slate-700">Lead<select id="follow-up-lead" name="leadId" value={form.leadId} onChange={handleChange} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal outline-none focus:border-purple-400" required><option value="">Choose a lead</option>{leads.map((item) => <option key={item._id} value={item._id}>{item.name}{item.company ? ` · ${item.company}` : ""}</option>)}</select></label>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor="follow-up-date" className="text-sm font-semibold text-slate-700">Date<input id="follow-up-date" name="scheduledDate" type="date" min={getTodayInTimeZone(timeZone)} value={form.scheduledDate} onChange={handleChange} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal outline-none focus:border-purple-400" required /></label>
            <label htmlFor="follow-up-time" className="text-sm font-semibold text-slate-700">Time<input id="follow-up-time" name="scheduledTime" type="time" value={form.scheduledTime} onChange={handleChange} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal outline-none focus:border-purple-400" required /></label>
          </div>
          <label htmlFor="follow-up-type" className="block text-sm font-semibold text-slate-700">Type<select id="follow-up-type" name="type" value={form.type} onChange={handleChange} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal outline-none focus:border-purple-400">{types.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label htmlFor="follow-up-note" className="block text-sm font-semibold text-slate-700">Notes<textarea id="follow-up-note" name="note" value={form.note} onChange={handleChange} rows="4" placeholder="Enter follow-up note" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal outline-none focus:border-purple-400" /></label>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">{error}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" disabled={saving || (canSelectLead && (leadsLoading || Boolean(leadsError) || leads.length === 0))} className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving..." : followUp ? "Save changes" : "Schedule follow-up"}</button></div>
        </form>
      </section>
    </div>
  );
};

export default FollowUpModal;
