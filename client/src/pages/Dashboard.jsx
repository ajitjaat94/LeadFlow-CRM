import { useEffect, useMemo, useState } from "react";
import {
  MdAdd,
  MdArrowForward,
  MdBolt,
  MdCheck,
  MdCheckCircle,
  MdDownload,
  MdFileUpload,
  MdGroups,
  MdPersonAddAlt1,
  MdRefresh,
  MdTrendingDown,
} from "react-icons/md";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";
import { LEAD_STATUSES } from "../data/leadStatuses";
import { completeFollowUp, deleteLead, getDashboardFollowUps, getLeads } from "../services/api";

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_BOUNDS = { left: 44, right: 690, top: 20, bottom: 164 };
const RANGE_PRESETS = [
  { value: "7days", label: "Last 7 days", days: 7 },
  { value: "30days", label: "Last 30 days", days: 30 },
  { value: "90days", label: "Last 90 days", days: 90 },
];

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
};

const dateOrdinal = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
};

const isValidDateKey = (key) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || "")) return false;
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const getRangeForPreset = (days, today = new Date()) => {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return { start: toDateKey(start), end: toDateKey(end) };
};

const getLeadSource = (record) => {
  const customFields = record.customFields instanceof Map
    ? Object.fromEntries(record.customFields)
    : record.customFields || {};
  const sourceValue = Object.entries(customFields).find(([key]) => key.toLowerCase() === "source")?.[1];
  const source = record.source || sourceValue;
  return typeof source === "string" && source.trim() ? source.trim() : "Not recorded";
};

const formatDate = (dateKey, options = { day: "numeric", month: "short" }) => {
  if (!dateKey) return "—";
  const date = parseDateKey(dateKey);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, options);
};

const formatTimestamp = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const getChartX = (index, count) => (
  count > 1
    ? CHART_BOUNDS.left + (index * (CHART_BOUNDS.right - CHART_BOUNDS.left)) / (count - 1)
    : (CHART_BOUNDS.left + CHART_BOUNDS.right) / 2
);

const getChartY = (value, maxValue) => (
  CHART_BOUNDS.bottom - (value / maxValue) * (CHART_BOUNDS.bottom - CHART_BOUNDS.top)
);

const getTrendPath = (values, maxValue) => values.map((value, index) => {
  const x = getChartX(index, values.length);
  const y = getChartY(value, maxValue);
  return `${index === 0 ? "M" : "L"} ${x} ${y}`;
}).join(" ");

const escapeCsvValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const toUserFacingLoadError = (error, resourceName) => {
  if (error.message?.includes("invalid response")) {
    return `${resourceName} returned an invalid response. The dashboard cannot show this data.`;
  }
  if (!error.response) return `${resourceName} could not be reached. Check the API/database connection and retry.`;
  if (error.response.status >= 500 || error.response.status === 503) {
    return `${resourceName} is unavailable. The API or database may be offline. Retry when the service is available.`;
  }
  return error.response.data?.message || `Unable to load ${resourceName.toLowerCase()}.`;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [leads, setLeads] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("accessToken")));
  const [refreshing, setRefreshing] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [taskError, setTaskError] = useState("");
  const [notice, setNotice] = useState("");
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("accessToken"));
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);
  const [rangePreset, setRangePreset] = useState("30days");
  const [customRange, setCustomRange] = useState(() => getRangeForPreset(30));
  const [searchTerm, setSearchTerm] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [completingIds, setCompletingIds] = useState([]);
  const [greetingExpiresAt, setGreetingExpiresAt] = useState(
    () => Number(location.state?.greetingExpiresAt) || 0,
  );
  const [greetingTime, setGreetingTime] = useState(() => {
    const expiresAt = Number(location.state?.greetingExpiresAt);
    return expiresAt ? new Date(expiresAt - 2 * 60 * 1000) : new Date();
  });

  useEffect(() => {
    const closeSidebarOnMobile = () => {
      if (window.innerWidth <= 760) setSidebarOpen(false);
    };
    window.addEventListener("resize", closeSidebarOnMobile);
    return () => window.removeEventListener("resize", closeSidebarOnMobile);
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      setAccessToken(null);
      setLeads([]);
      setFollowUps([]);
      setLoading(false);
      setRefreshing(false);
      setLeadError("");
      setTaskError("");
    };
    window.addEventListener("leadflow:session-expired", handleSessionExpired);
    return () => window.removeEventListener("leadflow:session-expired", handleSessionExpired);
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    let active = true;
    const loadDashboard = async () => {
      setLeadError("");
      setTaskError("");
      const [leadResult, followUpResult] = await Promise.allSettled([getLeads(), getDashboardFollowUps()]);
      if (!active) return;

      if (leadResult.status === "fulfilled" && Array.isArray(leadResult.value)) {
        setLeads(leadResult.value);
      } else {
        const error = leadResult.status === "rejected"
          ? leadResult.reason
          : new Error("The leads API returned an invalid response.");
        setLeads([]);
        setLeadError(toUserFacingLoadError(error, "Lead data"));
      }

      if (followUpResult.status === "fulfilled" && Array.isArray(followUpResult.value)) {
        setFollowUps(followUpResult.value);
      } else {
        const error = followUpResult.status === "rejected"
          ? followUpResult.reason
          : new Error("The follow-ups API returned an invalid response.");
        setFollowUps([]);
        setTaskError(toUserFacingLoadError(error, "Follow-up data"));
      }

      setLoading(false);
      setRefreshing(false);
    };
    void loadDashboard();
    return () => { active = false; };
  }, [accessToken, retryCount]);

  useEffect(() => {
    if (!greetingExpiresAt) return undefined;
    const timeoutId = window.setTimeout(() => {
      setGreetingExpiresAt(0);
      navigate(location.pathname, { replace: true, state: {} });
    }, Math.max(0, greetingExpiresAt - Date.now()));
    return () => window.clearTimeout(timeoutId);
  }, [greetingExpiresAt, location.pathname, navigate]);

  const handleRetry = () => {
    if (leads.length) setRefreshing(true);
    else setLoading(true);
    setRetryCount((count) => count + 1);
  };

  const handleDeleteLead = async (id) => {
    const record = leads.find((item) => item._id === id);
    if (!record || !window.confirm(`Delete lead "${record.name}"? This cannot be undone.`)) return;
    setNotice("");
    try {
      await deleteLead(id);
      setLeads((current) => current.filter((item) => item._id !== id));
      setNotice("Lead deleted.");
    } catch (error) {
      setLeadError(error.response?.data?.message || "Unable to delete this lead.");
    }
  };

  const handleCompleteFollowUp = async (item) => {
    if (completingIds.includes(item._id)) return;
    setCompletingIds((current) => [...current, item._id]);
    setTaskError("");
    setNotice("");
    try {
      await completeFollowUp(item._id);
      setFollowUps((current) => current.map((followUp) => (
        followUp._id === item._id ? { ...followUp, status: "Completed", completedAt: new Date().toISOString() } : followUp
      )));
      setNotice(`Completed ${String(item.type || "follow-up").toLowerCase()}${item.leadId?.name ? ` for ${item.leadId.name}` : ""}.`);
    } catch (error) {
      setTaskError(error.response?.data?.message || "Unable to complete this follow-up. Please retry.");
    } finally {
      setCompletingIds((current) => current.filter((id) => id !== item._id));
    }
  };

  const currentRange = useMemo(() => {
    if (rangePreset === "custom") return customRange;
    const preset = RANGE_PRESETS.find((item) => item.value === rangePreset) || RANGE_PRESETS[1];
    return getRangeForPreset(preset.days);
  }, [customRange, rangePreset]);
  const todayKey = toDateKey(new Date());
  const rangeValid = Boolean(
    isValidDateKey(currentRange.start)
    && isValidDateKey(currentRange.end)
    && currentRange.start <= currentRange.end
    && currentRange.end <= todayKey,
  );
  const rangeLabel = rangePreset === "custom"
    ? `${formatDate(currentRange.start, { day: "numeric", month: "short", year: "numeric" })} – ${formatDate(currentRange.end, { day: "numeric", month: "short", year: "numeric" })}`
    : RANGE_PRESETS.find((item) => item.value === rangePreset)?.label || "Last 30 days";

  const inRangeLeads = useMemo(() => {
    if (!rangeValid) return [];
    return leads.filter((record) => {
      if (!record.createdAt) return false;
      const timestamp = new Date(record.createdAt);
      if (Number.isNaN(timestamp.getTime())) return false;
      const createdDate = toDateKey(timestamp);
      return createdDate >= currentRange.start && createdDate <= currentRange.end;
    });
  }, [currentRange.end, currentRange.start, leads, rangeValid]);

  const leadMetrics = useMemo(() => {
    const counts = Object.fromEntries(LEAD_STATUSES.map((status) => [
      status,
      inRangeLeads.filter((record) => record.status === status).length,
    ]));
    return {
      total: inRangeLeads.length,
      won: counts.Won,
      active: inRangeLeads.length - counts.Won - counts.Lost,
      lost: counts.Lost,
      counts,
    };
  }, [inRangeLeads]);

  const pipelineCounts = useMemo(() => LEAD_STATUSES.map((name) => ({
    name,
    count: leads.filter((record) => record.status === name).length,
  })), [leads]);
  const pipelineKnownTotal = pipelineCounts.reduce((sum, stage) => sum + stage.count, 0);
  const pipelineUnclassified = Math.max(0, leads.length - pipelineKnownTotal);
  const pipelineTotal = leads.length;

  const chartData = useMemo(() => {
    if (!rangeValid) return { labels: [], values: [], boundaries: [], max: 1, ticks: [], hasActivity: false };
    const totalDays = dateOrdinal(currentRange.end) - dateOrdinal(currentRange.start) + 1;
    const bucketCount = Math.min(7, totalDays);
    const values = Array(bucketCount).fill(0);
    const boundaries = Array.from({ length: bucketCount }, (_, index) => {
      const startOffset = Math.floor((index * totalDays) / bucketCount);
      const endOffset = Math.floor(((index + 1) * totalDays) / bucketCount) - 1;
      const startDate = new Date(`${currentRange.start}T12:00:00`);
      startDate.setDate(startDate.getDate() + startOffset);
      const endDate = new Date(`${currentRange.start}T12:00:00`);
      endDate.setDate(endDate.getDate() + endOffset);
      return { start: toDateKey(startDate), end: toDateKey(endDate) };
    });

    inRangeLeads.forEach((record) => {
      if (!record.createdAt) return;
      const timestamp = new Date(record.createdAt);
      if (Number.isNaN(timestamp.getTime())) return;
      const createdDate = toDateKey(timestamp);
      const offset = dateOrdinal(createdDate) - dateOrdinal(currentRange.start);
      const index = Math.min(bucketCount - 1, Math.floor((offset * bucketCount) / totalDays));
      if (index >= 0) values[index] += 1;
    });

    const largestValue = Math.max(0, ...values);
    const step = Math.max(1, Math.ceil(largestValue / 4));
    const max = step * 4;
    const ticks = Array.from({ length: 5 }, (_, index) => {
      const value = max - index * step;
      return {
        value,
        y: CHART_BOUNDS.top + (index * (CHART_BOUNDS.bottom - CHART_BOUNDS.top)) / 4,
      };
    });
    const formatter = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
    return {
      labels: boundaries.map(({ start, end }) => {
        const startLabel = formatter.format(parseDateKey(start));
        return start === end ? startLabel : `${startLabel}–${formatter.format(parseDateKey(end))}`;
      }),
      boundaries,
      values,
      max,
      ticks,
      hasActivity: values.some((value) => value > 0),
    };
  }, [currentRange.end, currentRange.start, inRangeLeads, rangeValid]);

  const sourceStats = useMemo(() => {
    const counts = inRangeLeads.reduce((result, record) => {
      const source = getLeadSource(record);
      result[source] = (result[source] || 0) + 1;
      return result;
    }, {});
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        count,
        percentage: inRangeLeads.length ? Math.round((count / inRangeLeads.length) * 100) : 0,
      }));
  }, [inRangeLeads]);

  const search = searchTerm.trim().toLocaleLowerCase();
  const matchingLeads = useMemo(() => inRangeLeads.filter((record) => (
    !search || [record.name, record.company, record.email, record.phone, record.status]
      .some((value) => String(value || "").toLocaleLowerCase().includes(search))
  )), [inRangeLeads, search]);
  const recentLeads = useMemo(() => [...matchingLeads].sort(
    (a, b) => (new Date(b.createdAt || 0).getTime() || 0) - (new Date(a.createdAt || 0).getTime() || 0),
  ).slice(0, 5), [matchingLeads]);
  const now = new Date();
  const nowTaskTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const pendingFollowUps = useMemo(() => followUps
    .filter((item) => item.status === "Pending")
    .sort((a, b) => `${a.scheduledDate}T${a.scheduledTime}`.localeCompare(`${b.scheduledDate}T${b.scheduledTime}`)), [followUps]);
  const groupedTasks = useMemo(() => ({
    Overdue: pendingFollowUps.filter((item) => item.scheduledDate < todayKey || (item.scheduledDate === todayKey && item.scheduledTime < nowTaskTime)),
    Today: pendingFollowUps.filter((item) => item.scheduledDate === todayKey && item.scheduledTime >= nowTaskTime),
    Upcoming: pendingFollowUps.filter((item) => item.scheduledDate > todayKey),
  }), [nowTaskTime, pendingFollowUps, todayKey]);
  const userName = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null")?.username?.split(" ")[0] || "";
    } catch {
      return "";
    }
  })();
  const greeting = greetingTime.getHours() < 12
    ? "Good morning"
    : greetingTime.getHours() < 17
      ? "Good afternoon"
      : "Good evening";

  const handleExportCSV = () => {
    if (!matchingLeads.length) {
      setNotice("There are no matching leads to export.");
      return;
    }
    const headers = ["Name", "Company", "Email", "Phone", "Status", "Created", "Notes"];
    const rows = matchingLeads.map((record) => [
      record.name,
      record.company,
      record.email,
      record.phone,
      record.status,
      record.createdAt,
      record.notes,
    ]);
    let url = "";
    try {
      const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
      url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `leads-${currentRange.start}-to-${currentRange.end}.csv`;
      link.click();
      const downloadUrl = url;
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      url = "";
      setNotice(`Exported ${matchingLeads.length} lead${matchingLeads.length === 1 ? "" : "s"} for ${rangeLabel}${search ? " matching your search" : ""}.`);
    } catch (error) {
      console.error("Unable to export dashboard leads", error);
      setLeadError("Unable to export leads. Please retry.");
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  };

  const openImport = () => navigate("/leads", { state: { openImport: true } });
  const clearFilters = () => {
    setSearchTerm("");
    setRangePreset("30days");
    setCustomRange(getRangeForPreset(30));
  };

  return (
    <div className={`crm-shell crm-dashboard-shell ${sidebarOpen ? "crm-sidebar-expanded" : "crm-sidebar-collapsed"}`}>
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => {
          if (window.innerWidth <= 760) setSidebarOpen(false);
        }}
        onToggle={() => setSidebarOpen((open) => !open)}
      />
      <main className="crm-main">
        <DashboardTopbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search leads in this period…"
          onNotificationsClick={() => navigate("/follow-ups")}
          authRequired={location.state?.authRequired}
          authNotice={location.state?.sessionExpired ? "Your session expired. Sign in again to continue where you left off." : ""}
          returnTo={location.state?.returnTo || ""}
          onAuthenticated={(authData) => {
            setAccessToken(authData.accessToken);
            if (authData.accessToken && authData.greetingExpiresAt) {
              setLoading(true);
              setLeadError("");
              setTaskError("");
              setNotice("");
              setGreetingTime(new Date(authData.greetingExpiresAt - 2 * 60 * 1000));
              setGreetingExpiresAt(authData.greetingExpiresAt);
            } else {
              setGreetingExpiresAt(0);
              setLeads([]);
              setFollowUps([]);
              setLoading(false);
              setLeadError("");
              setTaskError("");
            }
          }}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          sidebarOpen={sidebarOpen}
        />
        <div className="crm-page crm-dashboard-page">
          <header className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <span className="crm-dashboard-eyebrow">Workspace overview</span>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Dashboard</h1>
              <p className="mt-1 text-sm text-slate-600">{greetingExpiresAt > 0 && userName ? `${greeting}, ${userName}. ` : ""}Your CRM at a glance.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {accessToken && (
                <>
                  <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" onClick={openImport}>
                    <MdFileUpload size={17} /> Import leads
                  </button>
                  <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" onClick={() => navigate("/leads/new")}>
                    <MdAdd size={18} /> Add lead
                  </button>
                </>
              )}
            </div>
          </header>

          {!accessToken ? (
            <section className="rounded-2xl border border-blue-100 bg-white px-5 py-10 text-center shadow-sm" aria-labelledby="dashboard-signin-title">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-700"><MdGroups size={23} /></span>
              <h2 id="dashboard-signin-title" className="mt-4 text-lg font-bold text-slate-900">Sign in to view your workspace</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">Your lead totals, pipeline, follow-ups, and reports are private and available after you sign in.</p>
              <span className="mt-3 block text-xs font-medium text-slate-600">Use the Login button above to continue.</span>
            </section>
          ) : (
            <>
              {(leadError || taskError || notice) && (
                <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${leadError || taskError ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`} role={leadError || taskError ? "alert" : "status"}>
                  <span>{leadError || taskError || notice}</span>
                  {(leadError || taskError) && (
                    <button type="button" className="inline-flex items-center gap-1 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" onClick={handleRetry} disabled={loading || refreshing}>
                      <MdRefresh size={16} /> {refreshing ? "Retrying…" : "Retry"}
                    </button>
                  )}
                  {notice && <button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}>Dismiss</button>}
                </div>
              )}

              {loading && !leads.length ? (
                <div className="space-y-4" aria-label="Loading dashboard data" aria-busy="true">
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />)}</div>
                  <div className="grid gap-4 lg:grid-cols-[1.55fr_.85fr]"><div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" /><div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" /></div>
                  <div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white" />
                </div>
              ) : leadError && !leads.length ? (
                <section className="rounded-2xl border border-rose-200 bg-white px-5 py-8 text-center shadow-sm" aria-labelledby="dashboard-data-error">
                  <h2 id="dashboard-data-error" className="text-lg font-bold text-slate-900">Dashboard data is unavailable</h2>
                  <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">{leadError}</p>
                  <button type="button" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50" onClick={handleRetry} disabled={refreshing}>
                    <MdRefresh size={17} /> {refreshing ? "Retrying…" : "Retry"}
                  </button>
                </section>
              ) : (
                <>
                  <section className="crm-dashboard-overview" aria-labelledby="dashboard-summary-title">
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 id="dashboard-summary-title" className="text-sm font-bold text-slate-900">Lead summary</h2>
                        <p className="mt-1 text-xs text-slate-600">{rangeValid ? `Leads created during ${rangeLabel}` : "Choose a valid date range."}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {refreshing && <span className="text-xs font-medium text-slate-600" role="status"><MdRefresh className="mr-1 inline animate-spin" />Refreshing…</span>}
                        <label htmlFor="dashboard-range-preset" className="text-xs font-semibold text-slate-700">Date range</label>
                        <select
                          id="dashboard-range-preset"
                          value={rangePreset}
                          onChange={(event) => {
                            const nextPreset = event.target.value;
                            setRangePreset(nextPreset);
                            if (nextPreset !== "custom") {
                              const days = RANGE_PRESETS.find((item) => item.value === nextPreset)?.days;
                              if (days) setCustomRange(getRangeForPreset(days));
                            }
                          }}
                          className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        >
                          {RANGE_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
                          <option value="custom">Custom range</option>
                        </select>
                        {rangePreset === "custom" && (
                          <div className="flex flex-wrap items-center gap-2">
                          <label>
                            <span className="sr-only">Start date</span>
                            <input type="date" aria-label="Start date" value={customRange.start} max={customRange.end || undefined} onChange={(event) => setCustomRange((range) => ({ ...range, start: event.target.value }))} className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" />
                          </label>
                          <span className="text-xs text-slate-600" aria-hidden="true">to</span>
                          <label>
                            <span className="sr-only">End date</span>
                            <input type="date" aria-label="End date" value={customRange.end} min={customRange.start || undefined} max={toDateKey(new Date())} onChange={(event) => setCustomRange((range) => ({ ...range, end: event.target.value }))} className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" />
                          </label>
                          </div>
                        )}
                      </div>
                    </div>
                    {rangePreset === "custom" && <p className="mb-3 text-xs text-slate-600">Dates use your local time zone ({Intl.DateTimeFormat().resolvedOptions().timeZone || "local time"}).</p>}
                    {!rangeValid && <p className="mb-3 text-xs font-medium text-rose-700" role="alert">Choose a valid date range ending today or earlier.</p>}

                    <div className="crm-metrics-grid">
                      <article className="crm-dashboard-metric crm-metric-blue">
                        <span className="crm-dashboard-metric-icon"><MdGroups size={21} /></span>
                        <p>Total leads</p><strong>{rangeValid ? leadMetrics.total : "—"}</strong>
                        <span className="crm-dashboard-metric-detail !text-slate-600">{!rangeValid ? "Choose valid dates" : leadMetrics.total ? `Created ${rangeLabel.toLowerCase()}` : "No data yet"}</span>
                      </article>
                      <article className="crm-dashboard-metric crm-metric-violet">
                        <span className="crm-dashboard-metric-icon"><MdCheckCircle size={21} /></span>
                        <p>Won</p><strong>{rangeValid ? leadMetrics.won : "—"}</strong>
                        <span className="crm-dashboard-metric-detail !text-slate-600">{!rangeValid ? "Choose valid dates" : leadMetrics.total ? "Current status in this period" : "No data yet"}</span>
                      </article>
                      <article className="crm-dashboard-metric crm-metric-sky">
                        <span className="crm-dashboard-metric-icon"><MdBolt size={21} /></span>
                        <p>Active</p><strong>{rangeValid ? leadMetrics.active : "—"}</strong>
                        <span className="crm-dashboard-metric-detail !text-slate-600">{!rangeValid ? "Choose valid dates" : leadMetrics.total ? "Not marked Won or Lost" : "No data yet"}</span>
                      </article>
                      <article className="crm-dashboard-metric crm-metric-rose">
                        <span className="crm-dashboard-metric-icon"><MdTrendingDown size={21} /></span>
                        <p>Lost</p><strong>{rangeValid ? leadMetrics.lost : "—"}</strong>
                        <span className="crm-dashboard-metric-detail !text-slate-600">{!rangeValid ? "Choose valid dates" : leadMetrics.total ? "Current status in this period" : "No data yet"}</span>
                      </article>
                    </div>
                  </section>

                  <div className="crm-dashboard-grid crm-dashboard-grid-primary">
                    <section className="crm-dashboard-card" aria-labelledby="dashboard-trend-title">
                      <div className="crm-dashboard-card-heading">
                        <div><h2 id="dashboard-trend-title">Lead creation trend</h2><p>Leads created during {rangeLabel}</p></div>
                      </div>
                      {chartData.hasActivity ? (
                        <>
                          <div className="crm-chart-legend"><span><i className="crm-legend-blue" />Leads created</span></div>
                          <div className="crm-line-chart crm-dashboard-line-chart">
                            <div className="crm-chart-y-labels" aria-hidden="true">{chartData.ticks.map((tick) => <span key={tick.y}>{tick.value}</span>)}</div>
                            <svg viewBox="0 0 720 190" role="img" aria-label={`Lead creation trend for ${rangeLabel}`}>
                              {chartData.ticks.map((tick) => <line key={tick.y} x1={CHART_BOUNDS.left} y1={tick.y} x2={CHART_BOUNDS.right} y2={tick.y} className="crm-chart-gridline" />)}
                              <path d={`${getTrendPath(chartData.values, chartData.max)} L ${CHART_BOUNDS.right} ${CHART_BOUNDS.bottom} L ${CHART_BOUNDS.left} ${CHART_BOUNDS.bottom} Z`} className="crm-chart-area-blue" />
                              <path d={getTrendPath(chartData.values, chartData.max)} className="crm-chart-line-blue" />
                              {chartData.values.map((value, index) => (
                                <circle key={chartData.boundaries[index].start} cx={getChartX(index, chartData.values.length)} cy={getChartY(value, chartData.max)} r="4" className="fill-blue-600 stroke-white stroke-2">
                                  <title>{`${chartData.labels[index]}: ${value} lead${value === 1 ? "" : "s"} created`}</title>
                                </circle>
                              ))}
                            </svg>
                          </div>
                          <div className="crm-chart-x-labels" style={{ gridTemplateColumns: `repeat(${chartData.labels.length}, minmax(0, 1fr))` }}>
                            {chartData.labels.map((label, index) => <span key={chartData.boundaries[index].start}>{label}</span>)}
                          </div>
                        </>
                      ) : (
                        <div className="flex min-h-20 items-center gap-3 px-5 py-5 text-sm text-slate-600">
                          <MdTrendingDown size={19} />
                          <span>{!rangeValid ? "Choose a valid date range to view lead activity." : rangeValid && leads.length ? "No leads were created in this period." : "No lead creation data for this period yet."}</span>
                        </div>
                      )}
                    </section>

                    <section className="crm-dashboard-card" aria-labelledby="dashboard-sources-title">
                      <div className="crm-dashboard-card-heading">
                        <div><h2 id="dashboard-sources-title">Lead sources</h2><p>Source values recorded in this period</p></div>
                      </div>
                      {sourceStats.length ? (
                        <div className="crm-source-list">
                          {sourceStats.map((source, index) => (
                            <div className="crm-source-item" key={source.name}>
                              <span className={`crm-source-icon crm-source-${["blue", "violet", "green", "pink", "slate"][index]}`}><MdPersonAddAlt1 size={17} /></span>
                              <div className="crm-source-content">
                                <div className="crm-source-label"><strong title={source.name}>{source.name}</strong><span>{source.count} · {source.percentage}%</span></div>
                                <div className="crm-source-track"><span className={`crm-source-fill crm-source-fill-${["blue", "violet", "green", "pink", "slate"][index]}`} style={{ width: `${source.percentage}%` }} /></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex min-h-20 items-center gap-3 px-5 py-5 text-sm text-slate-600">
                          <MdPersonAddAlt1 size={19} />
                          <span>{rangeValid ? "No source values recorded in this period." : "Choose a valid date range to view lead sources."}</span>
                        </div>
                      )}
                    </section>
                  </div>

                  <div className="crm-dashboard-grid crm-dashboard-grid-secondary">
                    <section className="crm-dashboard-card" aria-labelledby="dashboard-pipeline-title">
                      <div className="crm-dashboard-card-heading">
                        <div><h2 id="dashboard-pipeline-title">Current lead pipeline</h2><p>Current status across all {pipelineTotal} workspace leads</p></div>
                        <button className="crm-text-link" type="button" onClick={() => navigate("/leads")}>View leads <MdArrowForward /></button>
                      </div>
                      {pipelineTotal ? (
                        <div className="space-y-3 px-5 pb-5">
                          {pipelineCounts.map((stage, index) => (
                            <div className="grid grid-cols-[minmax(75px,auto)_minmax(40px,1fr)_2rem] items-center gap-3 text-xs" key={stage.name}>
                              <span className="font-semibold text-slate-700">{stage.name}</span>
                              <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${stage.name} leads`} aria-valuemin="0" aria-valuemax={pipelineTotal} aria-valuenow={stage.count}>
                                <span className={`block h-full rounded-full ${["bg-blue-600", "bg-sky-600", "bg-cyan-600", "bg-indigo-600", "bg-amber-500", "bg-emerald-600", "bg-rose-600"][index]}`} style={{ width: `${(stage.count / pipelineTotal) * 100}%` }} />
                              </div>
                              <strong className="text-right text-slate-900">{stage.count}</strong>
                            </div>
                          ))}
                          {pipelineUnclassified > 0 && (
                            <div className="grid grid-cols-[minmax(75px,auto)_minmax(40px,1fr)_2rem] items-center gap-3 text-xs">
                              <span className="font-semibold text-slate-700">Unclassified</span>
                              <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Unclassified leads" aria-valuemin="0" aria-valuemax={pipelineTotal} aria-valuenow={pipelineUnclassified}>
                                <span className="block h-full rounded-full bg-slate-500" style={{ width: `${(pipelineUnclassified / pipelineTotal) * 100}%` }} />
                              </div>
                              <strong className="text-right text-slate-900">{pipelineUnclassified}</strong>
                            </div>
                          )}
                        </div>
                      ) : <div className="flex min-h-20 items-center gap-3 px-5 py-5 text-sm text-slate-600"><MdGroups size={19} /><span>No leads yet. Add your first lead to build your pipeline.</span></div>}
                    </section>

                    <section className="crm-dashboard-card" aria-labelledby="dashboard-tasks-title">
                      <div className="crm-dashboard-card-heading">
                        <div><h2 id="dashboard-tasks-title">Upcoming follow-ups</h2><p>Pending follow-ups · times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone || "your local time zone"}</p></div>
                        <button className="crm-text-link" type="button" onClick={() => navigate("/follow-ups")}>View all <MdArrowForward /></button>
                      </div>
                      {taskError ? (
                        <div className="px-5 py-4 text-sm text-slate-600" role="status">
                          <p className="mb-2">Follow-ups are unavailable. Lead data is still shown above.</p>
                          <button type="button" onClick={handleRetry} disabled={refreshing}>{refreshing ? "Retrying…" : "Retry"}</button>
                        </div>
                      ) : pendingFollowUps.length ? (
                        <div className="px-4 pb-3">
                          {Object.entries(groupedTasks).map(([groupName, tasks]) => tasks.length > 0 && (
                            <section className="border-b border-slate-100 py-2 last:border-0" key={groupName} aria-label={`${groupName} follow-ups`}>
                              <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-600">{groupName} <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px]">{tasks.length}</span></h3>
                              {tasks.slice(0, 3).map((item) => (
                                <article className="flex items-center gap-2 border-t border-slate-100 py-2" key={item._id}>
                                  <button
                                    type="button"
                                    aria-label={`Complete ${item.type} follow-up${item.leadId?.name ? ` for ${item.leadId.name}` : ""}`}
                                    title="Mark complete"
                                    disabled={completingIds.includes(item._id)}
                                    onClick={() => handleCompleteFollowUp(item)}
                                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-wait disabled:opacity-50"
                                  >
                                    {completingIds.includes(item._id) ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" /> : <MdCheck size={16} />}
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <Link className="block truncate text-xs font-semibold text-slate-800 hover:text-blue-700" to={item.leadId?._id ? `/lead/${item.leadId._id}` : "/leads"} title={item.leadId?.name || "Open leads"}>{item.leadId?.name || "Lead unavailable"}</Link>
                                    <span className="block truncate text-[11px] text-slate-600">{item.type}{item.leadId?.company ? ` · ${item.leadId.company}` : ""}</span>
                                  </div>
                                  <time className="flex shrink-0 flex-col text-right text-[11px] font-medium text-slate-600" dateTime={`${item.scheduledDate}T${item.scheduledTime}`}>
                                    <span>{formatDate(item.scheduledDate, { day: "numeric", month: "short" })}</span>
                                    <span>{item.scheduledTime}</span>
                                  </time>
                                </article>
                              ))}
                              {tasks.length > 3 && <button type="button" className="mt-1 text-xs font-semibold text-blue-700 hover:text-blue-900" onClick={() => navigate("/follow-ups")}>View {tasks.length - 3} more {groupName.toLowerCase()}</button>}
                            </section>
                          ))}
                        </div>
                      ) : (
                        <div className="flex min-h-20 items-center gap-3 px-5 py-5 text-sm text-slate-600"><MdCheckCircle size={19} /><span>No pending follow-ups scheduled.</span></div>
                      )}
                    </section>
                  </div>

                  <section className="crm-dashboard-card crm-dashboard-recent-card" aria-labelledby="dashboard-recent-title">
                    <div className="crm-dashboard-card-heading">
                      <div><h2 id="dashboard-recent-title">Recent leads</h2><p>{matchingLeads.length} matching leads · created during {rangeLabel}{search ? " · filtered by search" : ""}</p></div>
                      <div className="flex flex-wrap items-center gap-3">
                        <button type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50" onClick={handleExportCSV} disabled={!rangeValid || !matchingLeads.length}>
                          <MdDownload size={16} /> Export CSV
                        </button>
                        <button className="crm-text-link" type="button" onClick={() => navigate("/leads")}>View all <MdArrowForward /></button>
                      </div>
                    </div>
                    {leadError ? (
                      <div className="px-5 py-4 text-sm text-slate-600" role="status"><span>Lead list unavailable until the API connection is restored.</span></div>
                    ) : rangeValid && recentLeads.length ? (
                      <div className="w-full overflow-x-auto" role="region" aria-label="Recent leads table" tabIndex="0">
                        <table className="w-full min-w-[790px] table-fixed border-collapse text-left text-xs">
                          <colgroup><col className="w-[18%]" /><col className="w-[18%]" /><col className="w-[22%]" /><col className="w-[13%]" /><col className="w-[17%]" /><col className="w-[12%]" /></colgroup>
                          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600"><tr className="border-y border-slate-200"><th scope="col" className="px-4 py-3">Name</th><th scope="col" className="px-3 py-3">Company</th><th scope="col" className="px-3 py-3">Contact</th><th scope="col" className="px-3 py-3">Status</th><th scope="col" className="px-3 py-3">Created</th><th scope="col" className="px-3 py-3">Actions</th></tr></thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {recentLeads.map((record) => (
                              <tr key={record._id} className="hover:bg-slate-50">
                                <td className="max-w-0 px-4 py-3">{record._id ? <Link className="block truncate font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" to={`/lead/${record._id}`} title={record.name || "Unnamed lead"}>{record.name || "Unnamed lead"}</Link> : <span className="block truncate" title={record.name || "Unnamed lead"}>{record.name || "Unnamed lead"}</span>}</td>
                                <td className="max-w-0 px-3 py-3"><span className="block truncate" title={record.company || "No company"}>{record.company || "—"}</span></td>
                                <td className="max-w-0 px-3 py-3">
                                  <span className="block truncate" title={record.email || "No email"}>{record.email || "—"}</span>
                                  <span className="mt-0.5 block truncate text-[11px] text-slate-600" title={record.phone || "No phone"}>{record.phone || "—"}</span>
                                </td>
                                <td className="px-3 py-3"><span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />{record.status || "New"}</span></td>
                                <td className="px-3 py-3 text-[11px] text-slate-700"><time dateTime={record.createdAt}>{formatTimestamp(record.createdAt)}</time></td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-1">
                                      <button type="button" className="rounded-md px-2 py-1.5 font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => navigate(`/lead/${record._id}`)} aria-label={`Edit ${record.name || "lead"}`} title={record._id ? "Edit lead" : "Lead ID is unavailable"} disabled={!record._id}>Edit</button>
                                      <button type="button" className="rounded-md px-2 py-1.5 font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => handleDeleteLead(record._id)} aria-label={`Delete ${record.name || "lead"}`} title={record._id ? "Delete lead" : "Lead ID is unavailable"} disabled={!record._id}>Delete</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center">
                        <p className="text-sm font-medium text-slate-700">{!rangeValid ? "Choose a valid date range to view leads." : search ? "No matching results for this search." : leads.length ? "No leads were created in this date range." : "No leads yet."}</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {(search || rangePreset !== "30days" || (leads.length > 0 && !recentLeads.length)) && <button type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" onClick={clearFilters}><MdRefresh size={16} /> Clear filters</button>}
                          {rangeValid && !search && !leads.length && (
                            <>
                              <button type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" onClick={() => navigate("/leads/new")}><MdAdd size={17} /> Add your first lead</button>
                              <button type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" onClick={openImport}><MdFileUpload size={17} /> Import leads</button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </section>

                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
