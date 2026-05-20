export type ProbeStatus =
  | "live"
  | "js_rendered"
  | "auth_required"
  | "dead"
  | "blocked";

export interface ProbeResult {
  status: ProbeStatus;
  note: string;
}

export async function probeSource(url: string): Promise<ProbeResult> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; OpportunityRadar/1.0; +research)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(12000),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("certificate") || msg.includes("SSL") || msg.includes("CERT")) {
      return { status: "dead", note: "SSL certificate error — site certificate is expired or invalid." };
    }
    if (msg.includes("timeout") || msg.includes("timed out")) {
      return { status: "dead", note: "Request timed out — site is unreachable or too slow." };
    }
    return { status: "dead", note: `Could not reach the site: ${msg}` };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      status: "blocked",
      note: `Server returned ${response.status} — site is blocking automated requests.`,
    };
  }

  if (response.status === 302 || response.status === 301) {
    const location = response.headers.get("location") ?? "";
    if (
      location.toLowerCase().includes("login") ||
      location.toLowerCase().includes("signin") ||
      location.toLowerCase().includes("auth")
    ) {
      return {
        status: "auth_required",
        note: `Redirects to login page (${location}) — credentials required.`,
      };
    }
  }

  if (!response.ok) {
    return {
      status: "dead",
      note: `HTTP ${response.status} — site returned an error response.`,
    };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("html")) {
    return {
      status: "live",
      note: "Non-HTML response (possibly JSON or XML feed) — likely scrapable.",
    };
  }

  const html = await response.text();

  // Auth redirect detection in the final URL
  const finalUrl = response.url ?? url;
  if (
    finalUrl.toLowerCase().includes("login") ||
    finalUrl.toLowerCase().includes("signin")
  ) {
    return {
      status: "auth_required",
      note: `Final URL is a login page (${finalUrl}) — credentials required.`,
    };
  }

  // Check for meaningful content vs empty JS shell
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const wordCount = bodyText.split(" ").filter((w) => w.length > 3).length;

  if (wordCount < 30) {
    return {
      status: "js_rendered",
      note:
        "Page HTML has very little text content — likely JavaScript-rendered. Needs Playwright to extract data.",
    };
  }

  // Check for login-related keywords in body content
  const bodyLower = bodyText.toLowerCase();
  const loginKeywords = ["please log in", "please sign in", "you must be logged", "access denied"];
  if (loginKeywords.some((k) => bodyLower.includes(k))) {
    return {
      status: "auth_required",
      note: "Page content indicates a login wall — credentials required.",
    };
  }

  return {
    status: "live",
    note: `Page fetched successfully with ~${wordCount} words of content. Ready to scan.`,
  };
}
