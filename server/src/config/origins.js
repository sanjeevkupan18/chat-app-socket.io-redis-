const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];

const parseOrigins = (value) =>
  value
    ? value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];

export const getAllowedOrigins = () => {
  const envOrigins = parseOrigins(process.env.CLIENT_URL);
  return Array.from(new Set([...defaultOrigins, ...envOrigins]));
};

export const getCorsOrigin = () => {
  return getAllowedOrigins();
};
