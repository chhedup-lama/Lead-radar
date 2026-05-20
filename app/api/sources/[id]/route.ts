import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/sources/[id]">
) {
  const { id } = await ctx.params;
  await prisma.source.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
