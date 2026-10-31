import { Link, useLocation } from "react-router-dom";
import { FiInstagram, FiMail } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import Navbar from "../components/Navebar";

const HomePage = () => {
  const location = useLocation();
  const authRequired = location.state?.authRequired;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />

      <main className="mx-auto flex max-w-7xl flex-col px-4 py-10 sm:px-6 md:px-10 md:py-16 lg:px-16">
        {authRequired && (
          <div className="mb-6 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700">
            Please login to access your leads and dashboard.
          </div>
        )}

        <section className="grid items-center gap-12 pb-10 pt-4 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d9ff00]/40 bg-[#f8ffe6] px-3 py-1.5 text-sm font-semibold text-[#214200] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#d9ff00]" />
              Smart CRM for growing teams
            </div>

            <h1 className="text-4xl font-black leading-[1.05] tracking-[-0.06em] text-slate-900 sm:text-5xl lg:text-7xl">
              Close more deals with a CRM built for momentum.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Track every inquiry, qualify faster, and keep your sales pipeline moving with one clear, automated workspace.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/dashboard"
                className="w-full rounded-2xl bg-blue-600 px-6 py-3.5 text-center text-base font-bold text-white shadow-[0_12px_24px_rgba(37,99,235,0.25)] transition hover:-translate-y-0.5 hover:bg-blue-700 sm:w-auto"
              >
                Manage Leads
              </Link>
              <Link
                to="/leads"
                className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-center text-base font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-300 hover:bg-purple-50 sm:w-auto"
              >
                Add Leads
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-5 text-sm text-slate-500">
              <div className="flex -space-x-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-[10px] font-bold text-white">A</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-purple-500 text-[10px] font-bold text-white">M</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#d9ff00] text-[10px] font-bold text-slate-900">S</span>
              </div>
              <span>Trusted by sales teams across 120+ businesses</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-10 hidden h-24 w-24 rounded-full bg-[#d9ff00]/30 blur-2xl sm:block" />
            <div className="absolute -right-4 bottom-8 hidden h-20 w-20 rounded-full bg-purple-200/70 blur-2xl sm:block" />

            <div className="relative rounded-[30px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-5 shadow-[0_30px_60px_rgba(15,23,42,0.12)]">
              <div className="absolute right-5 top-5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                +18.4%
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Pipeline</p>
                    <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-900">₹84.2K</h2>
                  </div>
                  <div className="rounded-2xl bg-[#f4fbcc] p-3">
                      <span className="text-lg font-bold text-[#214200]">₹</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-600">New leads</span>
                    <span className="text-lg font-bold text-slate-900">24</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-600">Qualified</span>
                    <span className="text-lg font-bold text-slate-900">12</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-600">Follow-ups</span>
                    <span className="text-lg font-bold text-emerald-600">93%</span>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-900 p-4 text-white">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Conversion rate</span>
                    <span>+12.8%</span>
                  </div>
                  <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-white/10">
                    <span className="block w-[72%] rounded-full bg-[#d9ff00]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 px-6 py-6 text-center text-sm text-slate-600 md:px-10 lg:px-16">
        <p>LeadFlow CRM helps your team capture opportunities, follow up faster, and close more deals.</p>
      </footer>

      <div className="fixed right-4 top-[30%] z-50 hidden flex-col gap-3 rounded-full border border-slate-200 bg-white/90 p-2 shadow-lg shadow-slate-200/60 backdrop-blur-lg md:flex">
        <a
          href="https://wa.me/919876543210"
          target="_blank"
          rel="noreferrer"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700"
          aria-label="WhatsApp"
        >
          <FaWhatsapp size={20} />
        </a>
        <a
          href="https://instagram.com/leadflowcrm"
          target="_blank"
          rel="noreferrer"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700"
          aria-label="Instagram"
        >
          <FiInstagram size={20} />
        </a>
        <a
          href="mailto:support@leadflowcrm.com"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700"
          aria-label="Email"
        >
          <FiMail size={20} />
        </a>
      </div>
    </div>
  );
};

export default HomePage;
