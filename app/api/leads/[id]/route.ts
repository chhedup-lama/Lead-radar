import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/leads/[id]">
) {
  const { id } = await ctx.params;
  const body = await request.json();
  const { reviewStatus, notes } = body;

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      ...(reviewStatus !== undefined ? { reviewStatus } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  });

  return Response.json(updated);
}
