import { prisma } from "@/lib/prisma";
import { extractContacts } from "@/lib/extract";

export const maxDuration = 60;

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/leads/[id]/contacts">
) {
  try {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return Response.json({ error: "Lead not found" }, { status: 404 });

  // Use provided URL, or fall back to stored tenderUrl
  const targetUrl: string = body.tenderUrl || lead.tenderUrl || "";
  if (!targetUrl) {
    return Response.json({ error: "No tender URL available. Paste the individual tender page URL." }, { status: 400 });
  }

  const res = await fetch(targetUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; OpportunityRadar/1.0)",
      Accept: "text/html,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    return Response.json({ error: `Failed to fetch tender page: HTTP ${res.status}` }, { status: 502 });
  }

  const html = await res.text();
  const pageText = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const contacts = await extractContacts(pageText, targetUrl);

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      contacts,
      ...(body.tenderUrl && !lead.tenderUrl ? { tenderUrl: body.tenderUrl } : {}),
    },
    include: { source: { select: { name: true } } },
  });

  return Response.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message + "\n" + (err as Error).stack : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
