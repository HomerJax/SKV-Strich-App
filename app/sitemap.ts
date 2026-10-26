import type { MetadataRoute } from "next";

const SITE_URL = "https://www.strikr.team";

/** Only publicly accessible pages that we want Google to discover. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL + "/", changeFrequency: "weekly", priority: 1 },
    { url: SITE_URL + "/demo", changeFrequency: "monthly", priority: 0.9 },
    { url: SITE_URL + "/pro", changeFrequency: "monthly", priority: 0.7 },
    {
      url: SITE_URL + "/faire-fussballteams",
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: {
          "de-DE": SITE_URL + "/faire-fussballteams",
          en: SITE_URL + "/en/faire-fussballteams",
          "x-default": SITE_URL + "/faire-fussballteams",
        },
      },
    },
    {
      url: SITE_URL + "/en/faire-fussballteams",
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: {
        languages: {
          "de-DE": SITE_URL + "/faire-fussballteams",
          en: SITE_URL + "/en/faire-fussballteams",
          "x-default": SITE_URL + "/faire-fussballteams",
        },
      },
    },
    {
      url: SITE_URL + "/training-organisieren",
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: {
          "de-DE": SITE_URL + "/training-organisieren",
          en: SITE_URL + "/en/training-organisieren",
          "x-default": SITE_URL + "/training-organisieren",
        },
      },
    },
    {
      url: SITE_URL + "/en/training-organisieren",
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: {
        languages: {
          "de-DE": SITE_URL + "/training-organisieren",
          en: SITE_URL + "/en/training-organisieren",
          "x-default": SITE_URL + "/training-organisieren",
        },
      },
    },
    {
      url: SITE_URL + "/mannschaftskasse-app",
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: {
          "de-DE": SITE_URL + "/mannschaftskasse-app",
          en: SITE_URL + "/en/mannschaftskasse-app",
          "x-default": SITE_URL + "/mannschaftskasse-app",
        },
      },
    },
    {
      url: SITE_URL + "/en/mannschaftskasse-app",
      changeFrequency: "monthly",
      priority: 0.5,
      alternates: {
        languages: {
          "de-DE": SITE_URL + "/mannschaftskasse-app",
          en: SITE_URL + "/en/mannschaftskasse-app",
          "x-default": SITE_URL + "/mannschaftskasse-app",
        },
      },
    },
    { url: SITE_URL + "/support", changeFrequency: "monthly", priority: 0.4 },
    { url: SITE_URL + "/impressum", changeFrequency: "yearly", priority: 0.1 },
    { url: SITE_URL + "/datenschutz", changeFrequency: "yearly", priority: 0.1 },
  ];
}
