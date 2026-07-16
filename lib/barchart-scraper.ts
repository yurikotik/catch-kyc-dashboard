export interface BarchartTechnical {
  /** 0-100 technical buy rating from Barchart Technical Opinion */
  technicalRating: number
  /** Buy / Sell / Hold label from Barchart */
  signal: string | null
  /** Raw percent text from Barchart (e.g. 48% Buy) */
  raw: string | null
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

const REQUEST_TIMEOUT_MS = 20000
const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 4000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchHtmlWithRetry(url: string): Promise<string> {
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      })
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status} from ${url}`)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)
      return await res.text()
    } catch (err) {
      lastError = err
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

/**
 * Parse Barchart Technical Opinion from the quote page HTML.
 * Example: "The Barchart Technical Opinion rating is a 48% Buy ..."
 */
export function parseBarchartTechnical(html: string): BarchartTechnical {
  const ratingMatch =
    html.match(
      /Technical Opinion rating is a\s*(?:<b>\s*)?(\d{1,3})%\s*(Buy|Sell|Hold)/i,
    ) ??
    html.match(
      /technical-opinion-widget[\s\S]{0,400}?(Buy|Sell|Hold)/i,
    )

  if (!ratingMatch) {
    return { technicalRating: 50, signal: null, raw: null }
  }

  if (ratingMatch.length >= 3) {
    const percent = Number(ratingMatch[1])
    const signal = ratingMatch[2]
    const technicalRating = Number.isFinite(percent)
      ? Math.max(0, Math.min(100, Math.round(percent)))
      : 50
    return {
      technicalRating,
      signal,
      raw: `${technicalRating}% ${signal}`,
    }
  }

  const signal = ratingMatch[1]
  const fallback =
    signal.toLowerCase() === "buy" ? 75 : signal.toLowerCase() === "sell" ? 25 : 50
  return { technicalRating: fallback, signal, raw: signal }
}

export async function fetchBarchartTechnical(symbol: string): Promise<BarchartTechnical> {
  const url = `https://www.barchart.com/stocks/quotes/${encodeURIComponent(symbol)}`
  const html = await fetchHtmlWithRetry(url)
  return parseBarchartTechnical(html)
}
