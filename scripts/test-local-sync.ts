import { scrapeFundBatch } from "../lib/cef-scraper"
import { runSyncBatch } from "../lib/sync-cef-data"

const mode = process.argv[2] ?? "scrape"

async function testScrape() {
  console.log("=== Scrape test (AEF, PEO) ===")
  const started = Date.now()
  const result = await scrapeFundBatch(["AEF", "PEO"])
  console.log("Duration:", `${((Date.now() - started) / 1000).toFixed(1)}s`)
  console.log("Funds:", result.funds.length)
  console.log("Missing:", result.missingSymbols)
  console.log("Errors:", result.errors)
  console.log("Data as of:", result.dataAsOf)
  if (result.funds[0]) {
    const f = result.funds[0]
    console.log("Sample:", {
      symbol: f.symbol,
      price: f.price,
      discount: f.discount,
      zscore: f.zscore_effective,
      technical: f.technical_rating,
    })
  }
  if (result.funds.length === 0 || result.errors.length > 0) process.exitCode = 1
}

async function testBatch0() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN missing")
    process.exit(1)
  }
  console.log("=== Sync batch 0 ===")
  const started = Date.now()
  const result = await runSyncBatch(0)
  console.log("Duration:", `${((Date.now() - started) / 1000).toFixed(1)}s`)
  console.log(JSON.stringify(result, null, 2))
  if (!result.ok) process.exit(1)
}

async function main() {
  if (mode === "batch") await testBatch0()
  else await testScrape()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
