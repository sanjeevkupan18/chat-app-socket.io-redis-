const parseOrigins = (value) =>
  value
    ? value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];

export const getAllowedOrigins = () => parseOrigins(process.env.CLIENT_URL);

export const getCorsOrigin = () => {
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.length === 0) {
    return true;
  }

  return allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins;
};
