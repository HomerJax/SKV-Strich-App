import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/auth/",
        "/login/",
        "/signup",
        "/onboarding/",
        "/home",
        "/sessions/",
        "/sessions",
        "/players/",
        "/mannschaftskasse/",
        "/mannschaftskasse",
        "/power-user/",
        "/profile/",
        "/stats",
        "/standings",
        "/settings/",
        "/select-club",
        "/waiting-for-invite",
      ],
    },
    sitemap: "https://www.strikr.team/sitemap.xml",
    host: "https://www.strikr.team",
  };
}
