export const parseUserAgent = (userAgentString = "") => {
  const ua = userAgentString || "";

  let browser = "Browser";
  if (/edg/i.test(ua)) browser = "Microsoft Edge";
  else if (/opr|opera/i.test(ua)) browser = "Opera";
  else if (/chrome|crios/i.test(ua)) browser = "Google Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Mozilla Firefox";
  else if (/safari/i.test(ua)) browser = "Apple Safari";

  let os = "Unknown OS";
  if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/windows nt 10/i.test(ua)) os = "Windows 10/11";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/linux/i.test(ua)) os = "Linux";

  let device = "Desktop";
  if (/tablet|ipad/i.test(ua)) device = "Tablet";
  else if (/mobile|iphone|android/i.test(ua)) device = "Mobile";

  return { browser, os, device };
};

export const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || "127.0.0.1";
};
