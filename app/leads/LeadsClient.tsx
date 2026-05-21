"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

interface Lead {
  id: string;
  title: string;
  institution: string | null;
  country: string | null;
  sector: string | null;
  subSector: string | null;
  serviceLine: string | null;
  opportunityType: string | null;
  procurementStage: string | null;
  deadline: string | null;
  funder: string | null;
  tenderUrl: string | null;
  contacts: string | null;
  summary: string | null;
  whyRelevant: string | null;
  recommendedAction: string | null;
  score: number;
  scoreTier: string;
  reviewStatus: string;
  notes: string | null;
  sourceUrl: string;
  discoveredAt: string;
  source: { name: string };
}

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  "1": { label: "Tier 1 — Act Now",      color: "bg-green-50 text-green-700 ring-green-600/20" },
  "2": { label: "Tier 2 — Monitor",      color: "bg-yellow-50 text-yellow-700 ring-yellow-600/20" },
  "3": { label: "Tier 3 — Low Priority", color: "bg-gray-50 text-gray-600 ring-gray-500/20" },
};

const STATUS_COLORS: Record<string, string> = {
  new:             "bg-blue-50 text-blue-700",
  pursue:          "bg-green-100 text-green-800",
  monitor:         "bg-yellow-100 text-yellow-800",
  partner:         "bg-purple-100 text-purple-800",
  tender_response: "bg-orange-100 text-orange-800",
  not_relevant:    "bg-gray-100 text-gray-500",
};

