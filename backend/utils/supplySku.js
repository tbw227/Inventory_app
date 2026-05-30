/**
 * Extract catalog item number from names like `[90656] 25 Person First Aid Kit Refill`.
 */
function extractBracketSku(name) {
  const m = String(name ?? '').trim().match(/^\[([^\]]+)\]/)
  return m ? m[1].trim() : null
}

module.exports = { extractBracketSku }
