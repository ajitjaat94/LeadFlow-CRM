import { useCallback, useEffect, useState } from "react";
import { MdContentCopy, MdGroupAdd, MdRefresh, MdPersonRemove } from "react-icons/md";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";
import {
  createTeamInvitation,
  getWorkspaceTeam,
  removeTeamMember,
  revokeTeamInvitation,
  updateTeamMemberRole,
} from "../services/api";

const Team = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLink, setInviteLink] = useState("");

  const loadTeam = useCallback(async () => {
    try {
      setTeam(await getWorkspaceTeam());
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load your team.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getWorkspaceTeam()
      .then((data) => {
        if (active) setTeam(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load your team.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const createInvite = async (email, role) => {
    const invitation = await createTeamInvitation({ email, role });
    setInviteLink(`${window.location.origin}/join/${invitation.token}`);
    await loadTeam();
    return invitation;
  };

  const handleInvite = async (event) => {
    event.preventDefault();
    setBusyKey("invite");
    setError("");
    setNotice("");
    try {
      await createInvite(inviteEmail, inviteRole);
      setInviteOpen(false);
      setInviteEmail("");
      setNotice("Invitation link created. Share it directly with the teammate.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create the invitation.");
    } finally {
      setBusyKey("");
    }
  };

  const handleRenew = async (invitation) => {
    setBusyKey(`renew-${invitation.id}`);
    setError("");
    setNotice("");
    try {
      await createInvite(invitation.email, invitation.role);
      setNotice(`A fresh invitation link for ${invitation.email} is ready to copy.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to renew this invitation.");
    } finally {
      setBusyKey("");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setNotice("Invitation link copied.");
    } catch {
      setNotice("Select and copy the invitation link from the field.");
    }
  };

  const handleMemberRole = async (member, role) => {
    setBusyKey(`member-${member.id}`);
    setError("");
    setNotice("");
    try {
      await updateTeamMemberRole(member.id, role);
      setNotice(`${member.username}'s role was updated.`);
      await loadTeam();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update this team role.");
    } finally {
      setBusyKey("");
    }
  };

  const handleRemoveMember = async (member) => {
    if (!window.confirm(`Remove ${member.username} from this workspace? Their records will no longer be shared.`)) return;
    setBusyKey(`member-${member.id}`);
    setError("");
    setNotice("");
    try {
      const result = await removeTeamMember(member.id);
      setNotice(result.message || "Team member removed.");
      await loadTeam();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to remove this team member.");
    } finally {
      setBusyKey("");
    }
  };

  const handleRevoke = async (invitation) => {
    setBusyKey(`invite-${invitation.id}`);
    setError("");
    setNotice("");
    try {
      const result = await revokeTeamInvitation(invitation.id);
      setNotice(result.message || "Invitation revoked.");
      await loadTeam();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to revoke this invitation.");
    } finally {
      setBusyKey("");
    }
  };

  const canManage = ["owner", "admin"].includes(team?.currentUserRole);

  return (
    <div className={`crm-shell ${sidebarOpen ? "crm-sidebar-expanded" : "crm-sidebar-collapsed"}`}>
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => {
          if (window.innerWidth <= 760) setSidebarOpen(false);
        }}
        onToggle={() => setSidebarOpen((open) => !open)}
      />
      <main className="crm-main">
        <DashboardTopbar
          searchTerm=""
          onSearchChange={() => {}}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          sidebarOpen={sidebarOpen}
        />
        <div className="crm-page space-y-5">
          <div className="crm-page-heading">
            <div>
              <span className="crm-eyebrow">Workspace</span>
              <h1>Team</h1>
              <p>Manage workspace access and share CRM records with your teammates.</p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => { setError(""); setInviteOpen(true); }}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                <MdGroupAdd size={18} /> Invite teammate
              </button>
            )}
          </div>

          {(error || notice) && (
            <div className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${error ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-800"}`} role={error ? "alert" : "status"}>
              <span>{error || notice}</span>
              <button type="button" className="font-semibold" aria-label="Dismiss message" onClick={() => { setError(""); setNotice(""); }}>×</button>
            </div>
          )}

          {inviteLink && (
            <section className="crm-panel p-5">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Invitation link ready</h2>
                  <p className="mt-1 text-xs text-slate-500">This private link expires after 7 days and can only be accepted by the invited email address.</p>
                </div>
                <button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-800" onClick={() => setInviteLink("")}>Dismiss</button>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input aria-label="Invitation link" readOnly value={inviteLink} onFocus={(event) => event.target.select()} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" />
                <button type="button" onClick={handleCopyLink} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><MdContentCopy size={17} /> Copy link</button>
              </div>
            </section>
          )}

          <section className="crm-panel overflow-hidden">
            <div className="crm-panel-heading">
              <div><h2>Workspace members</h2><p>{team?.name || "Your workspace"} · {team?.members?.length || 0} {team?.members?.length === 1 ? "member" : "members"}</p></div>
            </div>
            {loading ? (
              <p className="p-6 text-sm text-slate-500">Loading team…</p>
            ) : error && !team ? (
              <p className="p-6 text-sm text-slate-500">Team data is unavailable.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {team?.members?.map((member) => (
                  <div key={member.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">{member.username.slice(0, 2).toUpperCase()}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{member.username}{member.isCurrentUser ? " (you)" : ""}</p>
                        <p className="truncate text-xs text-slate-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {member.role === "owner" ? (
                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">Workspace owner</span>
                      ) : canManage ? (
                        <select
                          aria-label={`Role for ${member.username}`}
                          value={member.role}
                          disabled={busyKey === `member-${member.id}`}
                          onChange={(event) => handleMemberRole(member, event.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">Workspace {member.role}</span>
                      )}
                      {canManage && member.role !== "owner" && (
                        <button
                          type="button"
                          aria-label={`Remove ${member.username}`}
                          disabled={busyKey === `member-${member.id}`}
                          onClick={() => handleRemoveMember(member)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        >
                          <MdPersonRemove size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {!team?.members?.length && <p className="p-6 text-sm text-slate-500">No team members yet.</p>}
              </div>
            )}
          </section>

          {canManage && (
            <section className="crm-panel overflow-hidden">
              <div className="crm-panel-heading"><div><h2>Pending invitations</h2><p>Share a secure link with each invited teammate.</p></div></div>
              {team?.invitations?.length ? (
                <div className="divide-y divide-slate-100">
                  {team.invitations.map((invitation) => (
                    <div key={invitation.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{invitation.email}</p>
                        <p className="mt-1 text-xs text-slate-500"><span className="capitalize">{invitation.role}</span> · Expires {new Date(invitation.expiresAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={Boolean(busyKey)} onClick={() => handleRenew(invitation)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><MdRefresh size={16} /> Generate link</button>
                        <button type="button" disabled={Boolean(busyKey)} onClick={() => handleRevoke(invitation)} className="rounded-lg border border-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Revoke</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="p-5 text-sm text-slate-500">There are no pending invitations.</p>}
            </section>
          )}
        </div>
      </main>

      {inviteOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setInviteOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="team-invite-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="team-invite-title" className="text-lg font-bold text-slate-900">Invite teammate</h2>
            <p className="mt-1 text-sm text-slate-500">Create a secure, copyable invitation link. No email will be sent automatically.</p>
            <form onSubmit={handleInvite} className="mt-5 space-y-4">
              <div>
                <label htmlFor="team-invite-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
                <input id="team-invite-email" type="email" required maxLength={254} autoComplete="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" />
              </div>
              <div>
                <label htmlFor="team-invite-role" className="mb-1.5 block text-sm font-semibold text-slate-700">Workspace role</label>
                <select id="team-invite-role" value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">
                  <option value="member">Member — access shared CRM records</option>
                  <option value="admin">Admin — manage invitations and members</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setInviteOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
                <button type="submit" disabled={busyKey === "invite"} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busyKey === "invite" ? "Creating…" : "Create invitation"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default Team;
