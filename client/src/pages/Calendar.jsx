import { useEffect, useMemo, useState } from "react";
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
import { Link } from "react-router-dom";
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

const formatDate = (key, options = { weekday: "long", month: "long", day: "numeric", year: "numeric" }) => (
  localDate(key).toLocaleDateString(undefined, options)
);

const compareEvents = (first, second) => (
  `${first.scheduledDate}T${first.scheduledTime}`.localeCompare(`${second.scheduledDate}T${second.scheduledTime}`)
);

const isFutureDate = (key) => key >= dateKey(new Date());

const Calendar = () => {
  const todayKey = dateKey(new Date());
  const [followUps, setFollowUps] = useState([]);
  const [leads, setLeads] = useState([]);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [leadPickerOpen, setLeadPickerOpen] = useState(false);
  const [scheduleLeadId, setScheduleLeadId] = useState("");
  const [editing, setEditing] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);

  useEffect(() => {
    let active = true;
    Promise.all([getFollowUps(), getLeads()])
      .then(([items, leadItems]) => {
        if (!active) return;
        setFollowUps(items || []);
        setLeads(leadItems || []);
      })
      .catch((requestError) => {
        if (active && requestError.response?.status !== 401) {
          setError(requestError.response?.data?.message || "Unable to load your calendar. Check the API connection and try again.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

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
    try {
      updateEvent(await completeFollowUp(item._id));
      setNotice("Calendar event marked complete.");
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to complete this event.");
    }
  };

  const cancelEvent = async (item) => {
    if (!window.confirm(`Cancel the ${item.type.toLowerCase()} with ${item.leadId?.name || "this lead"}?`)) return;
    try {
      updateEvent(await cancelFollowUp(item._id));
      setNotice("Calendar event cancelled.");
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to cancel this event.");
    }
  };

  const schedule = () => {
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

  return (
    <div className={`crm-shell ${sidebarOpen ? "crm-sidebar-expanded" : "crm-sidebar-collapsed"}`}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => { if (window.innerWidth <= 760) setSidebarOpen(false); }} onToggle={() => setSidebarOpen((open) => !open)} />
      <main className="crm-main">
        <DashboardTopbar searchTerm={search} onSearchChange={setSearch} onAddLead={schedule} addButtonLabel="Schedule event" onToggleSidebar={() => setSidebarOpen((open) => !open)} sidebarOpen={sidebarOpen} />
        <div className="crm-page space-y-5">
          <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500" />
            <div className="relative">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Workspace / schedule</p>
              <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold tracking-tight text-slate-900">Calendar</h1><span className="rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-bold text-blue-700">{pendingCount} pending</span></div>
              <p className="mt-1 text-sm text-slate-600">Plan calls, meetings, and follow-ups linked to your leads.</p>
            </div>
            <button type="button" onClick={schedule} className="relative mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700 sm:mt-0"><MdSchedule size={18} />Schedule event</button>
          </section>

          {(error || notice) && <div className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${error ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-800"}`} role={error ? "alert" : "status"}><span>{error || notice}</span><button type="button" className="font-bold" onClick={() => { setError(""); setNotice(""); }} aria-label="Dismiss message">&times;</button></div>}

          <section className="grid gap-4 2xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,.8fr)]">
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
              <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80">
                {weekDays.map((day) => <div key={day} className="py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:py-3 sm:text-xs">{day}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {monthCells.map((date) => {
                  const key = dateKey(date);
                  const inMonth = date.getMonth() === month.getMonth();
                  const isToday = key === todayKey;
                  const isSelected = key === selectedDate;
                  const items = eventsByDate.get(key) || [];
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => {
                        setSelectedDate(key);
                        if (!inMonth) setMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
                      }}
                      aria-label={`${formatDate(key)}, ${items.length} event${items.length === 1 ? "" : "s"}`}
                      aria-pressed={isSelected}
                      className={`min-h-[76px] border-b border-r border-slate-100 p-1.5 text-left transition hover:bg-blue-50/70 sm:min-h-[108px] sm:p-2 ${!inMonth ? "bg-slate-50/60" : "bg-white"} ${isSelected ? "bg-blue-50 ring-2 ring-inset ring-blue-400" : ""}`}
                    >
                      <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold sm:h-7 sm:w-7 sm:text-xs ${isToday ? "bg-blue-600 text-white" : inMonth ? "text-slate-700" : "text-slate-300"}`}>{date.getDate()}</span>
                      <span className="mt-1 hidden space-y-1 sm:block">
                        {items.slice(0, 3).map((item) => {
                          const Icon = icons[item.type] || MdEvent;
                          return <span key={item._id} className={`flex items-center gap-1 truncate rounded px-1.5 py-1 text-[10px] font-semibold ${item.status === "Completed" ? "bg-emerald-50 text-emerald-700" : item.status === "Cancelled" ? "bg-slate-100 text-slate-500 line-through" : "bg-blue-50 text-blue-700"}`}><Icon className="flex-none" /><span className="truncate">{item.scheduledTime} {item.leadId?.name || item.type}</span></span>;
                        })}
                        {items.length > 3 && <span className="block px-1 text-[9px] font-semibold text-slate-500">+{items.length - 3} more</span>}
                      </span>
                      {items.length > 0 && <span className="mt-1 flex justify-center gap-0.5 sm:hidden">{items.slice(0, 3).map((item) => <i key={item._id} className={`h-1 w-1 rounded-full ${item.status === "Completed" ? "bg-emerald-500" : item.status === "Cancelled" ? "bg-slate-300" : "bg-blue-500"}`} />)}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 border-t border-slate-100 px-4 py-3 text-[10px] font-semibold text-slate-500 sm:px-5">
                <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-blue-500" />Pending</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-500" />Completed</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-slate-300" />Cancelled</span>
              </div>
            </div>

            <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Day schedule</p><h2 className="mt-1 text-base font-bold text-slate-900">{formatDate(selectedDate)}</h2></div><button type="button" onClick={schedule} className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100" aria-label="Schedule event on selected day"><MdEvent size={19} /></button></div>
                <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter calendar events">
                  {filters.map((option) => <button key={option} type="button" onClick={() => setFilter(option)} aria-pressed={filter === option} className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold ${filter === option ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{option}</button>)}
                </div>
              </div>
              {loading ? <p className="p-5 text-center text-sm text-slate-500">Loading calendar...</p>
                : selectedEvents.length === 0 ? <div className="px-5 py-10 text-center"><span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-600"><MdEvent size={20} /></span><p className="mt-3 text-sm font-bold text-slate-800">Nothing scheduled</p><p className="mt-1 text-xs text-slate-500">{selectedDateIsFuture ? "Schedule a call, meeting, or reminder for this day." : "No events were recorded for this day."}</p>{selectedDateIsFuture && <button type="button" onClick={schedule} className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">Add an event</button>}</div>
                  : <div className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto">
                    {selectedEvents.map((item) => {
                      const Icon = icons[item.type] || MdEvent;
                      return <article key={item._id} className="p-4">
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-xl ${item.status === "Completed" ? "bg-emerald-50 text-emerald-700" : item.status === "Cancelled" ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-700"}`}><Icon size={18} /></span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-900">{item.leadId?.name || "Unknown lead"}</h3><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${item.status === "Pending" ? "bg-blue-50 text-blue-700" : item.status === "Completed" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.status}</span></div>
                            <p className="mt-0.5 text-xs text-slate-500">{item.leadId?.company || "No company"} · {item.type}</p>
                            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700"><MdSchedule className="text-slate-400" />{item.scheduledTime}</p>
                            {item.note && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-600">{item.note}</p>}
                            {item.status === "Pending" && <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => completeEvent(item)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"><MdCheck />Complete</button><button type="button" onClick={() => setEditing(item)} className="rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50">Edit</button><button type="button" onClick={() => cancelEvent(item)} className="rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-bold text-slate-500 hover:border-rose-200 hover:text-rose-600">Cancel</button></div>}
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

      {leadPickerOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={() => setLeadPickerOpen(false)}><section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="calendar-lead-title" onMouseDown={(event) => event.stopPropagation()}><h2 id="calendar-lead-title" className="text-lg font-bold text-slate-900">Choose a lead</h2><p className="mt-1 text-sm text-slate-500">Calendar events are linked to a lead and appear in its follow-up history.</p>{leads.length ? <label className="mt-4 block text-xs font-semibold text-slate-600">Lead<select className={`${inputClass} mt-1.5 w-full`} value={scheduleLeadId} onChange={(event) => setScheduleLeadId(event.target.value)}><option value="">Select a lead</option>{leads.map((lead) => <option key={lead._id} value={lead._id}>{lead.name}{lead.company ? ` · ${lead.company}` : ""}</option>)}</select></label> : <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">There are no leads to schedule against. <Link className="font-bold underline" to="/leads/new">Create a lead</Link>.</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setLeadPickerOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">Cancel</button>{leads.length > 0 && <button type="button" onClick={startScheduling} disabled={!scheduleLeadId} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Continue</button>}</div></section></div>}
      {scheduleLead && !leadPickerOpen && <FollowUpModal key={`new-${scheduleLead._id}-${selectedDate}`} lead={scheduleLead} initialDate={selectedDateIsFuture ? selectedDate : undefined} onClose={() => setScheduleLeadId("")} onSaved={(saved) => { setFollowUps((current) => [...current, saved].sort(compareEvents)); setSelectedDate(saved.scheduledDate); const savedDate = localDate(saved.scheduledDate); setMonth(new Date(savedDate.getFullYear(), savedDate.getMonth(), 1, 12)); setScheduleLeadId(""); setNotice("Calendar event scheduled."); setError(""); }} />}
      {editing && <FollowUpModal key={editing._id} lead={editing.leadId} followUp={editing} onClose={() => setEditing(null)} onSaved={(updated) => { updateEvent(updated); setSelectedDate(updated.scheduledDate); const updatedDate = localDate(updated.scheduledDate); setMonth(new Date(updatedDate.getFullYear(), updatedDate.getMonth(), 1, 12)); setEditing(null); setNotice("Calendar event updated."); setError(""); }} />}
    </div>
  );
};

export default Calendar;
