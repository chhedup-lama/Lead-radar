"use client";

import { useEffect, useState } from "react";

interface UsageStats {
  costUsd: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
}

interface RecentRow {
  id: string;
  createdAt: string;
  model: string;
  callType: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  source: { name: string } | null;
}

interface UsageData {
  allTime: UsageStats;
  thisMonth: UsageStats;
  thisWeek: UsageStats;
  recent: RecentRow[];
}

function fmt(n: number | null, decimals = 4): string {
  if (n === null || n === 0) return "0";
  return n.toFixed(decimals);
}

function fmtTokens(n: number | null): string {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  label,
  costUsd,
  inputTokens,
  outputTokens,
}: {
  label: string;
  costUsd: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
}) {
  const totalTokens = (inputTokens ?? 0) + (outputTokens ?? 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">
        ${fmt(costUsd)}
      </p>
      <p className="mt-2 text-xs text-gray-500">
        {fmtTokens(totalTokens)} tokens
        <span className="text-gray-300 mx-1">·</span>
        <span className="text-gray-400">in {fmtTokens(inputTokens)}</span>
        <span className="text-gray-300 mx-1">/</span>
        <span className="text-gray-400">out {fmtTokens(outputTokens)}</span>
      </p>
    </div>
  );
}

export default function UsageClient() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">API Usage</h1>
        <p className="text-sm text-gray-500 mt-0.5">Claude API cost and token consumption</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">
          Loading...
        </div>
      ) : !data ? (
        <div className="text-sm text-red-500">Failed to load usage data.</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard
              label="All-time"
              costUsd={data.allTime.costUsd}
              inputTokens={data.allTime.inputTokens}
              outputTokens={data.allTime.outputTokens}
            />
            <StatCard
              label="This month"
              costUsd={data.thisMonth.costUsd}
              inputTokens={data.thisMonth.inputTokens}
              outputTokens={data.thisMonth.outputTokens}
            />
            <StatCard
              label="This week"
              costUsd={data.thisWeek.costUsd}
              inputTokens={data.thisWeek.inputTokens}
              outputTokens={data.thisWeek.outputTokens}
            />
          </div>

          {/* Recent activity */}
          <div>
            <h2 className="text-sm font-medium text-gray-700 mb-3">Recent calls</h2>
            {data.recent.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-400">
                No API calls recorded yet. Run a scan to see usage here.
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Time</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Source</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Type</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">In tokens</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Out tokens</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((row, i) => (
                      <tr
                        key={row.id}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                      >
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                          {fmtDate(row.createdAt)}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">
                          {row.source?.name ?? <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">
                            {row.callType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                          {row.inputTokens.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                          {row.outputTokens.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-900 font-medium tabular-nums">
                          ${row.costUsd.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
