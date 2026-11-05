import { useEffect, useMemo, useRef, useState } from "react";
import {
  MdCall,
  MdCheck,
  MdChevronLeft,
  MdChevronRight,
  MdEmail,
  MdEvent,
  MdMessage,
  MdMoreHoriz,
  MdSchedule,
  MdToday,
} from "react-icons/md";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";
import FollowUpModal from "../components/follow-ups/FollowUpModal";
import { cancelFollowUp, completeFollowUp, getFollowUps, getLeads } from "../services/api";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const filters = ["All", "Pending", "Completed", "Cancelled"];
const icons = { Call: MdCall, WhatsApp: MdMessage, Email: MdEmail, Meeting: MdEvent, Other: MdMoreHoriz };

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const localDate = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
};

const isValidDateKey = (key) => (
  typeof key === "string"
  && /^\d{4}-\d{2}-\d{2}$/.test(key)
  && dateKey(localDate(key)) === key
);

const getDateFromSearch = (search) => {
  const date = new URLSearchParams(search).get("date");
  return isValidDateKey(date) ? date : dateKey(new Date());
};

const formatDate = (key, options = { weekday: "long", month: "long", day: "numeric", year: "numeric" }) => (
  localDate(key).toLocaleDateString(undefined, options)
);

const compareEvents = (first, second) => (
  `${first.scheduledDate}T${first.scheduledTime}`.localeCompare(`${second.scheduledDate}T${second.scheduledTime}`)
);

const isFutureDate = (key) => key >= dateKey(new Date());

