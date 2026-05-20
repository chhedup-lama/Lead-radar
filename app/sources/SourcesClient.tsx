"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type SourceStatus = "live" | "js_rendered" | "auth_required" | "dead" | "blocked" | "untested";

interface Source {
  id: string;
  name: string;
  url: string;
  tier: number;
  category: string | null;
  status: SourceStatus;
  statusNote: string | null;
  lastTested: string | null;
  lastScanned: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<SourceStatus, { label: string; color: string; dot: string }> = {
  live:          { label: "Live",           color: "bg-green-50 text-green-700 ring-green-600/20",  dot: "bg-green-500" },
  js_rendered:   { label: "Needs Playwright", color: "bg-yellow-50 text-yellow-700 ring-yellow-600/20", dot: "bg-yellow-400" },
  auth_required: { label: "Auth Required",  color: "bg-blue-50 text-blue-700 ring-blue-600/20",    dot: "bg-blue-400" },
  dead:          { label: "Dead",           color: "bg-red-50 text-red-700 ring-red-600/20",        dot: "bg-red-500" },
  blocked:       { label: "Blocked",        color: "bg-orange-50 text-orange-700 ring-orange-600/20", dot: "bg-orange-400" },
  untested:      { label: "Untested",       color: "bg-gray-50 text-gray-600 ring-gray-500/20",     dot: "bg-gray-400" },
};

function StatusBadge({ status }: { status: SourceStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.untested;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function SourcesClient() {
  const router = useRouter();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningAll, setScanningAll] = useState(false);
  const [scanStatus, setScanStatus] = useState("");

  // Add form state
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [tier, setTier] = useState("1");
  const [category, setCategory] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // Per-row probe state
  const [probingIds, setProbingIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const fetchSources = useCallback(async () => {
    const res = await fetch("/api/sources");
    const data = await res.json();
    setSources(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, tier: Number(tier), category }),
      });
      if (!res.ok) {
        const err = await res.json();
        setAddError(err.error ?? "Failed to add source.");
        return;
      }
      const created: Source = await res.json();
      setSources((prev) => [created, ...prev]);
      setName(""); setUrl(""); setTier("1"); setCategory("");
    } catch {
      setAddError("Network error. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleProbe(id: string) {
    setProbingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/sources/${id}/probe`, { method: "POST" });
      if (res.ok) {
        const updated: Source = await res.json();
        setSources((prev) => prev.map((s) => (s.id === id ? updated : s)));
      }
    } finally {
      setProbingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  }

  async function handleRemove(id: string) {
    setRemovingIds((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/sources/${id}`, { method: "DELETE" });
      setSources((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setRemovingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  }

  async function handleScanAll() {
    setScanningAll(true);
    setScanStatus("Scanning live sources — this may take a minute…");
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const data = await res.json();
      setScanStatus(data.message ?? "Scan complete.");
      router.push("/leads");
    } catch {
      setScanStatus("Scan failed. Please try again.");
    } finally {
      setScanningAll(false);
    }
  }

  const liveSources = sources.filter((s) => s.status === "live");

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sources</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Add a URL and test it. Only <span className="font-medium text-green-700">Live</span> sources are scanned.
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1">
          <button
            onClick={handleScanAll}
            disabled={scanningAll || liveSources.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {scanningAll ? (
              <>
                <Spinner />
                Scanning…
              </>
            ) : (
              `Scan All Live (${liveSources.length})`
            )}
          </button>
          {scanStatus && (
            <span className="text-xs text-gray-500">{scanStatus}</span>
          )}
        </div>
      </div>

      {/* Add source form */}
      <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Add Source</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kenya PPIP"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://tenders.go.ke/tenders"
              required
              type="url"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Tier</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Kenya"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
          </div>
        </div>
        {addError && <p className="mt-2 text-xs text-red-600">{addError}</p>}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={adding}
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {adding ? <><Spinner /> Testing…</> : "Add & Test"}
          </button>
          {adding && (
            <span className="text-xs text-gray-500">Probing the URL — this may take a few seconds…</span>
          )}
        </div>
      </form>

      {/* Sources table */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
          <Spinner /> Loading sources…
        </div>
      ) : sources.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center">
          No sources yet. Add your first one above.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">URL</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Tested</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sources.map((source) => (
                <tr key={source.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3 font-medium text-gray-900">{source.name}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-800 truncate block text-xs"
                      title={source.url}
                    >
                      {source.url}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{source.tier}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={source.status as SourceStatus} />
                      {source.statusNote && (
                        <span className="text-xs text-gray-400 leading-tight max-w-xs">
                          {source.statusNote}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(source.lastTested)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleProbe(source.id)}
                        disabled={probingIds.has(source.id)}
                        className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-40 inline-flex items-center gap-1"
                      >
                        {probingIds.has(source.id) ? <><Spinner />Re-testing…</> : "Re-test"}
                      </button>
                      <span className="text-gray-200">|</span>
                      <button
                        onClick={() => handleRemove(source.id)}
                        disabled={removingIds.has(source.id)}
                        className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
