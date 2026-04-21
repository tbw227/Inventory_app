/**
 * Minimal RSS 2.0 item parsing (no XML dependency). Used for free headlines when GNews key is unset.
 */

function decodeXmlText(raw) {
  if (!raw) return ''
  let t = String(raw).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim()
  t = t.replace(/<[^>]+>/g, '')
  return t
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim()
}

function parseRssItems(xml, max = 8) {
  const out = []
  if (!xml || typeof xml !== 'string') return out
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/gi
  let m
  while ((m = re.exec(xml)) && out.length < max) {
    const chunk = m[1]
    const tm = chunk.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const lm = chunk.match(/<link[^>]*>([\s\S]*?)<\/link>/i)
    if (!tm) continue
    const title = decodeXmlText(tm[1])
    if (!title) continue
    const url = lm ? decodeXmlText(lm[1]) : ''
    const slug = title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 24)
    out.push({
      id: `rss-${out.length}-${slug || 'item'}`,
      title,
      url,
    })
  }
  return out
}

async function fetchRssHeadlines(feedUrl, max = 8) {
  try {
    const res = await fetch(feedUrl, {
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'FireTrackWeather/1.0 (inventory dashboard)',
      },
    })
    if (!res.ok) return []
    const xml = await res.text()
    return parseRssItems(xml, max)
  } catch {
    return []
  }
}

module.exports = {
  parseRssItems,
  fetchRssHeadlines,
  /** World headlines — no API key */
  RSS_WORLD_NEWS: 'https://feeds.bbci.co.uk/news/world/rss.xml',
  /** General sports headlines — no API key */
  RSS_ESPN_NEWS: 'https://www.espn.com/espn/rss/news',
}
