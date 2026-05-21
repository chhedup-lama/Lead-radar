import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const [sources, allLeads, recentLeads] = await Promise.all([
    prisma.source.findMany({
      select: { status: true, lastScanned: true },
    }),
    prisma.lead.findMany({
      select: { scoreTier: true, reviewStatus: true, score: true },
    }),
    prisma.lead.findMany({
      take: 6,
      orderBy: { discoveredAt: 'desc' },
      select: {
        id: true,
        title: true,
        institution: true,
        country: true,
        score: true,
        scoreTier: true,
        reviewStatus: true,
        opportunityType: true,
        deadline: true,
        discoveredAt: true,
        source: { select: { name: true } },
      },
    }),
  ])

  const liveCount = sources.filter(
    (s) => s.status === 'live' || s.status === 'js_rendered'
  ).length

  const lastScan =
    sources
      .map((s) => s.lastScanned)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0]
      ?.toISOString() ?? null

  const tierStats = ['1', '2', '3'].map((tier) => {
    const tierLeads = allLeads.filter((l) => l.scoreTier === tier)
    const newCount = tierLeads.filter((l) => l.reviewStatus === 'new').length
    const avgScore =
      tierLeads.length > 0
        ? Math.round(
            tierLeads.reduce((sum, l) => sum + (l.score ?? 0), 0) / tierLeads.length
          )
        : 0
    return { tier, total: tierLeads.length, newCount, avgScore }
  })

  return NextResponse.json({
    sources: { total: sources.length, live: liveCount },
    leads: {
      total: allLeads.length,
      new: allLeads.filter((l) => l.reviewStatus === 'new').length,
      pursuing: allLeads.filter(
        (l) => l.reviewStatus === 'pursue' || l.reviewStatus === 'tender_response'
      ).length,
    },
    tierStats,
    recentLeads,
    lastScan,
  })
}
