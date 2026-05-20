import { prisma } from "@/lib/prisma";
import { probeSource } from "@/lib/probe";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/sources/[id]/probe">
) {
  const { id } = await ctx.params;

  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) {
    return Response.json({ error: "Source not found." }, { status: 404 });
  }

  const probe = await probeSource(source.url);

  const updated = await prisma.source.update({
    where: { id },
    data: {
      status: probe.status,
      statusNote: probe.note,
      lastTested: new Date(),
    },
  });

  return Response.json(updated);
}
