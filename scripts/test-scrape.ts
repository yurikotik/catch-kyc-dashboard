import { scrapeFundBatch } from "../lib/cef-scraper"
import { WATCHLIST_SYMBOLS } from "../lib/watchlist"

async function main() {
  const start = Date.now()
  const batch = await scrapeFundBatch(WATCHLIST_SYMBOLS.slice(0, 4))
  console.log(`Elapsed: ${((Date.now() - start) / 1000).toFixed(1)}s`)
  console.log(`Funds scraped: ${batch.funds.length}`)
  console.log(`Missing: ${batch.missingSymbols.join(", ")}`)
  console.log(`Errors: ${batch.errors.join("; ")}`)
  for (const f of batch.funds) {
    console.log(
      `${f.symbol} z=${f.zscore_effective}(${f.zscore_window}) tech=${f.technical_rating} yield=${f.distribution_rate.toFixed(2)} disc=${f.discount}`,
    )
  }
}

main().catch((err) => {
  console.error("FAILED:", err)
  process.exit(1)
})
