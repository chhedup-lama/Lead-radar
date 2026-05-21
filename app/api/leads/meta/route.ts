import { prisma } from '@/lib/prisma'

export async function GET() {
  const leads = await prisma.lead.findMany({
    select: { country: true, sector: true },
  })

  const countries = [
    ...new Set(leads.map((l) => l.country).filter(Boolean)),
  ].sort() as string[]

  const sectors = [
    ...new Set(leads.map((l) => l.sector).filter(Boolean)),
  ].sort() as string[]

  return Response.json({ countries, sectors })
}
