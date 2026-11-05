import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";

const sectionCopy = {
  contacts: ["Contacts", "Keep your customer conversations and contact details organized."],
  companies: ["Companies", "See the organizations connected to your sales pipeline."],
  deals: ["Deals", "Track active opportunities from qualification to close."],
  tasks: ["Tasks", "Stay on top of follow-ups and the next actions for your team."],
  calendar: ["Calendar", "Your upcoming meetings and reminders will appear here."],
  reports: ["Reports", "Review pipeline health and sales activity in one place."],
  automation: ["Automation", "Automate repetitive tasks and keep your sales workflow moving."],
  team: ["Team", "Manage teammates and keep ownership clear across your workspace."],
  settings: ["Settings", "Configure your workspace preferences and account details."],
};

const WorkspacePage = ({ section }) => {
  const [title, description] = sectionCopy[section] || ["Workspace", "Your workspace overview."];
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className={`crm-shell ${sidebarOpen ? "crm-sidebar-expanded" : "crm-sidebar-collapsed"}`}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => {
        if (window.innerWidth <= 760) setSidebarOpen(false);
      }} onToggle={() => setSidebarOpen((open) => !open)} />
      <main className="crm-main">
        <DashboardTopbar searchTerm={searchTerm} onSearchChange={setSearchTerm} onAddLead={() => navigate("/leads")} onToggleSidebar={() => setSidebarOpen((open) => !open)} sidebarOpen={sidebarOpen} />
        <div className="crm-page">
          <div className="crm-page-heading">
            <div>
              <span className="crm-eyebrow">Workspace</span>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
          </div>
          <section className="crm-panel crm-empty-panel">
            <div className="crm-empty-icon">{title.slice(0, 1)}</div>
            <h2>{title} is ready for your data</h2>
            <p>This temporary view is connected to the workspace navigation. API-backed records can be added here later.</p>
            <Link className="crm-add-button" to="/dashboard">Back to dashboard</Link>
          </section>
        </div>
      </main>
    </div>
  );
};

export default WorkspacePage;
