import { prisma } from "@/lib/prisma";
import { extractLeads } from "@/lib/extract";

export const maxDuration = 120;

export async function POST() {
  const liveSources = await prisma.source.findMany({
    where: { status: "live" },
    orderBy: { tier: "asc" },
  });

  if (liveSources.length === 0) {
    return Response.json({ message: "No live sources to scan.", leads: [] });
  }

  const results: { sourceId: string; sourceName: string; count: number; error?: string }[] = [];

  for (const source of liveSources) {
    try {
      // Fetch the page
      const res = await fetch(source.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; OpportunityRadar/1.0; +research)",
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        results.push({ sourceId: source.id, sourceName: source.name, count: 0, error: `HTTP ${res.status}` });
        continue;
      }

      const html = await res.text();

      // Strip scripts/styles; preserve anchor text+href so Claude can extract individual tender URLs
      const baseUrl = new URL(source.url).origin;
      const pageText = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
          const cleanText = text.replace(/<[^>]+>/g, "").trim();
          const fullHref = href.startsWith("http") ? href : `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
          return cleanText ? ` ${cleanText} [${fullHref}] ` : ` ${fullHref} `;
        })
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const leads = await extractLeads(pageText, source.url);

      // Deduplicate against existing leads from same source by title
      const existingTitles = new Set(
        (await prisma.lead.findMany({ where: { sourceId: source.id }, select: { title: true } }))
          .map((l) => l.title.toLowerCase())
      );

      const newLeads = leads.filter((l) => !existingTitles.has(l.title.toLowerCase()));

      if (newLeads.length > 0) {
        await prisma.lead.createMany({
          data: newLeads.map((l) => ({
            sourceId: source.id,
            sourceUrl: source.url,
            title: l.title || "Untitled",
            institution: l.institution || null,
            country: l.country || null,
            sector: l.sector || null,
            subSector: l.subSector || null,
            serviceLine: l.serviceLine || null,
            opportunityType: l.opportunityType || null,
            procurementStage: l.procurementStage || null,
            deadline: l.deadline || null,
            funder: l.funder || null,
            tenderUrl: l.tenderUrl || null,
            contacts: l.contacts || null,
            summary: l.summary || null,
            whyRelevant: l.whyRelevant || null,
            recommendedAction: l.recommendedAction || null,
            score: Math.min(100, Math.max(0, Number(l.score) || 0)),
            scoreTier: ["1", "2", "3"].includes(String(l.scoreTier)) ? String(l.scoreTier) : "3",
          })),
        });
      }

      await prisma.source.update({
        where: { id: source.id },
        data: { lastScanned: new Date() },
      });

      results.push({ sourceId: source.id, sourceName: source.name, count: newLeads.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ sourceId: source.id, sourceName: source.name, count: 0, error: msg });
    }
  }

  const totalNew = results.reduce((sum, r) => sum + r.count, 0);
  return Response.json({ message: `Scan complete. ${totalNew} new leads found.`, results });
}
