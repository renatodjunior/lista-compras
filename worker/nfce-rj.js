// Cloudflare Worker — SEFAZ-RJ NFC-e scraper
//
// Endpoint:
//   GET /?chave=<44-digit>&tpAmb=<1|2>
//   GET /?p=<chave>|<versao>|<tpAmb>     (raw QR payload)
//
// Returns JSON:
//   { ok:true, store, cnpj, address, date, items:[{name,qty,unit,price,total}], total }
// or:
//   { ok:false, error:string }
//
// Notes:
// - SEFAZ-RJ HTML structure is not contractually stable. If the page changes,
//   selectors below need updating. Logs to console for the worker tail.
// - Allowed-origin defaults to "*". Tighten ALLOWED_ORIGIN env if exposing widely.
// - Free tier: 100k req/day on workers.dev.

const SEFAZ_URL = "https://consultadfe.fazenda.rj.gov.br/consultaNFCe/QRCode"

function cors(origin){
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  }
}

function json(body, status, origin){
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors(origin) },
  })
}

function parseQRPayload(raw){
  if(!raw) return null
  const parts = String(raw).split("|")
  if(!parts.length || !/^\d{44}$/.test(parts[0])) return null
  return {
    chave: parts[0],
    versao: parts[1] || "3",
    tpAmb: parts[2] || "1",
  }
}

function parseNumberBR(s){
  if(s == null) return NaN
  const cleaned = String(s).replace(/[^\d,.\-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")
  const n = parseFloat(cleaned)
  return isFinite(n) ? n : NaN
}

function textOf(html){
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, " ")
    .trim()
}

// SEFAZ-RJ portal returns HTML with item rows. Layout (as of 2026-05):
// - Each item lives in a table row with class "toggle-tr" (or .fixo-prod-serv container).
// - Item name in span.txtTit; code in span.RCod; qty in span.Rqtd; unit in span.RUN;
//   unit price in span.RvlUnit; total in td.noWrap span / .valor.
// - Header info: span#u20 (store name), span#u21 (CNPJ), span#u23 (address),
//   span (date) within #infos / .ui-collapsible.
// Parse defensively — fall back to regex search if classes change.
function parseSefazHtml(html){
  const out = { store:"", cnpj:"", address:"", date:"", items:[], total:0 }

  // Try to find store name
  let m
  m = html.match(/<div[^>]*id=["']u20["'][^>]*>([\s\S]*?)<\/div>/i)
  if(m) out.store = textOf(m[1])

  m = html.match(/CNPJ[:\s]*<[^>]+>\s*([\d./-]+)/i) || html.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/)
  if(m) out.cnpj = m[1].trim()

  m = html.match(/<div[^>]*id=["']u23["'][^>]*>([\s\S]*?)<\/div>/i)
  if(m) out.address = textOf(m[1])

  m = html.match(/Emiss[ãa]o[^<]*<[^>]*>\s*([\d/]{8,10}\s+\d{2}:\d{2}(?::\d{2})?)/i)
    || html.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(?::\d{2})?)/)
  if(m) out.date = m[1].trim()

  // Items
  const itemRe = /<tr[^>]*class=["'][^"']*toggle-tr[^"']*["'][\s\S]*?<\/tr>/gi
  let it
  while((it = itemRe.exec(html)) !== null){
    const row = it[0]
    const name = (row.match(/class=["'][^"']*txtTit[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) || [])[1]
    const qty  = (row.match(/class=["'][^"']*Rqtd[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) || [])[1]
    const unit = (row.match(/class=["'][^"']*RUN[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) || [])[1]
    const price= (row.match(/class=["'][^"']*RvlUnit[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) || [])[1]
    const total= (row.match(/class=["'][^"']*valor[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) || [])[1]
    if(!name) continue
    const qNum = parseNumberBR(qty)
    const pNum = parseNumberBR(price)
    const tNum = parseNumberBR(total)
    out.items.push({
      name: textOf(name),
      qty: isFinite(qNum) ? String(qNum) : "",
      unit: textOf(unit).toLowerCase().replace(/[^a-z]/g, ""),
      price: isFinite(pNum) ? pNum.toFixed(2) : "",
      total: isFinite(tNum) ? tNum.toFixed(2) : "",
    })
  }

  m = html.match(/Valor\s*[Tt]otal[\s\S]{0,200}?(\d{1,3}(?:\.\d{3})*,\d{2})/)
  if(m) out.total = parseNumberBR(m[1])
  if(!out.total && out.items.length){
    out.total = out.items.reduce((s, x) => s + (parseFloat(x.total) || 0), 0)
  }
  return out
}

async function fetchSefaz(chave, versao, tpAmb){
  const url = `${SEFAZ_URL}?p=${chave}|${versao}|${tpAmb}`
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  })
  if(!res.ok) throw new Error(`SEFAZ HTTP ${res.status}`)
  return await res.text()
}

export default {
  async fetch(req, env){
    const origin = (env && env.ALLOWED_ORIGIN) || "*"
    if(req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) })
    if(req.method !== "GET") return json({ ok:false, error:"method not allowed" }, 405, origin)

    const u = new URL(req.url)
    let parsed = null
    const p = u.searchParams.get("p")
    if(p) parsed = parseQRPayload(p)
    if(!parsed){
      const chave = u.searchParams.get("chave")
      if(/^\d{44}$/.test(chave || "")){
        parsed = { chave, versao: u.searchParams.get("versao") || "3", tpAmb: u.searchParams.get("tpAmb") || "1" }
      }
    }
    if(!parsed) return json({ ok:false, error:"invalid chave or QR payload" }, 400, origin)

    try {
      const html = await fetchSefaz(parsed.chave, parsed.versao, parsed.tpAmb)
      const data = parseSefazHtml(html)
      if(!data.items.length) return json({ ok:false, error:"no items parsed (SEFAZ layout may have changed)", chave: parsed.chave }, 502, origin)
      return json({ ok:true, chave: parsed.chave, ...data }, 200, origin)
    } catch(e){
      return json({ ok:false, error: String(e && e.message || e) }, 502, origin)
    }
  },
}
