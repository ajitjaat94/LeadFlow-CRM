import { useEffect, useMemo, useState } from "react";
import { MdAdd, MdEvent, MdRefresh } from "react-icons/md";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";
import FollowUpCard from "../components/follow-ups/FollowUpCard";
import FollowUpModal from "../components/follow-ups/FollowUpModal";
import { cancelFollowUp, completeFollowUp, getFollowUps, getLeads, getSettings } from "../services/api";
import { getBrowserTimeZone, getTodayInTimeZone, isFollowUpOverdue } from "../utils/followUpTime";

const filters = ["All", "Today", "Upcoming", "Overdue", "Completed"];

const matchesFilter = (item, filter, today, timeZone) => {
  if (filter === "Completed") return item.status === "Completed";
  if (item.status !== "Pending") return filter === "All";
  if (filter === "Today") return item.scheduledDate === today;
  if (filter === "Upcoming") return item.scheduledDate > today;
  if (filter === "Overdue") return isFollowUpOverdue(item, timeZone);
  return true;
};

const errorMessage = (requestError, fallback) => (
  requestError.response?.data?.message || requestError.message || fallback
);

const FollowUps = () => {
  const [followUps, setFollowUps] = useState([]);
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [timeZone, setTimeZone] = useState(getBrowserTimeZone);
  const [timeZoneError, setTimeZoneError] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [leadsError, setLeadsError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [editing, setEditing] = useState(null);
  const [scheduling, setScheduling] = useState(false);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);

  useEffect(() => {
    let active = true;
    getFollowUps()
      .then((result) => {
        if (!active) return;
        setFollowUps(result);
        setLoadError("");
      })
      .catch((requestError) => {
        if (active) setLoadError(errorMessage(requestError, "Unable to load follow-ups."));
      })
      .finally(() => { if (active) setLoading(false); });
    getLeads()
      .then((result) => {
        if (!active) return;
        setLeads(result);
        setLeadsError("");
      })
      .catch((requestError) => {
        if (active) {
          setLeads([]);
          setLeadsError(errorMessage(requestError, "Unable to load leads for scheduling."));
        }
      })
      .finally(() => { if (active) setLeadsLoading(false); });
    getSettings()
      .then((result) => {
        if (!active) return;
        setTimeZone(result.workspace.timeZone || "Asia/Kolkata");
        setTimeZoneError("");
      })
      .catch(() => {
        if (!active) return;
        const browserTimeZone = getBrowserTimeZone();
        setTimeZone(browserTimeZone);
        setTimeZoneError(`Workspace timezone is unavailable from the server. Overdue status is using your browser timezone (${browserTimeZone}).`);
      });
    return () => { active = false; };
  }, [retryCount]);

  const today = getTodayInTimeZone(timeZone);
  const counts = useMemo(() => Object.fromEntries(
    filters.map((option) => [option, followUps.filter((item) => matchesFilter(item, option, today, timeZone)).length]),
  ), [followUps, timeZone, today]);
  const visibleFollowUps = useMemo(
    () => followUps.filter((item) => matchesFilter(item, filter, today, timeZone)),
    [filter, followUps, timeZone, today],
  );

  const retryLoad = () => {
    setLoading(true);
    setLeadsLoading(true);
    setLoadError("");
    setLeadsError("");
    setTimeZoneError("");
    setRetryCount((count) => count + 1);
  };

  const updateBusy = (id, isBusy) => {
    setBusyIds((current) => {
      const next = new Set(current);
      if (isBusy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleComplete = async (item) => {
    if (busyIds.has(item._id)) return;
    updateBusy(item._id, true);
    setError("");
    setNotice("");
    try {
      const updated = await completeFollowUp(item._id);
      setFollowUps((current) => current.map((entry) => entry._id === updated._id ? updated : entry));
      setNotice("Follow-up marked complete.");
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to complete this follow-up. Please retry."));
    } finally {
      updateBusy(item._id, false);
    }
  };

  const handleCancel = async (item) => {
    if (busyIds.has(item._id) || !window.confirm("Cancel this follow-up?")) return;
    updateBusy(item._id, true);
    setError("");
    setNotice("");
    try {
      const updated = await cancelFollowUp(item._id);
      setFollowUps((current) => current.map((entry) => entry._id === updated._id ? updated : entry));
      setNotice("Follow-up cancelled.");
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to cancel this follow-up. Please retry."));
    } finally {
      updateBusy(item._id, false);
    }
  };

  const handleSaved = (saved) => {
    setFollowUps((current) => {
      const exists = current.some((item) => item._id === saved._id);
      return exists
        ? current.map((item) => item._id === saved._id ? saved : item)
        : [saved, ...current];
    });
    setEditing(null);
    setScheduling(false);
    setError("");
    setNotice(editing ? "Follow-up updated." : "Follow-up scheduled.");
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
          onAddLead={() => { setEditing(null); setScheduling(true); }}
          addButtonLabel="Schedule follow-up"
          hideSearch
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          sidebarOpen={sidebarOpen}
        />
        <div className="crm-page follow-ups-page">
          <div className="crm-page-heading">
            <div>
              <span className="crm-eyebrow">Lead activity</span>
              <h1>Follow-ups</h1>
              <p>Stay on top of scheduled conversations. Dates and times use {timeZone}.</p>
            </div>
          </div>
          {(error || notice) && (
            <div className={`follow-up-feedback ${error ? "follow-up-error" : "follow-up-success"}`} role={error ? "alert" : "status"}>
              <span>{error || notice}</span>
              <button type="button" onClick={() => { setError(""); setNotice(""); }} aria-label="Dismiss message">×</button>
            </div>
          )}
          {timeZoneError && <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">{timeZoneError} Overdue indicators currently use your browser timezone.</p>}
          <section className="crm-panel" aria-label="Follow-up list">
            <div className="follow-up-filters" role="group" aria-label="Filter follow-ups">
              {filters.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => setFilter(option)}
                  className={filter === option ? "follow-up-filter-active" : ""}
                  aria-pressed={filter === option}
                  disabled={loading}
                >
                  {option} <span aria-label={`${counts[option]} follow-ups`}>{counts[option]}</span>
                </button>
              ))}
            </div>
            {loadError ? (
              <div className="follow-up-empty" role="alert">
                <p>Unable to load follow-ups. {loadError}</p>
                <button type="button" onClick={retryLoad} className="follow-up-action"><MdRefresh /> Retry</button>
              </div>
            ) : loading ? (
              <p className="follow-up-empty" role="status">Loading follow-ups...</p>
            ) : visibleFollowUps.length === 0 ? (
              <div className="follow-up-empty">
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><MdEvent size={21} /></span>
                <p className="mt-3 font-semibold text-slate-800">{followUps.length === 0 ? "No follow-ups yet" : `No ${filter.toLowerCase()} follow-ups`}</p>
                <p className="mt-1 text-slate-600">{followUps.length === 0 ? "Schedule a follow-up to plan your next conversation." : "Try another filter or schedule a new follow-up."}</p>
                {(followUps.length === 0 || filter !== "All") && (
                  <div className="mt-3 flex justify-center gap-2">
                    {followUps.length > 0 && filter !== "All" && <button type="button" className="follow-up-action follow-up-action-secondary" onClick={() => setFilter("All")}>Show all</button>}
                    <button type="button" className="follow-up-action" onClick={() => { setEditing(null); setScheduling(true); }}><MdAdd /> Schedule follow-up</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="follow-up-list">
                {visibleFollowUps.map((item) => (
                  <FollowUpCard
                    key={item._id}
                    item={item}
                    onComplete={handleComplete}
                    onEdit={setEditing}
                    onCancel={handleCancel}
                    busy={busyIds.has(item._id)}
                    timeZone={timeZone}
                  />
                ))}
              </div>
            )}
          </section>
          {leadsError && !loadError && <p className="mt-3 text-sm text-amber-800" role="status">{leadsError} Retry loading before scheduling.</p>}
        </div>
      </main>
      {(editing || scheduling) && (
        <FollowUpModal
          key={editing?._id || "new-follow-up"}
          lead={editing?.leadId}
          leads={leads}
          leadsLoading={leadsLoading}
          leadsError={leadsError}
          onRetryLeads={retryLoad}
          followUp={editing}
          onClose={() => { setEditing(null); setScheduling(false); }}
          onSaved={handleSaved}
          timeZone={timeZone}
        />
      )}
    </div>
  );
};

export default FollowUps;