function ScoreBadge({ score, tier }: { score: number; tier: string }) {
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG["3"];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cfg.color}`}>
      {score}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function LeadsClient() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [filterTier, setFilterTier] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCountries, setFilterCountries] = useState<string[]>([]);
  const [filterSectors, setFilterSectors] = useState<string[]>([]);
  const [metaOptions, setMetaOptions] = useState<{ countries: string[]; sectors: string[] }>({ countries: [], sectors: [] });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [fetchingContacts, setFetchingContacts] = useState(false);
  const [tenderUrlInput, setTenderUrlInput] = useState("");
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/leads/meta").then((r) => r.json()).then(setMetaOptions);
  }, []);

  useEffect(() => {
    if (selected && detailRef.current) {
      detailRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [selected?.id]);

  const fetchLeads = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterTier) params.set("tier", filterTier);
    if (filterStatus) params.set("status", filterStatus);
    filterCountries.forEach((c) => params.append("country", c));
    filterSectors.forEach((s) => params.append("sector", s));
    const res = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    setLeads(data);
    setLoading(false);
  }, [filterTier, filterStatus, filterCountries, filterSectors]);

  useEffect(() => { setLoading(true); fetchLeads(); }, [fetchLeads]);

  async function fetchContacts(id: string, overrideUrl?: string) {
    setFetchingContacts(true);
    const res = await fetch(`/api/leads/${id}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(overrideUrl ? { tenderUrl: overrideUrl } : {}),
    });
    if (res.ok) {
      const updated: Lead = await res.json();
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updated } : l)));
      if (selected?.id === id) setSelected((s) => s ? { ...s, ...updated } : null);
      setTenderUrlInput("");
    }
    setFetchingContacts(false);
  }

  async function updateStatus(id: string, reviewStatus: string, notesVal?: string) {
    setUpdatingId(id);
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus, ...(notesVal !== undefined ? { notes: notesVal } : {}) }),
    });
    if (res.ok) {
      const updated: Lead = await res.json();
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updated } : l)));
      if (selected?.id === id) setSelected((s) => s ? { ...s, ...updated } : null);
    }
    setUpdatingId(null);
  }

  const tier1 = leads.filter((l) => l.scoreTier === "1");
  const tier2 = leads.filter((l) => l.scoreTier === "2");
  const tier3 = leads.filter((l) => l.scoreTier === "3");

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen overflow-hidden">
      {/* Left panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 py-4 md:px-8 md:py-5 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {leads.length} leads found · {tier1.length} Tier 1
              </p>
            </div>

            {/* All filters in one row */}
            <div className="flex flex-wrap items-center gap-2">
              <FilterPopover
                label="Country"
                options={metaOptions.countries}
                selected={filterCountries}
                onChange={setFilterCountries}
                accentColor="blue"
              />
              <FilterPopover
                label="Sector"
                options={metaOptions.sectors}
                selected={filterSectors}
                onChange={setFilterSectors}
                accentColor="violet"
              />
              <div className="w-px h-5 bg-gray-200" />
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white text-gray-600"
              >
                <option value="">All tiers</option>
                <option value="1">Tier 1</option>
                <option value="2">Tier 2</option>
                <option value="3">Tier 3</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white text-gray-600"
              >
                <option value="">All statuses</option>
                <option value="new">New</option>
                <option value="pursue">Pursue</option>
                <option value="monitor">Monitor</option>
                <option value="partner">Partner</option>
                <option value="tender_response">Tender Response</option>
                <option value="not_relevant">Not Relevant</option>
              </select>
              {(filterCountries.length > 0 || filterSectors.length > 0) && (
                <button
                  onClick={() => { setFilterCountries([]); setFilterSectors([]); }}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Active filter chips */}
          {(filterCountries.length > 0 || filterSectors.length > 0) && (
            <div className="px-4 md:px-8 pb-3 flex flex-wrap gap-1.5">
              {filterCountries.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  {c}
                  <button onClick={() => setFilterCountries((p) => p.filter((v) => v !== c))} className="hover:text-blue-900 leading-none">&times;</button>
                </span>
              ))}
              {filterSectors.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 text-xs bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full">
                  {s}
                  <button onClick={() => setFilterSectors((p) => p.filter((v) => v !== s))} className="hover:text-violet-900 leading-none">&times;</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 px-4 md:px-8 py-12">
            <Spinner /> Loading leads…
          </div>
        ) : leads.length === 0 ? (
          <div className="px-4 md:px-8 py-16 text-center">
            <p className="text-gray-400 text-sm">No leads yet.</p>
            <p className="text-gray-400 text-sm mt-1">Go to Sources and click <strong>Scan All Live</strong>.</p>
          </div>
        ) : (
          <div className="px-4 md:px-8 py-6 space-y-8">
            {(([["1", tier1], ["2", tier2], ["3", tier3]] as [string, Lead[]][])).map(([tier, g]) => {
              if (g.length === 0) return null;
              const cfg = TIER_CONFIG[tier as string];
              return (
                <section key={tier}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    {cfg.label} · {g.length}
                  </h2>
                  <div className="space-y-2">
                    {g.map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => { setSelected(lead); setNotes(lead.notes ?? ""); setTenderUrlInput(lead.tenderUrl ? "" : (lead.sourceUrl ?? "")); }}
                        className={`w-full text-left rounded-xl border px-5 py-4 transition-all ${
                          selected?.id === lead.id
                            ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500/20"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <ScoreBadge score={lead.score} tier={lead.scoreTier} />
                              {lead.opportunityType && (
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                  {lead.opportunityType}
                                </span>
                              )}
                              {lead.reviewStatus !== "new" && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.reviewStatus] ?? ""}`}>
                                  {lead.reviewStatus.replace("_", " ")}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-gray-900 leading-snug">{lead.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {[lead.institution, lead.country].filter(Boolean).join(" · ")}
                              {lead.deadline ? ` · Deadline: ${lead.deadline}` : ""}
                            </p>
                            {lead.summary && (
                              <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{lead.summary}</p>
                            )}
                          </div>
                          <div className="shrink-0 text-xs text-gray-300">
                            {lead.source.name}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Right detail panel — full-screen overlay on mobile, side panel on md+ */}
      {selected && (
        <div ref={detailRef} className="fixed inset-0 z-30 bg-white overflow-y-auto flex flex-col md:static md:inset-auto md:z-auto md:w-1/2 md:shrink-0 md:border-l md:border-gray-200">
          <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Lead Detail</h2>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>

          <div className="px-4 md:px-6 py-5 flex-1 space-y-5 text-sm">
            <div>
              <p className="font-semibold text-gray-900 leading-snug">{selected.title}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <ScoreBadge score={selected.score} tier={selected.scoreTier} />
                {selected.opportunityType && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{selected.opportunityType}</span>
                )}
              </div>
            </div>

            <dl className="space-y-2.5 text-xs">
              {[
                ["Institution", selected.institution],
                ["Country", selected.country],
                ["Sector", selected.sector],
                ["Sub-sector", selected.subSector],
                ["Service Line", selected.serviceLine],
                ["Funder", selected.funder],
                ["Stage", selected.procurementStage],
                ["Deadline", selected.deadline],
                ["Source", selected.source.name],
                ["Discovered", formatDate(selected.discoveredAt)],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label as string} className="flex gap-2">
                  <dt className="w-1/2 shrink-0 text-gray-400 font-medium">{label}</dt>
                  <dd className="w-1/2 text-gray-700">{value}</dd>
                </div>
              ))}
            </dl>

            {selected.summary && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Summary</p>
                <p className="text-xs text-gray-600 leading-relaxed">{selected.summary}</p>
              </div>
            )}

            {selected.whyRelevant && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Why relevant to MJCA</p>
                <p className="text-xs text-gray-700 leading-relaxed">{selected.whyRelevant}</p>
              </div>
            )}

            {selected.recommendedAction && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Recommended Action</p>
                <p className="text-xs text-gray-700">{selected.recommendedAction}</p>
              </div>
            )}

            <div className={`rounded-lg px-4 py-3 border ${selected.contacts ? "bg-blue-50 border-blue-100" : "bg-gray-50 border-gray-200"}`}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-blue-700">Contact</p>

              {selected.contacts ? (
                <div className="space-y-2">
                  <ContactLinks text={selected.contacts} />
                  <button
                    onClick={() => fetchContacts(selected.id, selected.tenderUrl || tenderUrlInput || undefined)}
                    disabled={fetchingContacts}
                    className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-40 inline-flex items-center gap-1"
                  >
                    {fetchingContacts ? <><Spinner /> Refreshing…</> : "Refresh contacts"}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selected.tenderUrl ? (
                    <button
                      onClick={() => fetchContacts(selected.id)}
                      disabled={fetchingContacts}
                      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                    >
                      {fetchingContacts ? <><Spinner /> Fetching…</> : "Get Contact"}
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-xs text-gray-400">Enter the tender page URL to fetch contact details:</p>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={tenderUrlInput}
                          onChange={(e) => setTenderUrlInput(e.target.value)}
                          placeholder="https://..."
                          className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                        <button
                          onClick={() => fetchContacts(selected.id, tenderUrlInput)}
                          disabled={fetchingContacts || !tenderUrlInput}
                          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                        >
                          {fetchingContacts ? <Spinner /> : "Fetch"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selected.tenderUrl && (
                <a href={selected.tenderUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs text-blue-500 hover:text-blue-700 underline">
                  Open tender page →
                </a>
              )}
              {!selected.tenderUrl && (
                <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs text-gray-400 hover:text-gray-600 underline">
                  Open source page →
                </a>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add your notes…"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
              />
              <button
                onClick={() => updateStatus(selected.id, selected.reviewStatus, notes)}
                disabled={updatingId === selected.id}
                className="mt-1 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-40"
              >
                Save notes
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Action</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "pursue",          label: "Pursue Now",       color: "bg-green-600 text-white hover:bg-green-700" },
                  { value: "monitor",         label: "Monitor",          color: "bg-yellow-500 text-white hover:bg-yellow-600" },
                  { value: "partner",         label: "Partner Route",    color: "bg-purple-600 text-white hover:bg-purple-700" },
                  { value: "tender_response", label: "Tender Response",  color: "bg-orange-500 text-white hover:bg-orange-600" },
                  { value: "not_relevant",    label: "Not Relevant",     color: "bg-gray-200 text-gray-600 hover:bg-gray-300" },
                ].map((action) => (
                  <button
                    key={action.value}
                    onClick={() => updateStatus(selected.id, action.value, notes)}
                    disabled={updatingId === selected.id}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${action.color} ${selected.reviewStatus === action.value ? "ring-2 ring-offset-1 ring-gray-400" : ""}`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

const ACCENT: Record<string, { btn: string; check: string; chip: string }> = {
  blue:   { btn: "border-blue-400 bg-blue-50 text-blue-700",   check: "accent-blue-500",   chip: "bg-blue-50 text-blue-700 border-blue-200" },
  violet: { btn: "border-violet-400 bg-violet-50 text-violet-700", check: "accent-violet-500", chip: "bg-violet-50 text-violet-700 border-violet-200" },
};

function FilterPopover({
  label, options, selected, onChange, accentColor,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  accentColor: "blue" | "violet";
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const ac = ACCENT[accentColor];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  const toggle = (val: string) =>
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
          selected.length > 0 ? ac.btn : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        {label}
        {selected.length > 0 && (
          <span className="min-w-[1.1rem] h-[1.1rem] flex items-center justify-center rounded-full bg-current/20 text-[10px] font-bold px-1">
            {selected.length}
          </span>
        )}
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-60 bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
              <input
                autoFocus
                type="text"
                placeholder={`Search ${label.toLowerCase()}…`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No results</p>
            ) : (
              filtered.map((option) => {
                const checked = selected.includes(option);
                return (
                  <label
                    key={option}
                    className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                      checked ? "bg-gray-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(option)}
                      className={`rounded border-gray-300 w-3.5 h-3.5 ${ac.check}`}
                    />
                    <span className="text-xs text-gray-700 flex-1 leading-snug">{option}</span>
                    {checked && (
                      <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </label>
                );
              })
            )}
          </div>

          {selected.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-2">
              <button
                onClick={() => { onChange([]); setOpen(false); }}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                Clear {selected.length} selected
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContactLinks({ text }: { text: string }) {
  const parts = text.split(/(\S+@\S+\.\S+)/g);
  return (
    <p className="text-xs text-gray-700 leading-relaxed break-words">
      {parts.map((part, i) =>
        /\S+@\S+\.\S+/.test(part) ? (
          <a key={i} href={`mailto:${part}`} className="text-blue-600 hover:underline font-medium">{part}</a>
        ) : (
          part
        )
      )}
    </p>
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
