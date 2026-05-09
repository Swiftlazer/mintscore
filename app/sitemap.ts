import type { MetadataRoute } from "next";
import { getUpcomingMatches } from "@/lib/football-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mintscore.app";

  const staticPages = ["", "/bonuses", "/learn"].map(p => ({
    url: `${base}${p}`,
    lastModified: new Date(),
    changeFrequency: p === "" ? ("hourly" as const) : ("weekly" as const),
    priority: p === "" ? 1 : 0.7,
  }));

  const matches = await getUpcomingMatches(7).catch(() => []);
  const matchPages = matches.map(m => ({
    url: `${base}/matches/${m.id}`,
    lastModified: new Date(m.utcDate),
    changeFrequency: "hourly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...matchPages];
}
