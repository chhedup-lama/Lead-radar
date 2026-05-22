import Anthropic from "@anthropic-ai/sdk";
import { logApiUsage } from "@/lib/usage";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ExtractedLead {
  title: string;
  institution: string;
  country: string;
  sector: string;
  subSector: string;
  serviceLine: string;
  opportunityType: string;
  procurementStage: string;
  deadline: string;
  funder: string;
  tenderUrl: string;
  contacts: string;
  summary: string;
  whyRelevant: string;
  recommendedAction: string;
  score: number;
  scoreTier: "1" | "2" | "3";
}

const MJCA_CONTEXT = `
Must & Just Consulting Advisory (MJCA) is a sustainable development consulting firm operating across Africa and Asia.

TARGET GEOGRAPHIES (priority order):
- East Africa: Kenya, Uganda, Tanzania, Ethiopia, Rwanda, South Sudan
- Southern Africa: Malawi, Zambia, Zimbabwe, Mozambique, Botswana, Eswatini
- Asia: India, Nepal, Vietnam, Cambodia

CORE SERVICE LINES:
1. Environmental & Social Safeguards (EIA, SIA, RAP, LRP, BAP, GAP, audits, compliance)
2. Water Resources, Irrigation & Catchment Management (irrigation, drainage, flood/drought, watershed)
3. Climate Resilience & Environmental Management (climate adaptation, biodiversity, carbon, waste)
4. Development Planning & Institutional Advisory (planning, capacity building, socio-economic assessment)
5. E-Governance & Monitoring Systems (education/health/labour systems, M&E)
6. Social Development & Inclusion (gender, livelihoods, participatory planning, community health)
7. ESG & Responsible Practice Support

TARGET CLIENTS: governments, ministries, NGOs, development banks (World Bank, AfDB, ADB), UN agencies (UNDP, UNICEF, UNOPS, IFAD), bilateral donors (GIZ, FCDO, USAID, EU)

SCORING GUIDE (0-100):
- 80-100 (Tier 1): Strong service line match + target geography + credible funder + actionable
- 50-79 (Tier 2): Partial match or adjacent geography or early-stage signal worth monitoring
- 0-49 (Tier 3): Weak match, outside geography, or too generic
`.trim();

export async function extractLeads(
  pageContent: string,
  sourceUrl: string,
  opts?: { sourceId?: string; scanRunId?: string }
): Promise<ExtractedLead[]> {
  const content = pageContent.slice(0, 80000);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: `You are a lead intelligence analyst for a sustainable development consulting firm.
Your job is to extract procurement opportunities and institutional signals from web page content, then score them for relevance.
Always respond with valid JSON only — no markdown, no explanation outside the JSON.`,
    messages: [
      {
        role: "user",
        content: `Extract all procurement opportunities, tenders, calls for proposals, consultancy assignments, and institutional signals from the following web page content.

${MJCA_CONTEXT}

For each opportunity found, return a JSON object with these fields:
- title: exact title of the opportunity
- institution: procuring or publishing organization
- country: country where the work will be done (infer if not explicit)
- sector: primary sector (e.g. Water, Environment, Health, Education, Governance, Agriculture, Transport, Energy, Mining)
- subSector: more specific area
- serviceLine: which MJCA service line this maps to (use exact names from the list above)
- opportunityType: Tender | RFP | EOI | RFQ | IC (Individual Consultant) | Call for Proposals | Programme Announcement | Pre-procurement Signal
- procurementStage: Open | Upcoming | Pipeline | Award
- deadline: closing date if visible, or empty string
- funder: funding organization if different from institution
- tenderUrl: the full URL link to the individual tender detail page, found as a hyperlink next to or around the tender title (e.g. "https://procurement-notices.undp.org/view_notice.cfm?notice_id=12345"). Use the absolute URL shown in brackets [URL] after the tender title. Use empty string if not found.
- contacts: any procurement officer name, email address, phone number, or contact unit found anywhere on the page for this opportunity. Include the person's name and role if available (e.g. "Jane Doe, Procurement Officer — jane.doe@undp.org"). If nothing is found, use empty string.
- summary: 2-3 sentence plain English summary of what is being procured
- whyRelevant: 1-2 sentences on specifically why MJCA should look at this
- recommendedAction: one of "Pursue now" | "Monitor" | "Research partner route" | "Archive"
- score: integer 0-100 based on the scoring guide
- scoreTier: "1" | "2" | "3"

Return a JSON array. If no relevant opportunities are found, return an empty array [].

PAGE URL: ${sourceUrl}

PAGE CONTENT:
${content}`,
      },
    ],
  });

  await logApiUsage({
    model: "claude-sonnet-4-6",
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    callType: "extract_leads",
    sourceId: opts?.sourceId,
    scanRunId: opts?.scanRunId,
  }).catch(() => {});

  const raw = message.content[0].type === "text" ? message.content[0].text : "[]";
  const stopReason = message.stop_reason;

  // Strip any accidental markdown fences
  let cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // If Claude was cut off at max_tokens, salvage all complete objects
  if (stopReason === "max_tokens") {
    const lastBrace = cleaned.lastIndexOf("},");
    if (lastBrace !== -1) {
      cleaned = cleaned.slice(0, lastBrace + 1) + "]";
    } else {
      cleaned = "[]";
    }
  }

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error("[extract] Failed to parse Claude response (stop_reason=" + stopReason + "):", cleaned.slice(0, 300));
    return [];
  }
}

export async function extractContacts(
  pageContent: string,
  pageUrl: string,
  opts?: { sourceId?: string; scanRunId?: string }
): Promise<string> {
  const content = pageContent.slice(0, 40000);
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: `You extract contact details from procurement tender pages. Be concise and factual. Plain text only.`,
    messages: [
      {
        role: "user",
        content: `Extract all contact information from this tender page. Include: names, job titles, email addresses, phone numbers, and submission instructions. Format as plain readable text.

If no contact details are found, reply with exactly: "No contact details found on this page."

PAGE URL: ${pageUrl}

PAGE CONTENT:
${content}`,
      },
    ],
  });
  await logApiUsage({
    model: "claude-sonnet-4-6",
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    callType: "extract_contacts",
    sourceId: opts?.sourceId,
    scanRunId: opts?.scanRunId,
  }).catch(() => {});
  return message.content[0].type === "text" ? message.content[0].text.trim() : "No contact details found on this page.";
}
