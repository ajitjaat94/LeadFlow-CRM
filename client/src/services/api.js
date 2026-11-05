import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL?.trim()
  || "https://leadflow-crm-77e8.onrender.com/api";
const AUTH_REQUEST_TIMEOUT_MS = 60_000;
const TOKEN_REFRESH_BUFFER_MS = 60_000;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

let sessionExpirationHandled = false;
let refreshRequest = null;

const getTokenExpiry = (token) => {
  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload) return null;
    const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    return Number.isFinite(payload.exp) ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const clearSessionAndNotify = () => {
  if (sessionExpirationHandled) return;
  sessionExpirationHandled = true;
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.dispatchEvent(new CustomEvent("leadflow:session-expired", { detail: { returnTo } }));
};

const refreshAccessToken = () => {
  if (!refreshRequest) {
    const renew = async () => {
      const currentAccessToken = localStorage.getItem("accessToken");
      const currentExpiry = currentAccessToken ? getTokenExpiry(currentAccessToken) : null;
      if (currentExpiry && currentExpiry > Date.now() + TOKEN_REFRESH_BUFFER_MS) {
        return currentAccessToken;
      }

      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) throw new Error("No refresh token is available.");
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, {
        timeout: AUTH_REQUEST_TIMEOUT_MS,
        headers: { "Content-Type": "application/json" },
      });
      if (!data?.accessToken || !data?.refreshToken || !data?.user) {
        throw new Error("The authentication service returned an incomplete refresh response.");
      }
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      sessionExpirationHandled = false;
      window.dispatchEvent(new CustomEvent("leadflow:tokens-refreshed", { detail: data }));
      return data.accessToken;
    };
    const renewAcrossTabs = () => (
      typeof navigator !== "undefined" && navigator.locks?.request
        ? navigator.locks.request("leadflow-auth-refresh", renew)
        : renew()
    );

    refreshRequest = renewAcrossTabs().then((token) => {
      refreshRequest = null;
      return token;
    }, (error) => {
      refreshRequest = null;
      throw error;
    });
  }
  return refreshRequest;
};

const isAuthEndpoint = (url = "") => /\/auth\/(login|signup|refresh|logout)(?:\?|$)/.test(url);

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    const expiresAt = getTokenExpiry(token);
    if (expiresAt && expiresAt <= Date.now() + TOKEN_REFRESH_BUFFER_MS && !isAuthEndpoint(config.url)) {
      try {
        const refreshedToken = await refreshAccessToken();
        config.headers.Authorization = `Bearer ${refreshedToken}`;
        return config;
      } catch (error) {
        clearSessionAndNotify();
        throw error;
      }
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    const authMessage = String(error.response?.data?.message || "").trim().toLowerCase();
    const expiredAccessToken = error.response?.status === 401
      && !isAuthEndpoint(request?.url)
      && ["jwt expired", "token expired"].includes(authMessage);
    if (expiredAccessToken && request && !request._retry) {
      request._retry = true;
      try {
        const refreshedToken = await refreshAccessToken();
        request.headers.Authorization = `Bearer ${refreshedToken}`;
        return api(request);
      } catch (refreshError) {
        clearSessionAndNotify();
        return Promise.reject(refreshError);
      }
    }
    if (error.response?.status === 401
      && !isAuthEndpoint(request?.url)
      && ["invalid token", "please login again"].includes(authMessage)) {
      clearSessionAndNotify();
    }
    return Promise.reject(error);
  },
);

export const loginUser = async (payload) => {
  const { data } = await api.post("/auth/login", payload, { timeout: AUTH_REQUEST_TIMEOUT_MS });
  sessionExpirationHandled = false;
  return data;
};

export const signupUser = async (payload) => {
  const { data } = await api.post("/auth/signup", payload, { timeout: AUTH_REQUEST_TIMEOUT_MS });
  sessionExpirationHandled = false;
  return data;
};

export const logoutUser = async (refreshToken = localStorage.getItem("refreshToken")) => {
  if (!refreshToken) return;
  await axios.post(`${API_BASE_URL}/auth/logout`, { refreshToken }, {
    timeout: AUTH_REQUEST_TIMEOUT_MS,
    headers: { "Content-Type": "application/json" },
  });
};

export const getLeads = async () => {
  const { data } = await api.get("/leads");
  return data.data;
};

export const createLead = async (payload) => {
  const { data } = await api.post("/leads", payload);
  return data.data;
};

export const getLead = async (id) => {
  const { data } = await api.get(`/leads/${id}`);
  return data.data;
};

export const updateLead = async (id, payload) => {
  const { data } = await api.put(`/leads/${id}`, payload);
  return data.leads;
};

export const deleteLead = async (id) => {
  await api.delete(`/leads/${id}`);
};

export const getLeadStatus = async () => {
  const { data } = await api.get("/leads/status");
  return data;
};

export const getLeadFields = async () => {
  const { data } = await api.get("/lead-fields");
  return data.data || [];
};

