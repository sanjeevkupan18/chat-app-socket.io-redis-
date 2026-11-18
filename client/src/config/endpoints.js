const API_BASE_URL =
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:3000/api";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL?.trim() || new URL(API_BASE_URL).origin;

export const getMediaUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  return `${SOCKET_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

export { API_BASE_URL, SOCKET_URL };
