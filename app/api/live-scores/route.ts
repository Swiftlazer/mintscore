import { getLiveScores } from "@/lib/live-scores";

export const revalidate = 60; // Cache for 1 minute, then revalidate

export async function GET() {
  try {
    const matches = await getLiveScores();
    console.debug(`[live-scores API] returning ${matches.length} matches`);
    return Response.json({ matches });
  } catch (error) {
    console.error("[live-scores API]", error);
    return Response.json({ matches: [] }, { status: 500 });
  }
}
