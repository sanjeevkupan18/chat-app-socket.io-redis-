import { useEffect } from "react";

const SITE_NAME = "ChatApp";

const upsertMeta = (selector, attributes) => {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  return element;
};

const upsertLink = (selector, attributes) => {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement("link");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  return element;
};

const Seo = ({ title, description, path = "/" }) => {
  useEffect(() => {
    const pageTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const pageDescription =
      description ||
      "ChatApp is a fast, secure real-time messaging app with live updates, typing indicators, and private conversations.";

    document.title = pageTitle;

    upsertMeta('meta[name="description"]', {
      name: "description",
      content: pageDescription,
    });

    upsertMeta('meta[name="keywords"]', {
      name: "keywords",
      content:
        "real-time chat, messaging app, private chat, socket.io chat, chat app",
    });

    upsertMeta('meta[name="theme-color"]', {
      name: "theme-color",
      content: "#0f172a",
    });

    upsertMeta('meta[name="application-name"]', {
      name: "application-name",
      content: SITE_NAME,
    });

    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: "index, follow",
    });

    upsertMeta('meta[property="og:title"]', {
      property: "og:title",
      content: pageTitle,
    });

    upsertMeta('meta[property="og:description"]', {
      property: "og:description",
      content: pageDescription,
    });

    upsertMeta('meta[property="og:type"]', {
      property: "og:type",
      content: "website",
    });

    upsertMeta('meta[property="og:site_name"]', {
      property: "og:site_name",
      content: SITE_NAME,
    });

    upsertMeta('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: "summary_large_image",
    });

    upsertMeta('meta[name="twitter:title"]', {
      name: "twitter:title",
      content: pageTitle,
    });

    upsertMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: pageDescription,
    });

    if (typeof window !== "undefined") {
      upsertLink('link[rel="canonical"]', {
        rel: "canonical",
        href: new URL(path, window.location.origin).toString(),
      });
    }
  }, [description, path, title]);

  return null;
};

export default Seo;
