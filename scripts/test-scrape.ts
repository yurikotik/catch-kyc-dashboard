import { scrapeTrackedFunds } from "../lib/cef-scraper"

async function main() {
  const start = Date.now()
  const result = await scrapeTrackedFunds()
  console.log(`Elapsed: ${((Date.now() - start) / 1000).toFixed(1)}s`)
  console.log(`Funds scraped: ${result.funds.length}`)
  console.log(`Data as of: ${result.dataAsOf}`)
  console.log(`Missing symbols: ${JSON.stringify(result.missingSymbols)}`)
  console.log(`Errors: ${JSON.stringify(result.errors, null, 2)}`)
  for (const f of result.funds) {
    console.log(
      `${f.symbol.padEnd(5)} price=${f.price} nav=${f.nav} disc=${f.discount} z1=${f.zscore_1y} z3=${f.zscore_3y} z5=${f.zscore_5y} yield=${f.distribution_rate.toFixed(2)} lev=${f.leverage} trend=${f.trend} vol=${f.volume}`,
    )
  }
}

main().catch((err) => {
  console.error("FAILED:", err)
  process.exit(1)
})
