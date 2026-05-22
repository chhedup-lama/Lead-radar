import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [allTime, thisMonth, thisWeek, recent] = await Promise.all([
    prisma.apiUsage.aggregate({
      _sum: { costUsd: true, inputTokens: true, outputTokens: true },
    }),
    prisma.apiUsage.aggregate({
      where: { createdAt: { gte: startOfMonth } },
      _sum: { costUsd: true, inputTokens: true, outputTokens: true },
    }),
    prisma.apiUsage.aggregate({
      where: { createdAt: { gte: startOfWeek } },
      _sum: { costUsd: true, inputTokens: true, outputTokens: true },
    }),
    prisma.apiUsage.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { source: { select: { name: true } } },
    }),
  ]);

  return Response.json({
    allTime: allTime._sum,
    thisMonth: thisMonth._sum,
    thisWeek: thisWeek._sum,
    recent,
  });
}
