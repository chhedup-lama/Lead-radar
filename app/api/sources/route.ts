import { prisma } from "@/lib/prisma";
import { probeSource } from "@/lib/probe";

export async function GET() {
  const sources = await prisma.source.findMany({
    orderBy: [{ tier: "asc" }, { createdAt: "desc" }],
  });
  return Response.json(sources);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, url, tier = 1, category } = body;

  if (!name || !url) {
    return Response.json({ error: "Name and URL are required." }, { status: 400 });
  }

  // Probe immediately on add
  const probe = await probeSource(url);

  const source = await prisma.source.create({
    data: {
      name,
      url,
      tier: Number(tier),
      category: category || null,
      status: probe.status,
      statusNote: probe.note,
      lastTested: new Date(),
    },
  });

  return Response.json(source, { status: 201 });
}
