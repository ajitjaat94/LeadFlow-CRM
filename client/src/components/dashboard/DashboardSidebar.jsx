import { NavLink, useLocation } from "react-router-dom";
import {
  MdAutoAwesome,
  MdCalendarToday,
  MdClose,
  MdContacts,
  MdDashboard,
  MdDescription,
  MdGroup,
  MdPeople,
  MdSettings,
  MdShowChart,
} from "react-icons/md";

const primaryLinks = [
  { label: "Dashboard", href: "/dashboard", icon: MdDashboard },
  { label: "Leads", href: "/leads", icon: MdPeople },
  { label: "Contacts", href: "/contacts", icon: MdContacts },
  { label: "Deals", href: "/deals", icon: MdShowChart },
  { label: "Follow-ups", href: "/follow-ups", icon: MdDescription },
  { label: "Calendar", href: "/calendar", icon: MdCalendarToday },
  { label: "Reports", href: "/reports", icon: MdShowChart },
  { label: "Team", href: "/team", icon: MdGroup },
  { label: "Settings", href: "/settings", icon: MdSettings },
];

const SidebarLink = ({ label, href, icon: Icon, onClick, isRootDashboard }) => (
  <NavLink
    to={href}
    onClick={onClick}
    className={({ isActive }) =>
      `crm-sidebar-link ${
        isActive || (label === "Dashboard" && href === "/dashboard" && isRootDashboard)
          ? "crm-sidebar-link-active"
          : ""
      }`
    }
  >
    <Icon size={18} />
    <span>{label}</span>
  </NavLink>
);

const DashboardSidebar = ({ isOpen = false, onClose, onToggle }) => {
  const { pathname } = useLocation();
  return (
    <>
      {isOpen && <button className="crm-sidebar-backdrop" type="button" aria-label="Close navigation" onClick={onClose} />}
      <aside className={`crm-sidebar ${isOpen ? "crm-sidebar-open" : ""}`}>
      <div className="crm-sidebar-header">
        <div className="crm-brand">
          <span className="crm-brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>
            Lead<span className="crm-brand-accent">flow</span>
            <small>CRM</small>
          </span>
        </div>
        {isOpen && (
          <button
            className="crm-sidebar-toggle"
            type="button"
            aria-label="Close sidebar"
            onClick={onToggle}
          >
            <MdClose size={20} />
          </button>
        )}
      </div>
      <nav className="crm-sidebar-nav" aria-label="Primary navigation">
        {primaryLinks.map((link) => (
          <SidebarLink
            key={link.label}
            {...link}
            onClick={onClose}
            isRootDashboard={pathname === "/"}
          />
        ))}
      </nav>
      <div className="mt-auto">
        <div className="crm-upgrade-card">
          <span className="crm-upgrade-icon"><MdAutoAwesome size={19} /></span>
          <strong>Upgrade to Pro</strong>
          <p>Get more leads, advanced reports and automation.</p>
          <span className="crm-upgrade-coming-soon" role="status">Coming soon</span>
        </div>
      </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;
