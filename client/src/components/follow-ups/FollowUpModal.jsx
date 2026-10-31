import { useState } from "react";
import { createFollowUp, updateFollowUp } from "../../services/api";

const types = ["Call", "WhatsApp", "Email", "Meeting", "Other"];

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getInitialDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return dateKey(date);
};

const getInitialSchedule = (initialDate) => {
  const today = dateKey(new Date());
  if (initialDate !== today) return { date: initialDate || getInitialDate(), time: "10:00" };

  const date = new Date(Date.now() + 30 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  if (dateKey(date) !== today) return { date: getInitialDate(), time: "10:00" };
  return {
    date: today,
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  };
};

const FollowUpModal = ({ lead, followUp, initialDate, onClose, onSaved }) => {
  const [form, setForm] = useState(() => {
    const suggestedSchedule = getInitialSchedule(initialDate);
    return {
      scheduledDate: followUp?.scheduledDate || suggestedSchedule.date,
      scheduledTime: followUp?.scheduledTime || suggestedSchedule.time,
      type: followUp?.type || "Call",
      note: followUp?.note || "",
    };
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.scheduledDate || !form.scheduledTime) return setError("Date and time are required.");
    const scheduledAt = new Date(`${form.scheduledDate}T${form.scheduledTime}`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) return setError("Choose a future date and time.");

    setSaving(true);
    setError("");
    try {
      const saved = followUp
        ? await updateFollowUp(followUp._id, form)
        : await createFollowUp({ ...form, leadId: lead._id });
      onSaved(saved);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save follow-up.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={onClose}>
      <section className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><span className="crm-eyebrow">Lead activity</span><h2 className="mt-1 text-2xl font-bold text-slate-900">{followUp ? "Edit follow-up" : "Schedule follow-up"}</h2><p className="mt-1 text-sm text-slate-500">{lead.name} · {lead.company}</p></div>
          <button type="button" onClick={onClose} className="text-xl text-slate-400 hover:text-slate-700" aria-label="Close">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Date<input name="scheduledDate" type="date" min={dateKey(new Date())} value={form.scheduledDate} onChange={handleChange} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal outline-none focus:border-purple-400" required /></label>
            <label className="text-sm font-semibold text-slate-700">Time<input name="scheduledTime" type="time" value={form.scheduledTime} onChange={handleChange} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal outline-none focus:border-purple-400" required /></label>
          </div>
          <label className="block text-sm font-semibold text-slate-700">Type<select name="type" value={form.type} onChange={handleChange} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal outline-none focus:border-purple-400">{types.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="block text-sm font-semibold text-slate-700">Notes<textarea name="note" value={form.note} onChange={handleChange} rows="4" placeholder="Enter follow-up note" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal outline-none focus:border-purple-400" /></label>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">{error}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : followUp ? "Save changes" : "Schedule follow-up"}</button></div>
        </form>
      </section>
    </div>
  );
};

export default FollowUpModal;
