const API_BASE_URL =
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:5000/api";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL?.trim() || new URL(API_BASE_URL).origin;

export { API_BASE_URL, SOCKET_URL };
