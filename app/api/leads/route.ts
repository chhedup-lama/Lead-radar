import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tier        = searchParams.get("tier");
  const status      = searchParams.get("status");
  const serviceLine = searchParams.get("serviceLine");
  const countries   = searchParams.getAll("country");
  const sectors     = searchParams.getAll("sector");

  const leads = await prisma.lead.findMany({
    where: {
      ...(tier        ? { scoreTier:    tier }        : {}),
      ...(status      ? { reviewStatus: status }      : {}),
      ...(serviceLine ? { serviceLine:  { contains: serviceLine } } : {}),
      ...(countries.length > 0 ? { country: { in: countries } } : {}),
      ...(sectors.length   > 0 ? { sector:  { in: sectors   } } : {}),
    },
    include: { source: { select: { name: true } } },
    orderBy: [{ score: "desc" }, { discoveredAt: "desc" }],
  });

  return Response.json(leads);
}
