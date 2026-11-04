import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MdArrowBack, MdEdit, MdRefresh } from "react-icons/md";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";
import FollowUpCard from "../components/follow-ups/FollowUpCard";
import { getLead, getLeadFields, getLeadFollowUps, getSettings } from "../services/api";
import { getBrowserTimeZone } from "../utils/followUpTime";

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);
  const [lead, setLead] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [timeZone, setTimeZone] = useState(getBrowserTimeZone);
  const [loadedId, setLoadedId] = useState("");
  const [error, setError] = useState("");
  const [detailsError, setDetailsError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getLead(id), getLeadFields(), getLeadFollowUps(id), getSettings()])
      .then(([leadResult, fieldsResult, followUpsResult, settingsResult]) => {
        if (!active) return;
        const errors = [];
        if (leadResult.status === "fulfilled") {
          setLead(leadResult.value);
          setError("");
        } else {
          setLead(null);
          setError(leadResult.reason.response?.data?.message || "Unable to load this lead.");
        }
        if (fieldsResult.status === "fulfilled") setCustomFields(fieldsResult.value || []);
        else errors.push("Custom field definitions could not be loaded.");
        if (followUpsResult.status === "fulfilled") setFollowUps(followUpsResult.value || []);
        else errors.push("Follow-ups could not be loaded.");
        if (settingsResult.status === "fulfilled") {
          setTimeZone(settingsResult.value.workspace.timeZone || "Asia/Kolkata");
        } else {
          setTimeZone(getBrowserTimeZone());
          errors.push(`Workspace timezone is unavailable; showing dates in your browser timezone (${getBrowserTimeZone()}).`);
        }
        setDetailsError(errors.join(" "));
        setLoadedId(id);
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load this lead. Please retry.");
        setLoadedId(id);
      });
    return () => { active = false; };
  }, [id, retry]);

  const loading = loadedId !== id;
  const loadError = loadedId === id ? error : "";
  const activeLead = String(lead?._id || "") === id ? lead : null;
  const activeDetailsError = loadedId === id ? detailsError : "";
  const fields = activeLead
    ? customFields.map((field) => ({
      name: field.name,
      value: activeLead.customFields?.[field.key],
    }))
    : [];
  const retryLoad = () => {
    setLoadedId("");
    setError("");
    setDetailsError("");
    setRetry((count) => count + 1);
  };

  return (
    <div className={`crm-shell crm-dashboard-shell ${sidebarOpen ? "crm-sidebar-expanded" : "crm-sidebar-collapsed"}`}>
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => { if (window.innerWidth <= 760) setSidebarOpen(false); }}
        onToggle={() => setSidebarOpen((open) => !open)}
      />
      <main className="crm-main">
        <DashboardTopbar
          hideSearch
          onNotificationsClick={() => navigate("/follow-ups")}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          sidebarOpen={sidebarOpen}
        />
        <div className="crm-page crm-dashboard-page space-y-5">
          {loading ? (
            <section className="crm-panel p-8 text-center text-sm text-slate-600" role="status">Loading lead details...</section>
          ) : loadError ? (
            <section className="crm-panel p-8 text-center" role="alert">
              <p className="text-sm text-rose-700">{loadError}</p>
              <button type="button" onClick={retryLoad} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"><MdRefresh />Retry</button>
            </section>
          ) : activeLead && (
            <>
              <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <span className="crm-eyebrow">Lead details · Read only</span>
                  <h1 className="mt-1 break-words text-2xl font-extrabold tracking-tight text-slate-900">{activeLead.name || "Unnamed lead"}</h1>
                  <p className="mt-1 text-sm text-slate-600">{activeLead.company || "No company"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to="/leads" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><MdArrowBack />Back to leads</Link>
                  <button type="button" onClick={() => navigate(`/lead/${id}/edit`)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700"><MdEdit />Edit lead</button>
                </div>
              </header>

              {activeDetailsError && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert"><span>{activeDetailsError}</span><button type="button" onClick={retryLoad} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 font-semibold"><MdRefresh />Retry</button></div>}

              <section className="crm-panel overflow-hidden">
                <div className="crm-panel-heading"><div><h2>Contact information</h2><p>Lead status: <span className="font-semibold text-slate-700">{activeLead.status || "Unknown"}</span></p></div></div>
                <dl className="grid gap-4 p-5 sm:grid-cols-2">
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt><dd className="mt-1 break-all text-sm text-slate-800">{activeLead.email ? <a className="text-blue-700 hover:underline" href={`mailto:${activeLead.email}`}>{activeLead.email}</a> : "Not provided"}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</dt><dd className="mt-1 text-sm text-slate-800">{activeLead.phone ? <a className="text-blue-700 hover:underline" href={`tel:${activeLead.phone}`}>{activeLead.phone}</a> : "Not provided"}</dd></div>
                </dl>
              </section>

              <section className="crm-panel overflow-hidden">
                <div className="crm-panel-heading"><div><h2>Notes and custom fields</h2><p>Additional information recorded for this lead</p></div></div>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <div className="min-w-0 rounded-xl border border-slate-200 p-4 sm:col-span-2"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Notes</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{activeLead.notes || "No notes added."}</p></div>
                  {fields.map((field) => <div key={field.name} className="min-w-0 rounded-xl border border-slate-200 p-4"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{field.name}</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-800">{String(field.value ?? "—")}</p></div>)}
                  {!fields.length && !activeDetailsError && <p className="text-sm text-slate-600">No custom fields are configured.</p>}
                </div>
              </section>

              <section className="crm-panel overflow-hidden">
                <div className="crm-panel-heading"><div><h2>Follow-ups</h2><p>Scheduled activity in {timeZone}</p></div></div>
                {followUps.length ? <div className="follow-up-list p-4">{followUps.map((item) => <FollowUpCard key={item._id} item={item} timeZone={timeZone} />)}</div> : <p className="p-5 text-sm text-slate-600">No follow-ups scheduled for this lead.</p>}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default LeadDetail;