export const createLeadField = async (payload) => {
  const { data } = await api.post("/lead-fields", payload);
  return data.data;
};

export const updateLeadField = async (id, payload) => {
  const { data } = await api.put(`/lead-fields/${id}`, payload);
  return data.data;
};

export const deleteLeadField = async (id) => {
  await api.delete(`/lead-fields/${id}`);
};

export const getFollowUps = async (status) => {
  const { data } = await api.get("/follow-ups", { params: status && status !== "All" ? { status } : undefined });
  if (!Array.isArray(data.data)) throw new Error("The follow-ups API returned an invalid response.");
  return data.data;
};

export const getDashboardFollowUps = async () => {
  const { data } = await api.get("/follow-ups");
  if (!Array.isArray(data.data)) throw new Error("The follow-ups API returned an invalid response.");
  return data.data;
};

export const getLeadFollowUps = async (leadId) => {
  const { data } = await api.get(`/follow-ups/lead/${leadId}`);
  return data.data || [];
};

export const createFollowUp = async (payload) => {
  const { data } = await api.post("/follow-ups", payload);
  return data.data;
};

export const updateFollowUp = async (id, payload) => {
  const { data } = await api.put(`/follow-ups/${id}`, payload);
  return data.data;
};

export const completeFollowUp = async (id) => {
  const { data } = await api.patch(`/follow-ups/${id}/complete`);
  return data.data;
};

export const cancelFollowUp = async (id) => {
  const { data } = await api.patch(`/follow-ups/${id}/cancel`);
  return data.data;
};

export const getContacts = async (archived = false) => {
  const { data } = await api.get("/contacts", { params: archived ? { archived: true } : undefined });
  return data.data || [];
};

export const getContact = async (id) => {
  const { data } = await api.get(`/contacts/${id}`);
  return data.data;
};

export const createContact = async (payload) => {
  const { data } = await api.post("/contacts", payload);
  return data.data;
};

export const updateContact = async (id, payload) => {
  const { data } = await api.put(`/contacts/${id}`, payload);
  return data.data;
};

export const linkContactLead = async (contactId, leadId) => {
  const { data } = await api.post(`/contacts/${contactId}/leads`, { leadId });
  return data.data;
};

export const unlinkContactLead = async (contactId, leadId) => {
  await api.delete(`/contacts/${contactId}/leads/${leadId}`);
};

export const archiveContact = async (id, archived = true) => {
  const { data } = await api.patch(`/contacts/${id}/archive`, { archived });
  return data.data;
};

export const deleteContact = async (id, confirmLinked = false) => {
  const { data } = await api.delete(`/contacts/${id}`, {
    params: confirmLinked ? { confirmLinked: true } : undefined,
  });
  return data;
};

export const mergeContacts = async (targetId, sourceId) => {
  const { data } = await api.post(`/contacts/${targetId}/merge`, { sourceId });
  return data.data;
};

export const mergeDuplicateContactDetails = async (targetId, values) => {
  const { data } = await api.post(`/contacts/${targetId}/merge-duplicate`, values);
  return data.data;
};

export const getDeals = async () => {
  const { data } = await api.get("/deals");
  if (!Array.isArray(data.data)) throw new Error("The deals API returned an invalid response.");
  return data.data;
};

export const createDeal = async (payload) => {
  const { data } = await api.post("/deals", payload);
  return data.data;
};

export const updateDeal = async (id, payload) => {
  const { data } = await api.put(`/deals/${id}`, payload);
  return data.data;
};

export const deleteDeal = async (id) => {
  await api.delete(`/deals/${id}`);
};

export const getWorkspaceTeam = async () => {
  const { data } = await api.get("/team");
  return data.data;
};

export const getSettings = async () => {
  const { data } = await api.get("/settings");
  return data.data;
};

export const updateProfileSettings = async (payload) => {
  const { data } = await api.put("/settings/profile", payload);
  return data.data;
};

export const updateWorkspaceSettings = async (payload) => {
  const { data } = await api.put("/settings/workspace", payload);
  return data.data;
};

export const createTeamInvitation = async (payload) => {
  const { data } = await api.post("/team/invitations", payload);
  return data.data;
};

export const previewTeamInvitation = async (token) => {
  const { data } = await api.get(`/team/invitations/preview/${encodeURIComponent(token)}`);
  return data.data;
};

export const acceptTeamInvitation = async (token) => {
  const { data } = await api.post("/team/invitations/accept", { token });
  return data.data;
};

export const revokeTeamInvitation = async (id) => {
  const { data } = await api.delete(`/team/invitations/${id}`);
  return data;
};

export const updateTeamMemberRole = async (id, role) => {
  const { data } = await api.patch(`/team/members/${id}`, { role });
  return data;
};

export const removeTeamMember = async (id) => {
  const { data } = await api.delete(`/team/members/${id}`);
  return data;
};

export default api;
