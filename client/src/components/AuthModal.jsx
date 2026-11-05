import { useState } from "react";
import { loginUser, signupUser } from "../services/api";

const initialForm = {
  username: "",
  email: "",
  password: "",
};

const AuthModal = ({ isOpen, onClose, onAuthSuccess, authNotice = "" }) => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleClose = () => {
    setForm(initialForm);
    setError("");
    setMessage("");
    setMode("login");
    onClose();
  };

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setError("");
    setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const payload = mode === "login"
        ? { email: form.email.trim(), password: form.password }
        : { username: form.username, email: form.email.trim(), password: form.password };

      const response = mode === "login"
        ? await loginUser(payload)
        : await signupUser(payload);

      if (!response?.user || !response.accessToken || !response.refreshToken) {
        throw new Error("The authentication service returned an incomplete response. Please try again.");
      }

      const authData = {
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      };

      onAuthSuccess(authData);
      setMessage(response.message || "Success");
      handleClose();
    } catch (err) {
      const serverData = err?.response?.data;
      const validationErrors = serverData?.error;
      const validationMessage = Array.isArray(validationErrors)
        ? validationErrors.map((item) => item.msg || item.message).join(" | ")
        : null;
      const status = err?.response?.status;
      const fallbackMessage = mode === "login"
        ? "Unable to sign in. Please check your details and try again."
        : "Unable to create your account. Please try again.";
      const errorMessage = err?.response
        ? status === 401
          ? "Email or password is incorrect. Check your details and try again."
          : status >= 500
            ? "The authentication service is temporarily unavailable. Try again shortly."
            : validationMessage || (typeof serverData?.error === "string" ? serverData.error : serverData?.message) || fallbackMessage
        : err.isAxiosError
          ? ["ECONNABORTED", "ETIMEDOUT"].includes(err.code)
            ? "The authentication service took too long to respond. Please try again."
            : "Unable to reach the authentication service. Check your connection and try again."
          : err.message || fallbackMessage;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) handleClose();
    }}>
      <section
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
      >
        <div className="auth-dialog-heading">
          <div>
            <span className="auth-eyebrow">LEADFLOW CRM</span>
            <h2 id="auth-dialog-title">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p>
              {mode === "login"
                ? "Sign in to continue to your workspace."
                : "Get started managing your sales pipeline."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="auth-close-button"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <div className="auth-mode-tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            onClick={() => handleModeChange("login")}
            className={mode === "login" ? "auth-mode-active" : ""}
          >
            Login
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            onClick={() => handleModeChange("signup")}
            className={mode === "signup" ? "auth-mode-active" : ""}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "login" && authNotice && <p className="auth-feedback auth-notice" role="status">{authNotice}</p>}
          {mode === "signup" && (
            <div className="auth-field">
              <label htmlFor="auth-username">Full name</label>
              <input
                id="auth-username"
                name="username"
                value={form.username}
                onChange={handleChange}
                autoComplete="name"
                placeholder="Enter your name"
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="Enter your password"
              required
            />
          </div>

          {error ? <p className="auth-feedback auth-error" role="alert">{error}</p> : null}
          {message ? <p className="auth-feedback auth-success" role="status">{message}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="auth-submit-button"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="auth-switch-prompt">
          {mode === "login" ? "New to LeadFlow?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => handleModeChange(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </section>
    </div>
  );
};

export default AuthModal;
