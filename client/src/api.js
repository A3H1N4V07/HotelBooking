import axios from "axios";
import { clearSession } from "./auth";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3001",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 on a request that carried a token means the session expired or was
// revoked: drop it and send the user to log in again. Login itself also
// returns 401 for wrong credentials, so it is left to the login page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { config, response } = error;
    const sentToken = Boolean(config?.headers?.Authorization);
    const isLoginRequest = config?.url?.includes("/users/login");

    if (response?.status === 401 && sentToken && !isLoginRequest) {
      clearSession();
      window.location.assign("/login");
    }

    return Promise.reject(error);
  }
);

export default api;
