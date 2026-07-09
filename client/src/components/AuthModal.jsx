import { useEffect, useState } from "react";
import { loginUser, signupUser } from "../services/api";

const initialForm = {
  username: "",
  email: "",
  password: "",
};

const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setForm(initialForm);
      setError("");
      setMessage("");
      setMode("login");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const payload = mode === "login"
        ? { email: form.email, password: form.password }
        : { username: form.username, email: form.email, password: form.password };

      const response = mode === "login"
        ? await loginUser(payload)
        : await signupUser(payload);

      const authData = {
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      };

      onAuthSuccess(authData);
      setMessage(response.message || "Success");
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-purple-500/20 bg-[#0f0a1f] p-6 shadow-2xl shadow-purple-950/40">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {mode === "login" ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-sm text-white/60">
              {mode === "login" ? "Login to view your leads" : "Signup to start managing leads"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-2 py-1 text-sm text-white/70 hover:border-purple-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${mode === "login" ? "bg-purple-600 text-white" : "text-white/60"}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${mode === "signup" ? "bg-purple-600 text-white" : "text-white/60"}`}
          >
            Signup
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm text-white/70">Username</label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                className="w-full rounded-xl border border-white/10 bg-[#140f25] px-3 py-2 text-white outline-none ring-0"
                placeholder="Your name"
                required
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm text-white/70">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/10 bg-[#140f25] px-3 py-2 text-white outline-none ring-0"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-white/70">Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/10 bg-[#140f25] px-3 py-2 text-white outline-none ring-0"
              placeholder="••••••"
              required
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {message ? <p className="text-sm text-green-400">{message}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#d9ff00] px-3 py-2 font-semibold text-[#02030a] transition hover:opacity-90 disabled:opacity-70"
          >
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
