import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://tradescope-kreb.onrender.com/api",
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.message || "";
    // If it's specifically an Angel One broker error
    if (msg.includes("Angel One session") || msg.includes("Angel One credentials")) {
        window.dispatchEvent(new Event("broker-disconnected"));
        return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  }
);

export default api;