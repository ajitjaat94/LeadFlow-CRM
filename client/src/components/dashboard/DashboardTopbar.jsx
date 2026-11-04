import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MdAdd,
  MdKeyboardArrowDown,
  MdMenu,
  MdNotificationsNone,
  MdSearch,
} from "react-icons/md";
import AuthModal from "../AuthModal";
import { getFollowUps, getSettings } from "../../services/api";
import { formatFollowUpDate, getBrowserTimeZone, isFollowUpOverdue } from "../../utils/followUpTime";

const getInternalReturnPath = (value) => {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return "/dashboard";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/dashboard";
  }
};

const DashboardTopbar = ({
  searchTerm,
  onSearchChange,
  onAddLead,
  addButtonLabel = "Add lead",
  authRequired = false,
  authNotice = "",
  returnTo = "",
  onAuthenticated,
  onToggleSidebar,
  onNotificationsClick,
  searchPlaceholder = "Search leads, contacts, deals...",
  sidebarOpen = false,
  hideSearch = false,
}) => {
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(authRequired);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [notificationsWarning, setNotificationsWarning] = useState("");
  const [notificationTimeZone, setNotificationTimeZone] = useState(getBrowserTimeZone);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const searchInputRef = useRef(null);
  const notificationsButtonRef = useRef(null);
  const notificationsPanelRef = useRef(null);

  useEffect(() => {
    if (hideSearch) return undefined;
    const focusSearch = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, [hideSearch]);

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setAuthModalOpen(true);
      setNotificationsOpen(false);
    };
    window.addEventListener("leadflow:session-expired", handleSessionExpired);
    return () => window.removeEventListener("leadflow:session-expired", handleSessionExpired);
  }, []);

  useEffect(() => {
    const handleProfileUpdated = (event) => {
      if (!event.detail) return;
      setUser((current) => ({ ...current, ...event.detail }));
    };
    window.addEventListener("leadflow:profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("leadflow:profile-updated", handleProfileUpdated);
  }, []);

  useEffect(() => {
    if (!notificationsOpen || !user) return undefined;
    let active = true;
    Promise.allSettled([getFollowUps(), getSettings()])
      .then(([followUpsResult, settingsResult]) => {
        if (!active) return;
        if (followUpsResult.status === "rejected") {
          setNotificationsError(followUpsResult.reason.response?.data?.message || "Unable to load notifications. Try again.");
          return;
        }
        const zone = settingsResult.status === "fulfilled"
          ? settingsResult.value.workspace.timeZone || "Asia/Kolkata"
          : getBrowserTimeZone();
        setNotificationTimeZone(zone);
        setNotificationsWarning(settingsResult.status === "rejected"
          ? `Workspace timezone is unavailable; showing times in your browser timezone (${zone}).`
          : "");
        setNotifications(followUpsResult.value
          .filter((item) => item.status === "Pending")
          .sort((first, second) => `${first.scheduledDate}T${first.scheduledTime}`.localeCompare(`${second.scheduledDate}T${second.scheduledTime}`))
          .slice(0, 6));
      })
      .finally(() => { if (active) setNotificationsLoading(false); });
    return () => { active = false; };
  }, [notificationsOpen, user]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!notificationsButtonRef.current?.contains(event.target) && !notificationsPanelRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [notificationsOpen]);

  const handleAuthSuccess = (authData) => {
    const greetingExpiresAt = Date.now() + 2 * 60 * 1000;
    localStorage.setItem("accessToken", authData.accessToken);
    localStorage.setItem("refreshToken", authData.refreshToken);
    localStorage.setItem("user", JSON.stringify(authData.user));
    setUser(authData.user);
    onAuthenticated?.({ ...authData, greetingExpiresAt });
    setAuthModalOpen(false);
    navigate(getInternalReturnPath(returnTo), { replace: true, state: { greetingExpiresAt } });
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
    setProfileOpen(false);
    setNotificationsOpen(false);
    onAuthenticated?.({ accessToken: null });
    navigate("/", { replace: true });
  };

  const handleNotificationsClick = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (onNotificationsClick) {
      onNotificationsClick();
      return;
    }
    if (!notificationsOpen) {
      setNotificationsLoading(true);
      setNotificationsError("");
      setNotificationsWarning("");
    }
    setNotificationsOpen((open) => !open);
  };

  return (
    <>
      <header className="crm-topbar">
        {!sidebarOpen && (
        <button
          className="crm-menu-button"
          type="button"
          aria-label="Open sidebar"
          aria-expanded={sidebarOpen}
          onClick={onToggleSidebar}
        >
          <MdMenu size={22} />
        </button>
        )}
        {!hideSearch && (
          <div className="crm-search-wrap">
            <MdSearch size={20} />
            <input
              ref={searchInputRef}
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder.replace("…", "").replace("...", "")}
            />
            <kbd>Ctrl K</kbd>
          </div>
        )}
        <div className="crm-topbar-actions">
          <div className="crm-notifications-wrap">
            <button ref={notificationsButtonRef} className="crm-icon-button" type="button" aria-label={user ? "Notifications" : "Sign in to view notifications"} aria-expanded={notificationsOpen} aria-haspopup="dialog" onClick={handleNotificationsClick}>
              <MdNotificationsNone size={22} />
            </button>
            {notificationsOpen && (
              <section className="crm-notifications-panel" ref={notificationsPanelRef} role="dialog" aria-label="Notifications">
              <div className="crm-notifications-heading">
                <div><h2>Notifications</h2><p>Pending follow-ups · {notificationTimeZone}</p></div>
                <button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications">×</button>
              </div>
              {notificationsLoading ? <p className="crm-notifications-state" role="status">Loading notifications...</p>
                : notificationsError ? <p className="crm-notifications-state crm-notifications-error" role="alert">{notificationsError}</p>
                  : notifications.length ? (
                    <>
                    {notificationsWarning && <p className="crm-notifications-state" role="status">{notificationsWarning}</p>}
                    <ul className="crm-notifications-list">
                      {notifications.map((item) => (
                        <li key={item._id}>
                          <Link to={item.leadId?._id ? `/lead/${item.leadId._id}` : "/follow-ups"} onClick={() => setNotificationsOpen(false)}>
                            <span className="crm-notification-title">{item.leadId?.name || "Follow-up"}</span>
                            <span className="crm-notification-detail">{item.type} · {formatFollowUpDate(item.scheduledDate, notificationTimeZone)} · {item.scheduledTime}</span>
                            {isFollowUpOverdue(item, notificationTimeZone) && <span className="crm-notification-overdue">Overdue</span>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    </>
                  ) : <><p className="crm-notifications-state">No pending follow-up notifications.</p>{notificationsWarning && <p className="crm-notifications-state" role="status">{notificationsWarning}</p>}</>}
              <Link className="crm-notifications-footer" to="/follow-ups" onClick={() => setNotificationsOpen(false)}>Open follow-ups</Link>
              </section>
            )}
          </div>
          {user ? (
            <div className="crm-profile-wrap">
              <button
                className="crm-topbar-user"
                type="button"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((open) => !open)}
              >
                <span className="crm-avatar">
                  {user.username?.slice(0, 2).toUpperCase() || "U"}
                </span>
                <span className="crm-topbar-user-copy">
                  <strong>{user.username || "Account"}</strong>
                  <small>Account: {user.role || "User"}</small>
                </span>
                <MdKeyboardArrowDown className="crm-user-chevron" size={19} />
              </button>
              {profileOpen && (
                <div className="crm-profile-menu">
                  <strong>{user.email || user.username}</strong>
                  <button type="button" onClick={handleLogout}>Log out</button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="crm-login-button"
              type="button"
              onClick={() => setAuthModalOpen(true)}
            >
              Login
            </button>
          )}
          {user && onAddLead && (
            <button
              className="inline-flex h-[38px] min-h-[38px] flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-3 text-xs font-bold leading-none text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
              type="button"
              onClick={onAddLead}
            >
              <MdAdd className="flex-none" size={19} />
              <span className="flex-none whitespace-nowrap">{addButtonLabel}</span>
            </button>
          )}
        </div>
      </header>
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        authNotice={authNotice}
      />
    </>
  );
};

export default DashboardTopbar;
