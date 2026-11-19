const previewCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 1000;

const isPrivateIp = (hostname) => {
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return true;
  }
  // IPv4 private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16
  const parts = hostname.split(".").map(Number);
  if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
  }
  return false;
};

export const getLinkPreview = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ message: "URL parameter is required" });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url.trim());
    } catch {
      return res.status(400).json({ message: "Invalid URL provided" });
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return res.status(400).json({ message: "Only HTTP and HTTPS URLs are supported" });
    }

    if (isPrivateIp(parsedUrl.hostname)) {
      return res.status(403).json({ message: "Access to private network addresses is forbidden" });
    }

    const cleanUrl = parsedUrl.href;

    // Check in-memory cache
    const cached = previewCache.get(cleanUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    // Fetch HTML with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(cleanUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    clearTimeout(timeout);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return res.json({
        url: cleanUrl,
        siteName: parsedUrl.hostname.replace(/^www\./, ""),
        title: parsedUrl.hostname,
        description: "",
        image: "",
      });
    }

    // Read first 120KB of HTML to extract metadata efficiently
    const reader = response.body.getReader();
    let html = "";
    let bytesRead = 0;
    const maxBytes = 120000;

    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder("utf-8").decode(value, { stream: true });
      bytesRead += value.length;
      if (html.includes("</head>")) break;
    }
    reader.cancel().catch(() => {});

    // Regex extract OpenGraph & meta tags
    const getMeta = (propName) => {
      const match =
        html.match(new RegExp(`<meta[^>]*property=["'](?:og:|twitter:)?${propName}["'][^>]*content=["']([^"']+)["']`, "i")) ||
        html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["'](?:og:|twitter:)?${propName}["']`, "i")) ||
        html.match(new RegExp(`<meta[^>]*name=["'](?:og:|twitter:)?${propName}["'][^>]*content=["']([^"']+)["']`, "i")) ||
        html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["'](?:og:|twitter:)?${propName}["']`, "i"));
      return match ? match[1].trim() : "";
    };

    let title = getMeta("title");
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      title = titleMatch ? titleMatch[1].trim() : parsedUrl.hostname;
    }

    let description = getMeta("description");
    let image = getMeta("image");
    let siteName = getMeta("site_name") || parsedUrl.hostname.replace(/^www\./, "");

    // Resolve relative image URL
    if (image && !image.startsWith("http://") && !image.startsWith("https://")) {
      try {
        image = new URL(image, cleanUrl).href;
      } catch {
        image = "";
      }
    }

    // Clean HTML entities from title & description
    title = title
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    description = description
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    const result = {
      url: cleanUrl,
      title: title.slice(0, 150),
      description: description.slice(0, 250),
      image: image || "",
      siteName: siteName.slice(0, 80),
      favicon: `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=32`,
    };

    // Store in cache
    if (previewCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = previewCache.keys().next().value;
      previewCache.delete(oldestKey);
    }
    previewCache.set(cleanUrl, { data: result, timestamp: Date.now() });

    res.json(result);
  } catch (error) {
    console.error("Link preview error:", error.message);
    res.json({
      url: req.query.url || "",
      title: "",
      description: "",
      image: "",
      siteName: "",
    });
  }
};
