import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdRefresh, MdSave } from "react-icons/md";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";
import { getSettings, updateProfileSettings, updateWorkspaceSettings } from "../services/api";

const commonTimeZones = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Paris",
  "America/Los_Angeles",
  "America/Chicago",
  "America/New_York",
];

const getTimeZones = () => {
  const supported = Intl.supportedValuesOf?.("timeZone");
  return [...new Set(["UTC", "Asia/Kolkata", ...(supported || commonTimeZones)])].sort((a, b) => a.localeCompare(b));
};

const Settings = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);
  const [settings, setSettings] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [timeZone, setTimeZone] = useState("Asia/Kolkata");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState("");
  const [workspaceFeedback, setWorkspaceFeedback] = useState("");
  const [profileError, setProfileError] = useState("");
  const [workspaceError, setWorkspaceError] = useState("");
  const [retry, setRetry] = useState(0);
  const timeZones = useMemo(() => getTimeZones(), []);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((data) => {
        if (!active) return;
        setSettings(data);
        setProfileName(data.profile.username || "");
        setWorkspaceName(data.workspace.name || "");
        setTimeZone(data.workspace.timeZone || "Asia/Kolkata");
        setLoadError("");
      })
      .catch((requestError) => {
        if (active) setLoadError(requestError.response?.data?.message || "Unable to load settings. Check your connection and retry.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  const loadSettings = () => {
    setLoading(true);
    setLoadError("");
    setRetry((count) => count + 1);
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setProfileBusy(true);
    setProfileError("");
    setProfileFeedback("");
    try {
      const profile = await updateProfileSettings({ username: profileName });
      setProfileName(profile.username);
      setSettings((current) => ({ ...current, profile: { ...current.profile, ...profile } }));
      try {
        const savedUser = JSON.parse(localStorage.getItem("user") || "null");
        if (savedUser) localStorage.setItem("user", JSON.stringify({ ...savedUser, ...profile }));
      } catch {
        localStorage.setItem("user", JSON.stringify(profile));
      }
      window.dispatchEvent(new CustomEvent("leadflow:profile-updated", { detail: profile }));
      setProfileFeedback("Profile saved.");
    } catch (requestError) {
      setProfileError(requestError.response?.data?.message || "Unable to save profile changes.");
    } finally {
      setProfileBusy(false);
    }
  };

  const handleWorkspaceSave = async (event) => {
    event.preventDefault();
    setWorkspaceBusy(true);
    setWorkspaceError("");
    setWorkspaceFeedback("");
    try {
      const workspace = await updateWorkspaceSettings({ name: workspaceName, timeZone });
      setWorkspaceName(workspace.name);
      setTimeZone(workspace.timeZone);
      setSettings((current) => ({ ...current, workspace: { ...current.workspace, ...workspace } }));
      setWorkspaceFeedback("Workspace settings saved.");
    } catch (requestError) {
      setWorkspaceError(requestError.response?.data?.message || "Unable to save workspace settings.");
    } finally {
      setWorkspaceBusy(false);
    }
  };

  const canManageWorkspace = ["owner", "admin"].includes(settings?.workspace?.role);
  const inputClass = "mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500";

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
          <div className="crm-page-heading">
            <div><span className="crm-eyebrow">Workspace</span><h1>Settings</h1><p>Manage your profile and workspace preferences.</p></div>
            <button type="button" onClick={loadSettings} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><MdRefresh className={loading ? "animate-spin" : ""} />Refresh</button>
          </div>

          {loadError ? (
            <section className="crm-panel p-6 text-center" role="alert">
              <p className="text-sm text-rose-700">{loadError}</p>
              <button type="button" onClick={loadSettings} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"><MdRefresh />Retry</button>
            </section>
          ) : loading ? (
            <p className="crm-panel p-8 text-center text-sm text-slate-600" role="status">Loading settings...</p>
          ) : settings && (
            <>
              <section className="crm-panel p-5 sm:p-6">
                <div className="mb-5"><h2 className="text-base font-bold text-slate-900">Profile</h2><p className="mt-1 text-sm text-slate-600">Update the name shown to your team. Changing the account email is not available.</p></div>
                <form onSubmit={handleProfileSave} className="max-w-2xl space-y-4">
                  <label className="block text-sm font-semibold text-slate-700">Name
                    <input className={inputClass} value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength={80} required disabled={profileBusy} autoComplete="name" />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">Email
                    <input className={inputClass} value={settings.profile.email} readOnly aria-readonly="true" />
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="submit" disabled={profileBusy || !profileName.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"><MdSave />{profileBusy ? "Saving..." : "Save profile"}</button>
                    {profileFeedback && <span className="text-sm text-emerald-700" role="status">{profileFeedback}</span>}
                    {profileError && <span className="text-sm text-rose-700" role="alert">{profileError}</span>}
                  </div>
                </form>
              </section>

              <section className="crm-panel p-5 sm:p-6">
                <div className="mb-5"><h2 className="text-base font-bold text-slate-900">Workspace</h2><p className="mt-1 text-sm text-slate-600">Workspace name and timezone are shared across workspace members.</p></div>
                <form onSubmit={handleWorkspaceSave} className="max-w-2xl space-y-4">
                  <label className="block text-sm font-semibold text-slate-700">Workspace name
                    <input className={inputClass} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} maxLength={120} required disabled={workspaceBusy || !canManageWorkspace} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">Timezone
                    <select className={inputClass} value={timeZone} onChange={(event) => setTimeZone(event.target.value)} disabled={workspaceBusy || !canManageWorkspace}>
                      {!timeZones.includes(timeZone) && <option value={timeZone}>{timeZone}</option>}
                      {timeZones.map((zone) => <option key={zone} value={zone}>{zone.replace(/_/g, " ")}</option>)}
                    </select>
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    {canManageWorkspace ? (
                      <button type="submit" disabled={workspaceBusy || !workspaceName.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"><MdSave />{workspaceBusy ? "Saving..." : "Save workspace"}</button>
                    ) : <p className="text-sm text-slate-600">Only workspace owners and admins can change shared settings.</p>}
                    {workspaceFeedback && <span className="text-sm text-emerald-700" role="status">{workspaceFeedback}</span>}
                    {workspaceError && <span className="text-sm text-rose-700" role="alert">{workspaceError}</span>}
                  </div>
                </form>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Settings;
