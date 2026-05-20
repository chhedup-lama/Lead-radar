import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tier = searchParams.get("tier");
  const country = searchParams.get("country");
  const serviceLine = searchParams.get("serviceLine");
  const status = searchParams.get("status");

  const leads = await prisma.lead.findMany({
    where: {
      ...(tier ? { scoreTier: tier } : {}),
      ...(country ? { country: { contains: country } } : {}),
      ...(serviceLine ? { serviceLine: { contains: serviceLine } } : {}),
      ...(status ? { reviewStatus: status } : {}),
    },
    include: { source: { select: { name: true } } },
    orderBy: [{ score: "desc" }, { discoveredAt: "desc" }],
  });

  return Response.json(leads);
}
