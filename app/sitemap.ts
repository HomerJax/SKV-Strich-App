import type { MetadataRoute } from "next";

const SITE_URL = "https://www.strikr.team";

/** Only publicly accessible pages that we want Google to discover. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL + "/", changeFrequency: "weekly", priority: 1 },
    { url: SITE_URL + "/demo", changeFrequency: "monthly", priority: 0.9 },
    { url: SITE_URL + "/support", changeFrequency: "monthly", priority: 0.4 },
    { url: SITE_URL + "/impressum", changeFrequency: "yearly", priority: 0.1 },
    { url: SITE_URL + "/datenschutz", changeFrequency: "yearly", priority: 0.1 },
  ];
}
