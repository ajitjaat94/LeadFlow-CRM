import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { IoIosNotificationsOutline } from "react-icons/io";
import { HiMenuAlt3, HiX } from "react-icons/hi";
import AuthModal from "./AuthModal";
import {
  MdDashboard,
  MdPeople,
  MdContacts,
  MdInfoOutline,
  MdSettings,
} from "react-icons/md";

const navLinks = [
  { label: "Home", href: "/", icon: <MdDashboard size={18} /> },
  { label: "Dashboard", href: "/dashboard", icon: <MdDashboard size={18} /> },
  { label: "Leads", href: "/leads", icon: <MdPeople size={18} /> },
  { label: "Contacts", href: "/contacts", icon: <MdContacts size={18} /> },
  { label: "About", href: "/about", icon: <MdInfoOutline size={18} /> },
];

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleAuthSuccess = (authData) => {
    localStorage.setItem("accessToken", authData.accessToken);
    localStorage.setItem("refreshToken", authData.refreshToken);
    localStorage.setItem("user", JSON.stringify(authData.user));
    setUser(authData.user);
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <>
      {/* Main Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 h-16 bg-[#02030a]/95 border-b border-purple-500/20 backdrop-blur-md">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="w-2 h-2 rounded-full bg-[#d9ff00] group-hover:scale-125 transition-transform duration-300" />
          <span className="text-base font-extrabold tracking-tight text-white font-mono">
            Lead<span className="text-purple-400">flow</span> CRM
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ label, href }) => (
            <Link
              key={href}
              to={href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${
                  pathname === href
                    ? "text-purple-400 bg-purple-500/10"
                    : "text-white/50 hover:text-white hover:bg-white/6"
                }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <button className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-purple-500/40 transition-all duration-200">
            <IoIosNotificationsOutline size={20} />
            {/* Unread dot */}
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#d9ff00]" />
          </button>

          {user ? (
            <>
              <div className="w-9 h-9 rounded-xl bg-linear-to-br from-purple-500 to-purple-700 border border-purple-500/40 flex items-center justify-center text-xs font-extrabold text-white tracking-wide cursor-pointer hover:border-purple-400 transition-colors duration-200">
                {user.username?.slice(0, 2).toUpperCase() || "U"}
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 hover:border-purple-400 hover:text-white"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="rounded-lg bg-[#d9ff00] px-3 py-2 text-sm font-semibold text-[#02030a] transition hover:opacity-90"
            >
              Login
            </button>
          )}

          {/* Mobile Burger */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 text-white/70 hover:border-purple-500/40 transition-all duration-200"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <HiX size={18} /> : <HiMenuAlt3 size={18} />}
          </button>
        </div>
      </nav>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="md:hidden mx-4 mt-2 rounded-2xl border border-purple-500/20 bg-[#0a0514]/98 p-3 flex flex-col gap-1 z-40">
          {navLinks.map(({ label, href, icon }) => (
            <Link
              key={href}
              to={href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${
                  pathname === href
                    ? "text-purple-400 bg-purple-500/10"
                    : "text-white/55 hover:text-purple-300 hover:bg-purple-500/8"
                }`}
            >
              {icon}
              {label}
            </Link>
          ))}

          <div className="my-1.5 h-px bg-white/6" />

          <Link
            to="/settings"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-white/55 hover:text-purple-300 hover:bg-purple-500/8 transition-all duration-200"
          >
            <MdSettings size={18} />
            Settings
          </Link>
        </div>
      )}
    </>
  );
};
export default Navbar;
