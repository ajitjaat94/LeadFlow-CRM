import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://leadflow-crm-1pxe.onrender.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginUser = async (payload) => {
  const { data } = await api.post("/auth/login", payload);
  return data;
};

export const signupUser = async (payload) => {
  const { data } = await api.post("/auth/signup", payload);
  return data;
};

export const getLeads = async () => {
  const { data } = await api.get("/leads");
  return data.data;
};

export const createLead = async (payload) => {
  const { data } = await api.post("/leads", payload);
  return data.data;
};

export default api;
