import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdAdd,
  MdKeyboardArrowDown,
  MdMenu,
  MdNotificationsNone,
  MdSearch,
} from "react-icons/md";
import AuthModal from "../AuthModal";

const DashboardTopbar = ({
  searchTerm,
  onSearchChange,
  onAddLead,
  addButtonLabel = "Add lead",
  authRequired = false,
  onAuthenticated,
  onToggleSidebar,
  sidebarOpen = false,
}) => {
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(authRequired);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const handleAuthSuccess = (authData) => {
    const greetingExpiresAt = Date.now() + 2 * 60 * 1000;
    localStorage.setItem("accessToken", authData.accessToken);
    localStorage.setItem("refreshToken", authData.refreshToken);
    localStorage.setItem("user", JSON.stringify(authData.user));
    setUser(authData.user);
    onAuthenticated?.({ ...authData, greetingExpiresAt });
    setAuthModalOpen(false);
    navigate("/dashboard", { replace: true, state: { greetingExpiresAt } });
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
    setProfileOpen(false);
    onAuthenticated?.({ accessToken: null });
    navigate("/", { replace: true });
  };

  return (
    <>
      <header className="crm-topbar">
        {!sidebarOpen && (
        <button
          className="crm-menu-button"
          type="button"
          aria-label="Open sidebar"
          aria-expanded={false}
          onClick={onToggleSidebar}
        >
          <MdMenu size={22} />
        </button>
        )}
        <div className="crm-search-wrap">
          <MdSearch size={20} />
          <input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search leads, contacts, deals..."
            aria-label="Search leads, contacts, and deals"
          />
          <kbd>Ctrl K</kbd>
        </div>
        <div className="crm-topbar-actions">
          <button className="crm-icon-button" type="button" aria-label="Notifications">
            <MdNotificationsNone size={22} />
          </button>
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
                  <small>{user.role || "Admin"}</small>
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
      />
    </>
  );
};

export default DashboardTopbar;