const Calendar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const todayKey = dateKey(new Date());
  const [followUps, setFollowUps] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => getDateFromSearch(location.search));
  const [month, setMonth] = useState(() => {
    const initialDate = localDate(getDateFromSearch(location.search));
    return new Date(initialDate.getFullYear(), initialDate.getMonth(), 1, 12);
  });
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [leadsError, setLeadsError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [leadPickerOpen, setLeadPickerOpen] = useState(false);
  const [scheduleLeadId, setScheduleLeadId] = useState("");
  const [editing, setEditing] = useState(null);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const busyIdsRef = useRef(new Set());
  const [retryCount, setRetryCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);

  useEffect(() => {
    const closeSidebarOnMobile = () => {
      if (window.innerWidth <= 760) setSidebarOpen(false);
    };
    window.addEventListener("resize", closeSidebarOnMobile);
    return () => window.removeEventListener("resize", closeSidebarOnMobile);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getFollowUps(), getLeads()])
      .then(([eventsResult, leadsResult]) => {
        if (!active) return;
        if (eventsResult.status === "fulfilled") {
          setFollowUps(eventsResult.value || []);
          setLoadError("");
        } else {
          setLoadError(eventsResult.reason.response?.data?.message || "Unable to load calendar events. Check your connection and try again.");
        }
        if (leadsResult.status === "fulfilled") {
          setLeads(leadsResult.value || []);
          setLeadsError("");
        } else {
          setLeadsError(leadsResult.reason.response?.data?.message || "Unable to load leads for scheduling.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retryCount]);

  const monthCells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [month]);

  const visibleEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return followUps.filter((item) => {
      const matchesStatus = filter === "All" || item.status === filter;
      const matchesSearch = !query || [
        item.leadId?.name,
        item.leadId?.company,
        item.type,
        item.note,
        item.status,
      ].some((value) => value?.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [filter, followUps, search]);

  const eventsByDate = useMemo(() => {
    const grouped = new Map();
    visibleEvents.forEach((item) => {
      const dayEvents = grouped.get(item.scheduledDate) || [];
      dayEvents.push(item);
      grouped.set(item.scheduledDate, dayEvents);
    });
    grouped.forEach((items) => items.sort(compareEvents));
    return grouped;
  }, [visibleEvents]);

  const selectedEvents = eventsByDate.get(selectedDate) || [];
  const pendingCount = followUps.filter((item) => item.status === "Pending").length;
  const selectedDateIsFuture = isFutureDate(selectedDate);
  const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const moveMonth = (amount) => {
    const next = new Date(month.getFullYear(), month.getMonth() + amount, 1, 12);
    setMonth(next);
    setSelectedDate(dateKey(next));
  };

  const goToToday = () => {
    const today = new Date();
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12));
    setSelectedDate(dateKey(today));
  };

  const updateEvent = (updated) => {
    setFollowUps((current) => current.map((item) => item._id === updated._id ? updated : item));
  };

  const completeEvent = async (item) => {
    if (busyIdsRef.current.has(item._id)) return;
    busyIdsRef.current.add(item._id);
    setBusyIds(new Set(busyIdsRef.current));
    setError("");
    setNotice("");
    try {
      updateEvent(await completeFollowUp(item._id));
      setNotice("Calendar event marked complete.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to complete this event.");
    } finally {
      busyIdsRef.current.delete(item._id);
      setBusyIds(new Set(busyIdsRef.current));
    }
  };

  const cancelEvent = async (item) => {
    if (busyIdsRef.current.has(item._id) || !window.confirm(`Cancel the ${item.type.toLowerCase()} with ${item.leadId?.name || "this lead"}?`)) return;
    busyIdsRef.current.add(item._id);
    setBusyIds(new Set(busyIdsRef.current));
    setError("");
    setNotice("");
    try {
      updateEvent(await cancelFollowUp(item._id));
      setNotice("Calendar event cancelled.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to cancel this event.");
    } finally {
      busyIdsRef.current.delete(item._id);
      setBusyIds(new Set(busyIdsRef.current));
    }
  };

  const schedule = () => {
    if (!selectedDateIsFuture) {
      setError("Choose today or a future date to schedule an event.");
      return;
    }
    setError("");
    setLeadPickerOpen(true);
  };

  const startScheduling = () => {
    if (!scheduleLeadId) {
      setError("Choose a lead for this calendar event.");
      return;
    }
    setLeadPickerOpen(false);
  };

  const scheduleLead = leads.find((lead) => lead._id === scheduleLeadId);
  const inputClass = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "device local time";
  const openNewLead = () => navigate("/leads/new", { state: { returnTo: `/calendar?date=${selectedDate}` } });
  const retryLoad = () => {
    setLoading(true);
    setLoadError("");
    setLeadsError("");
    setRetryCount((count) => count + 1);
  };
  const selectDate = (date) => {
    const nextDate = dateKey(date);
    setSelectedDate(nextDate);
    if (date.getMonth() !== month.getMonth() || date.getFullYear() !== month.getFullYear()) {
      setMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
    }
  };
  const handleCalendarKeyDown = (event, date) => {
    const nextDate = new Date(date);
    if (event.key === "ArrowRight") nextDate.setDate(nextDate.getDate() + 1);
    else if (event.key === "ArrowLeft") nextDate.setDate(nextDate.getDate() - 1);
    else if (event.key === "ArrowDown") nextDate.setDate(nextDate.getDate() + 7);
    else if (event.key === "ArrowUp") nextDate.setDate(nextDate.getDate() - 7);
    else if (event.key === "Home") nextDate.setDate(nextDate.getDate() - nextDate.getDay());
    else if (event.key === "End") nextDate.setDate(nextDate.getDate() + (6 - nextDate.getDay()));
    else if (event.key === "PageUp" || event.key === "PageDown") {
      const monthDelta = event.key === "PageUp" ? -1 : 1;
      const day = nextDate.getDate();
      nextDate.setDate(1);
      nextDate.setMonth(nextDate.getMonth() + monthDelta);
      const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
      nextDate.setDate(Math.min(day, lastDay));
    }
    else return;
    event.preventDefault();
    selectDate(nextDate);
    requestAnimationFrame(() => document.getElementById(`calendar-day-${dateKey(nextDate)}`)?.focus());
  };

  return (
    <div className={`crm-shell crm-dashboard-shell ${sidebarOpen ? "crm-sidebar-expanded" : "crm-sidebar-collapsed"}`}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => { if (window.innerWidth <= 760) setSidebarOpen(false); }} onToggle={() => setSidebarOpen((open) => !open)} />
      <main className="crm-main">
        <DashboardTopbar searchTerm={search} onSearchChange={setSearch} onToggleSidebar={() => setSidebarOpen((open) => !open)} sidebarOpen={sidebarOpen} />
        <div className="crm-page space-y-5">
          <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500" />
            <div className="relative">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Workspace / schedule</p>
              <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold tracking-tight text-slate-900">Calendar</h1>{!loading && !loadError && <span className="rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-bold text-blue-700">{pendingCount} pending</span>}</div>
              <p className="mt-1 text-sm text-slate-600">Plan calls, meetings, and follow-ups linked to your leads.</p>
              <p className="mt-1 text-xs font-medium text-slate-600">No account timezone is configured; times use your device timezone ({timeZone}). Events are linked to leads and also appear in Follow-ups.</p>
              {leadsError && <p className="mt-2 text-sm text-rose-700" role="alert">Unable to load leads for scheduling. <button type="button" onClick={retryLoad} className="font-bold underline underline-offset-2">Retry</button></p>}
              {!loading && !leadsError && leads.length === 0 && <p className="mt-2 text-sm text-slate-700">Add a lead before scheduling an event. <button type="button" onClick={openNewLead} className="font-bold text-blue-700 underline underline-offset-2">Create lead</button></p>}
            </div>
            {leads.length > 0 && !loading && !leadsError
              ? <button type="button" onClick={schedule} disabled={Boolean(loadError) || !selectedDateIsFuture} className="relative mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0"><MdSchedule size={18} />Schedule event</button>
              : !loading && !leadsError && <button type="button" onClick={openNewLead} className="relative mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700 sm:mt-0"><MdSchedule size={18} />Create lead</button>}
          </section>

          {(error || notice) && <div className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${error ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-800"}`} role={error ? "alert" : "status"}><span>{error || notice}</span><button type="button" className="font-bold" onClick={() => { setError(""); setNotice(""); }} aria-label="Dismiss message">&times;</button></div>}

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,.8fr)]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div><h2 className="text-lg font-bold text-slate-900">{monthLabel}</h2><p className="mt-0.5 text-xs text-slate-500">Select a day to see its schedule.</p></div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={goToToday} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"><MdToday />Today</button>
                  <div className="flex items-center rounded-lg border border-slate-200">
                    <button type="button" onClick={() => moveMonth(-1)} className="grid h-9 w-9 place-items-center text-slate-600 hover:bg-slate-50" aria-label="Previous month"><MdChevronLeft size={20} /></button>
                    <button type="button" onClick={() => moveMonth(1)} className="grid h-9 w-9 place-items-center border-l border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Next month"><MdChevronRight size={20} /></button>
                  </div>
                </div>
              </div>
              <div role="grid" aria-label={`${monthLabel} calendar`} aria-describedby="calendar-keyboard-help">
                <p id="calendar-keyboard-help" className="sr-only">Use arrow keys to move by day or week, Home and End to move to the start or end of the week, and Page Up or Page Down to move by month.</p>
                <div role="row" className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80">
                  {weekDays.map((day) => <div role="columnheader" key={day} className="py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:py-2.5 sm:text-xs">{day}</div>)}
                </div>
                {Array.from({ length: 6 }, (_, weekIndex) => (
                  <div role="row" key={`week-${weekIndex}`} className="grid grid-cols-7">
                    {monthCells.slice(weekIndex * 7, weekIndex * 7 + 7).map((date) => {
                      const key = dateKey(date);
                      const inMonth = date.getMonth() === month.getMonth();
                      const isToday = key === todayKey;
                      const isSelected = key === selectedDate;
                      const items = eventsByDate.get(key) || [];
                      return (
                        <div role="gridcell" key={key} aria-selected={isSelected}>
                          <button
                            type="button"
                            id={`calendar-day-${key}`}
                            tabIndex={isSelected ? 0 : -1}
                            onClick={() => selectDate(date)}
                            onKeyDown={(event) => handleCalendarKeyDown(event, date)}
                            aria-label={`${formatDate(key)}, ${items.length} event${items.length === 1 ? "" : "s"}${isToday ? ", today" : ""}${isSelected ? ", selected" : ""}`}
                            aria-current={isToday ? "date" : undefined}
                            className={`min-h-[62px] w-full border-b border-r border-slate-100 p-1 text-left transition hover:bg-blue-50/70 focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 sm:min-h-[72px] sm:p-1.5 ${!inMonth ? "bg-slate-50/60" : "bg-white"} ${isSelected ? "bg-blue-50 ring-2 ring-inset ring-blue-400" : ""}`}
                          >
                            <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold ${isToday ? "bg-blue-600 text-white" : inMonth ? "text-slate-700" : "text-slate-400"}`}>{date.getDate()}</span>
                            <span className="mt-0.5 hidden truncate text-[9px] font-semibold text-slate-600 sm:block">
                              {items.length > 0 ? `${items[0].scheduledTime} ${items[0].leadId?.name || items[0].type}` : ""}
                            </span>
                            {items.length > 1 && <span className="hidden text-[9px] font-semibold text-blue-700 sm:block">+{items.length - 1} more</span>}
                            {items.length > 0 && <span className="mt-1 flex justify-center gap-0.5 sm:hidden" aria-hidden="true">{items.slice(0, 3).map((item) => <i key={item._id} className={`h-1 w-1 rounded-full ${item.status === "Completed" ? "bg-emerald-500" : item.status === "Cancelled" ? "bg-slate-300" : "bg-blue-500"}`} />)}</span>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 border-t border-slate-100 px-4 py-3 text-[10px] font-semibold text-slate-500 sm:px-5">
                <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-blue-500" />Pending</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-500" />Completed</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-slate-300" />Cancelled</span>
              </div>
            </div>

            <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Selected day schedule">
              <div className="border-b border-slate-100 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Day schedule</p><h2 className="mt-1 text-base font-bold text-slate-900">{formatDate(selectedDate)}</h2><p className="mt-1 text-[11px] text-slate-600">{timeZone}</p></div><button type="button" onClick={schedule} disabled={loading || Boolean(loadError) || leads.length === 0 || !selectedDateIsFuture} className="inline-flex min-h-9 flex-none items-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Schedule event on ${formatDate(selectedDate, { month: "long", day: "numeric", year: "numeric" })}`}><MdEvent size={17} />Schedule</button></div>
                <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Filter calendar events">
                  {filters.map((option, index) => <button key={option} id={`calendar-filter-${option.toLowerCase()}`} type="button" role="radio" tabIndex={filter === option ? 0 : -1} onClick={() => setFilter(option)} onKeyDown={(event) => {
                    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) return;
                    event.preventDefault();
                    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? filters.length - 1 : (index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : filters.length - 1)) % filters.length;
                    setFilter(filters[nextIndex]);
                    document.getElementById(`calendar-filter-${filters[nextIndex].toLowerCase()}`)?.focus();
                  }} aria-checked={filter === option} className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${filter === option ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{option}</button>)}
                </div>
              </div>
              {loadError ? <div className="p-5 text-center text-sm text-rose-700" role="alert"><p>Unable to load calendar events. {loadError}</p><button type="button" onClick={retryLoad} className="mt-2 inline-flex items-center gap-1 font-bold underline underline-offset-2">Retry</button></div>
                : loading ? <p className="p-5 text-center text-sm text-slate-600" role="status">Loading calendar events…</p>
                : selectedEvents.length === 0 ? <div className="px-5 py-6 text-center"><span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-600"><MdEvent size={20} /></span><p className="mt-3 text-sm font-bold text-slate-800">{followUps.some((item) => item.scheduledDate === selectedDate) ? "No matching events" : "Nothing scheduled"}</p><p className="mt-1 text-xs text-slate-600">{followUps.some((item) => item.scheduledDate === selectedDate) ? "Try another status filter or search." : selectedDateIsFuture ? "Schedule a call, meeting, or reminder for this day." : "No events were recorded for this day."}</p>{!leadsError && leads.length === 0 && <button type="button" onClick={openNewLead} className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">Create lead</button>}{leadsError && <p className="mt-2 text-xs text-rose-700" role="alert">Could not load leads for scheduling. <button type="button" onClick={retryLoad} className="font-bold underline">Retry</button></p>}</div>
                  : <div className="max-h-[440px] divide-y divide-slate-100 overflow-y-auto" id="calendar-day-events" role="tabpanel" aria-label={`${filter} events for ${formatDate(selectedDate)}`}>
                    {selectedEvents.map((item) => {
                      const Icon = icons[item.type] || MdEvent;
                      const isBusy = busyIds.has(item._id);
                      return <article key={item._id} className="p-4">
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-xl ${item.status === "Completed" ? "bg-emerald-50 text-emerald-700" : item.status === "Cancelled" ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-700"}`}><Icon size={18} /></span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-900">{item.leadId?._id ? <Link to={`/lead/${item.leadId._id}`} className="text-blue-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">{item.leadId.name || "View lead"}</Link> : item.leadId?.name || "Unknown lead"}</h3><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${item.status === "Pending" ? "bg-blue-50 text-blue-700" : item.status === "Completed" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.status}</span></div>
                            <p className="mt-0.5 text-xs text-slate-500">{item.leadId?.company || "No company"} · {item.type}</p>
                            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700"><MdSchedule className="text-slate-400" />{item.scheduledTime}</p>
                            {item.note && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-600">{item.note}</p>}
                            {item.status === "Pending" && <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={isBusy} onClick={() => completeEvent(item)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"><MdCheck />{isBusy ? "Saving…" : "Complete"}</button><button type="button" disabled={isBusy} onClick={() => setEditing(item)} className="rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60">Edit</button><button type="button" disabled={isBusy} onClick={() => cancelEvent(item)} className="rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-bold text-slate-600 hover:border-rose-200 hover:text-rose-600 disabled:opacity-60">Cancel</button></div>}
                          </div>
                        </div>
                      </article>;
                    })}
                  </div>}
              <div className="border-t border-slate-100 p-4"><Link to="/follow-ups" className="text-xs font-bold text-blue-700 hover:text-blue-800">Open all follow-ups →</Link></div>
            </aside>
          </section>
          {loading && followUps.length === 0 && <span className="sr-only" role="status">Loading calendar events</span>}
        </div>
      </main>

      {leadPickerOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={() => setLeadPickerOpen(false)}><section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="calendar-lead-title" onMouseDown={(event) => event.stopPropagation()}><h2 id="calendar-lead-title" className="text-lg font-bold text-slate-900">Choose a lead</h2><p className="mt-1 text-sm text-slate-600">Events must be linked to a lead and will also appear in Follow-ups. Selected day: {formatDate(selectedDate, { month: "long", day: "numeric", year: "numeric" })}.</p>{leadsError ? <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700" role="alert">Unable to load leads. <button type="button" onClick={retryLoad} className="font-bold underline">Retry</button></p> : leads.length ? <label htmlFor="calendar-lead-select" className="mt-4 block text-xs font-semibold text-slate-700">Lead<select id="calendar-lead-select" className={`${inputClass} mt-1.5 w-full`} value={scheduleLeadId} onChange={(event) => setScheduleLeadId(event.target.value)}><option value="">Select a lead</option>{leads.map((lead) => <option key={lead._id} value={lead._id}>{lead.name}{lead.company ? ` · ${lead.company}` : ""}</option>)}</select></label> : <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">There are no leads to schedule against. <button type="button" onClick={() => { setLeadPickerOpen(false); openNewLead(); }} className="font-bold underline">Create a lead</button>.</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setLeadPickerOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">Cancel</button>{leads.length > 0 && !leadsError && <button type="button" onClick={startScheduling} disabled={!scheduleLeadId} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Continue</button>}</div></section></div>}
      {scheduleLead && !leadPickerOpen && <FollowUpModal key={`new-${scheduleLead._id}-${selectedDate}`} lead={scheduleLead} leads={leads} initialDate={selectedDate} onClose={() => setScheduleLeadId("")} onSaved={(saved) => { setFollowUps((current) => [...current, saved].sort(compareEvents)); setSelectedDate(saved.scheduledDate); const savedDate = localDate(saved.scheduledDate); setMonth(new Date(savedDate.getFullYear(), savedDate.getMonth(), 1, 12)); setScheduleLeadId(""); setNotice("Calendar event scheduled."); setError(""); }} />}
      {editing && <FollowUpModal key={editing._id} lead={editing.leadId} followUp={editing} onClose={() => setEditing(null)} onSaved={(updated) => { updateEvent(updated); setSelectedDate(updated.scheduledDate); const updatedDate = localDate(updated.scheduledDate); setMonth(new Date(updatedDate.getFullYear(), updatedDate.getMonth(), 1, 12)); setEditing(null); setNotice("Calendar event updated."); setError(""); }} />}
    </div>
  );
};

export default Calendar;
