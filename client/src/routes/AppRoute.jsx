import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import Leads from "../pages/Leads";
import LeadForm from "../pages/LeadForm";
import Contact from "../pages/Contact";
import About from "../pages/About";
import WorkspacePage from "../pages/WorkspacePage";
import ProtectedRoute from "../components/ProtectedRoute";
import FollowUps from "../pages/FollowUps";
import Contacts from "../pages/Contacts";
import Deals from "../pages/Deals";
import Calendar from "../pages/Calendar";
import Reports from "../pages/Reports";
import Team from "../pages/Team";
import JoinWorkspace from "../pages/JoinWorkspace";

const AppRoute = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const titles = {
      "/": "Dashboard",
      "/dashboard": "Dashboard",
      "/leads": "Leads",
      "/leads/new": "Add lead",
      "/follow-ups": "Follow-ups",
      "/contacts": "Contacts",
      "/deals": "Deals",
      "/calendar": "Calendar",
      "/reports": "Reports",
      "/team": "Team",
      "/settings": "Settings",
      "/companies": "Companies",
      "/tasks": "Tasks",
      "/automation": "Automation",
      "/about": "About",
      "/contact": "Contact",
    };
    const title = pathname.startsWith("/lead/")
      ? "Edit lead"
      : pathname.startsWith("/join/")
        ? "Join workspace"
        : titles[pathname] || "Workspace";
    document.title = `LeadFlow CRM | ${title}`;
  }, [pathname]);

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
      <Route path="/leads/new" element={<ProtectedRoute><LeadForm /></ProtectedRoute>} />
      <Route path="/lead/:id" element={<ProtectedRoute><LeadForm /></ProtectedRoute>} />
      <Route path="/follow-ups" element={<ProtectedRoute><FollowUps /></ProtectedRoute>} />
      <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
      <Route path="/deals" element={<ProtectedRoute><Deals /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
      <Route path="/join/:token" element={<JoinWorkspace />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      {["companies", "tasks", "automation", "settings"].map((section) => (
        <Route key={section} path={`/${section}`} element={<WorkspacePage section={section} />} />
      ))}
    </Routes>
  );
};

export default AppRoute;
