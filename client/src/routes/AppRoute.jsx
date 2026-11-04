import { useEffect } from "react";
import { Link, Routes, Route, useLocation, useNavigate } from "react-router-dom";
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
import Settings from "../pages/Settings";
import LeadDetail from "../pages/LeadDetail";

const NotFound = () => (
  <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-12">
    <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">LeadFlow CRM</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">The page may have moved or the address may be incorrect.</p>
      <Link
        className="mt-6 inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
        to="/"
      >
        Go to dashboard
      </Link>
    </section>
  </main>
);

const AppRoute = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleSessionExpired = (event) => {
      navigate("/", {
        replace: true,
        state: {
          authRequired: true,
          sessionExpired: true,
          returnTo: event.detail?.returnTo || pathname,
        },
      });
    };
    window.addEventListener("leadflow:session-expired", handleSessionExpired);
    return () => window.removeEventListener("leadflow:session-expired", handleSessionExpired);
  }, [navigate, pathname]);

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
      ? (pathname.endsWith("/edit") ? "Edit lead" : "View lead")
      : pathname.startsWith("/join/")
        ? "Join workspace"
        : titles[pathname] || "Page not found";
    document.title = `LeadFlow CRM | ${title}`;
  }, [pathname]);

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
      <Route path="/leads/new" element={<ProtectedRoute><LeadForm /></ProtectedRoute>} />
      <Route path="/lead/:id" element={<ProtectedRoute><LeadDetail /></ProtectedRoute>} />
      <Route path="/lead/:id/edit" element={<ProtectedRoute><LeadForm /></ProtectedRoute>} />
      <Route path="/follow-ups" element={<ProtectedRoute><FollowUps /></ProtectedRoute>} />
      <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
      <Route path="/deals" element={<ProtectedRoute><Deals /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
      <Route path="/join/:token" element={<JoinWorkspace />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      {["companies", "tasks", "automation"].map((section) => (
        <Route key={section} path={`/${section}`} element={<WorkspacePage section={section} />} />
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoute;
