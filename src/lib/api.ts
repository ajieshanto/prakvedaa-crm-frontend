// src/lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
});

export function setAuth(token: string | null) {
  if (token) {
    api.defaults.headers.common["Authorization"] =
      token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

export default api;
