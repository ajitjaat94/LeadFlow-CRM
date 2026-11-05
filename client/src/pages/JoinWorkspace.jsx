import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  acceptTeamInvitation,
  loginUser,
  logoutUser,
  previewTeamInvitation,
  signupUser,
} from "../services/api";

const JoinWorkspace = () => {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState(null);
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(() => Boolean(localStorage.getItem("accessToken")));

  useEffect(() => {
    let active = true;
    previewTeamInvitation(token)
      .then((data) => {
        if (active) setInvitation(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "This invitation is invalid or has expired.");
      })
      .finally(() => {
        if (active) setLoadingPreview(false);
      });
    return () => { active = false; };
  }, [token]);

  const acceptInvitation = async () => {
    await acceptTeamInvitation(token);
    navigate("/team", { replace: true });
  };

  const handleAccept = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (localStorage.getItem("accessToken")) {
        await acceptInvitation();
        return;
      }
      const response = mode === "login"
        ? await loginUser({ email: invitation.email, password })
        : await signupUser({ username, email: invitation.email, password });
      localStorage.setItem("accessToken", response.accessToken);
      localStorage.setItem("refreshToken", response.refreshToken);
      localStorage.setItem("user", JSON.stringify(response.user));
      setSignedIn(true);
      await acceptInvitation();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to join this workspace.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <Link to="/" className="text-sm font-bold text-blue-700">LeadFlow CRM</Link>
        {loadingPreview ? (
          <p className="mt-8 text-sm text-slate-500" role="status">Loading invitation…</p>
        ) : !invitation ? (
          <div className="mt-7">
            <h1 className="text-xl font-bold text-slate-900">Invitation unavailable</h1>
            <p className="mt-2 text-sm text-slate-600">{error || "This invitation is invalid or has expired."}</p>
            <Link to="/" className="mt-5 inline-block text-sm font-semibold text-blue-700">Return to LeadFlow</Link>
          </div>
        ) : (
          <>
            <div className="mt-7">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Team invitation</span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Join {invitation.workspaceName}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                You were invited as a <strong className="capitalize">{invitation.role}</strong> using <strong>{invitation.email}</strong>.
                Accepting gives you access to the workspace’s shared leads, contacts, deals, follow-ups, and custom fields. Your existing CRM records in this account will also be shared with workspace members.
              </p>
              <p className="mt-2 text-xs text-slate-500">This link expires {new Date(invitation.expiresAt).toLocaleString()}.</p>
            </div>

            {signedIn ? (
              <form onSubmit={handleAccept} className="mt-7">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
                  <span>
                    Signed in as {(() => {
                      try { return JSON.parse(localStorage.getItem("user") || "null")?.email || "your account"; } catch { return "your account"; }
                    })()}. This invitation is for {invitation.email}.
                  </span>
                  <button
                    type="button"
                    className="font-semibold underline"
                    onClick={() => {
                      const refreshToken = localStorage.getItem("refreshToken");
                      logoutUser(refreshToken).catch((requestError) => {
                        console.error("Could not revoke the refresh session during sign out.", requestError.message);
                      });
                      localStorage.removeItem("accessToken");
                      localStorage.removeItem("refreshToken");
                      localStorage.removeItem("user");
                      setSignedIn(false);
                      setError("");
                    }}
                  >
                    Use another account
                  </button>
                </div>
                {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{error}</p>}
                <button type="submit" disabled={busy} className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? "Joining…" : "Accept invitation"}</button>
              </form>
            ) : (
              <>
                <div className="mt-7 grid grid-cols-2 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Account action">
                  <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => { setMode("login"); setError(""); }} className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Sign in</button>
                  <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => { setMode("signup"); setError(""); }} className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Create account</button>
                </div>
                <form onSubmit={handleAccept} className="mt-5 space-y-4">
                  {mode === "signup" && (
                    <div>
                      <label htmlFor="join-name" className="mb-1.5 block text-sm font-semibold text-slate-700">Full name</label>
                      <input id="join-name" type="text" required minLength={3} autoComplete="name" value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" />
                    </div>
                  )}
                  <div>
                    <label htmlFor="join-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Invited email address</label>
                    <input id="join-email" type="email" readOnly value={invitation.email} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600" />
                  </div>
                  <div>
                    <label htmlFor="join-password" className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
                    <input id="join-password" type="password" required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" />
                    {mode === "signup" && <p className="mt-1 text-xs text-slate-500">Use at least 6 characters, including uppercase, lowercase, and a number.</p>}
                  </div>
                  {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{error}</p>}
                  <button type="submit" disabled={busy} className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? "Please wait…" : mode === "login" ? "Sign in and join" : "Create account and join"}</button>
                </form>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
};

export default JoinWorkspace;
