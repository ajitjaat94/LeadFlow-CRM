import { Link, useLocation } from "react-router-dom";
import Navbar from "../components/Navebar";

const HomePage = () => {
  const location = useLocation();
  const authRequired = location.state?.authRequired;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1d1136,_#06030d)] text-white">
      <Navbar />

      <main className="mx-auto flex max-w-7xl flex-col px-6 py-16 md:px-10 lg:px-16">
        {authRequired && (
          <div className="mb-6 rounded-2xl border border-purple-400/30 bg-purple-500/10 px-4 py-3 text-sm text-purple-200">
            Please login to access your leads and dashboard.
          </div>
        )}

        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-[#d9ff00]/30 bg-[#d9ff00]/10 px-3 py-1 text-sm font-medium text-[#d9ff00]">
              Smart CRM for growing teams
            </p>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Manage every lead with clarity and speed.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-white/70">
              Track new opportunities, organize follow-ups, and move deals forward from one clean dashboard.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/dashboard"
                className="rounded-2xl bg-[#d9ff00] px-5 py-3 font-semibold text-[#02030a] transition hover:opacity-90"
              >
                Manage Leads
              </Link>
              <Link
                to="/leads"
                className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white transition hover:border-purple-400 hover:bg-purple-500/10"
              >
                Add Leads
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-purple-950/40 backdrop-blur-md">
            <div className="rounded-2xl border border-purple-400/20 bg-[#0f071d] p-5">
              <p className="text-sm uppercase tracking-[0.3em] text-purple-300">Live overview</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <span className="text-white/70">New Leads</span>
                  <span className="font-semibold text-[#d9ff00]">24</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <span className="text-white/70">Qualified</span>
                  <span className="font-semibold text-[#d9ff00]">12</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <span className="text-white/70">Lost</span>
                  <span className="font-semibold text-red-400">3</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black/20 px-6 py-6 text-center text-sm text-white/60 md:px-10 lg:px-16">
        <p>LeadFlow CRM helps your team capture opportunities, follow up faster, and close more deals.</p>
      </footer>
    </div>
  );
};

export default HomePage;
