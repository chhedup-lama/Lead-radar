'use client'

import { useEffect, useState } from 'react'

type TierStat = { tier: string; total: number; newCount: number; avgScore: number }

type RecentLead = {
  id: string
  title: string
  institution: string | null
  country: string | null
  score: number | null
  scoreTier: string | null
  reviewStatus: string
  opportunityType: string | null
  discoveredAt: string
  source: { name: string } | null
}

type DashboardData = {
  sources: { total: number; live: number }
  leads: { total: number; new: number; pursuing: number }
  tierStats: TierStat[]
  recentLeads: RecentLead[]
  lastScan: string | null
}

const TIER_CONFIG: Record<
  string,
  {
    label: string
    description: string
    borderLeft: string
    pillBg: string
    pillText: string
    barColor: string
  }
> = {
  '1': {
    label: 'Tier 1',
    description: 'Direct Fit',
    borderLeft: 'border-l-emerald-500',
    pillBg: 'bg-emerald-100',
    pillText: 'text-emerald-800',
    barColor: 'bg-emerald-500',
  },
  '2': {
    label: 'Tier 2',
    description: 'Conditional Fit',
    borderLeft: 'border-l-amber-400',
    pillBg: 'bg-amber-100',
    pillText: 'text-amber-800',
    barColor: 'bg-amber-400',
  },
  '3': {
    label: 'Tier 3',
    description: 'Watch List',
    borderLeft: 'border-l-gray-300',
    pillBg: 'bg-gray-100',
    pillText: 'text-gray-600',
    barColor: 'bg-gray-400',
  },
}

const PIPELINE_FEATURES = [
  {
    title: 'Scheduled Intelligence Runs',
    description:
      'Auto-scan all live sources on a daily or weekly cadence. New leads land in your inbox without manual triggers.',
    eta: 'Q3 2026',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    title: 'Email Intelligence Digest',
    description:
      'Curated brief of top-scored leads delivered to your inbox on your schedule — daily, weekly, or on-demand.',
    eta: 'Q3 2026',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    title: 'Geographic Opportunity Map',
    description:
      'Heat map of open tenders across Africa and Asia. Filter by country, sector, or funder. See where demand concentrates.',
    eta: 'Q4 2026',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      </svg>
    ),
  },
  {
    title: 'CRM Pipeline Export',
    description:
      'Push shortlisted leads to HubSpot or Pipedrive with one click. Keep your business development pipeline in sync.',
    eta: 'Q4 2026',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    ),
  },
  {
    title: 'MJCA Fit Scoring v2',
    description:
      "Tune the scoring model to your current service lines and target geographies. Higher precision — fewer irrelevant leads.",
    eta: 'Q4 2026',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    title: 'Source Discovery AI',
    description:
      "Based on your top-scoring leads, Claude recommends procurement portals you're not monitoring yet. Expand coverage automatically.",
    eta: 'Q1 2027',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
  },
]

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function scoreChip(score: number | null) {
  if (score === null) return { bg: 'bg-gray-100', text: 'text-gray-400' }
  if (score >= 80) return { bg: 'bg-emerald-100', text: 'text-emerald-800' }
  if (score >= 60) return { bg: 'bg-amber-100', text: 'text-amber-800' }
  return { bg: 'bg-gray-100', text: 'text-gray-600' }
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />
}

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'
  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-7">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid md:grid-cols-5 gap-6">
          <div className="md:col-span-3 space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="md:col-span-2 h-72" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 max-w-5xl mx-auto pt-24 text-center text-gray-400 text-sm">
        Failed to load.{' '}
        <a href="/dashboard" className="underline text-gray-600">
          Retry
        </a>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Good {greeting}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {dateStr}
            {data.lastScan && (
              <>
                {' '}
                &middot; Last scan{' '}
                <span className="text-gray-700 font-medium">{timeAgo(data.lastScan)}</span>
              </>
            )}
          </p>
        </div>
        <a
          href="/sources"
          className="shrink-0 flex items-center gap-1.5 text-sm bg-gray-900 text-white px-3.5 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Scan Sources
        </a>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Live Sources
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{data.sources.live}</div>
          <div className="text-xs text-gray-400 mt-1">{data.sources.total} total monitored</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Total Leads
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{data.leads.total}</div>
          <div className="text-xs text-gray-400 mt-1">across all sources</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Unreviewed
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{data.leads.new}</div>
          <div className="text-xs text-gray-400 mt-1">need your attention</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              In Pursuit
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{data.leads.pursuing}</div>
          <div className="text-xs text-gray-400 mt-1">pursue + tender response</div>
        </div>
      </div>

      {/* Tier Breakdown + Recent Leads */}
      <div className="grid md:grid-cols-5 gap-6">
        {/* Tier cards */}
        <div className="md:col-span-3 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Lead Breakdown by Tier
          </h2>
          {data.tierStats.map((stat) => {
            const cfg = TIER_CONFIG[stat.tier] ?? TIER_CONFIG['3']
            return (
              <div
                key={stat.tier}
                className={`bg-white rounded-xl border border-gray-200 border-l-4 ${cfg.borderLeft} p-5`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">{cfg.label}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.pillBg} ${cfg.pillText}`}
                      >
                        {cfg.description}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <span>
                        <strong className="text-gray-800">{stat.total}</strong> leads
                      </span>
                      {stat.newCount > 0 && (
                        <span className="text-amber-600 font-medium">{stat.newCount} new</span>
                      )}
                      {stat.total > 0 && (
                        <span>
                          avg score{' '}
                          <strong className="text-gray-800">{stat.avgScore}</strong>
                        </span>
                      )}
                    </div>

                    {stat.total > 0 ? (
                      <div className="w-full bg-gray-100 rounded-full h-1">
                        <div
                          className={`${cfg.barColor} h-1 rounded-full transition-all`}
                          style={{ width: `${Math.min(stat.avgScore, 100)}%` }}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        No leads yet — scan sources to discover opportunities
                      </p>
                    )}
                  </div>

                  {stat.total > 0 && (
                    <a
                      href="/leads"
                      className="shrink-0 mt-0.5 text-xs font-medium text-gray-400 hover:text-gray-800 flex items-center gap-0.5 transition-colors"
                    >
                      View
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Recent Leads */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Recent Leads
            </h2>
            {data.recentLeads.length > 0 && (
              <a
                href="/leads"
                className="text-xs text-gray-400 hover:text-gray-800 flex items-center gap-0.5 transition-colors"
              >
                View all
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {data.recentLeads.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-400">No leads yet</p>
                <a href="/sources" className="text-xs text-gray-500 underline mt-1.5 block">
                  Add sources and scan to discover leads
                </a>
              </div>
            ) : (
              data.recentLeads.map((lead) => {
                const chip = scoreChip(lead.score)
                return (
                  <a
                    key={lead.id}
                    href="/leads"
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <span
                      className={`mt-0.5 shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-md tabular-nums ${chip.bg} ${chip.text}`}
                    >
                      {lead.score ?? '—'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate leading-snug">
                        {lead.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {[lead.institution, lead.country].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </a>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Features */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            What&apos;s Coming
          </h2>
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">
            Product Pipeline
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PIPELINE_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-white border border-dashed border-gray-300 rounded-xl p-4 hover:border-gray-400 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                  {feature.icon}
                </div>
                <span className="text-xs text-gray-400 font-medium bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full shrink-0">
                  {feature.eta}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">{feature.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
