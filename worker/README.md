# nfce-rj — Cloudflare Worker

Proxy + scraper for SEFAZ-RJ NFC-e consultation. Returns invoice items as JSON.

The MyOwnLists app calls this worker to import NFC-e data (only when the user
enables the feature in Settings and pastes the worker URL).

## Endpoint

```
GET https://<your-worker>.workers.dev/?chave=33260507760885001733656160000768451598625158&tpAmb=1
GET https://<your-worker>.workers.dev/?p=33260507760885001733656160000768451598625158|3|1
```

Response (200):

```json
{
  "ok": true,
  "chave": "...",
  "store": "Supermercado X",
  "cnpj": "07.760.885/0017-33",
  "address": "Rua Y, 100 - Bairro - Rio de Janeiro - RJ",
  "date": "05/05/2026 19:42:00",
  "items": [
    { "name": "ARROZ TIPO 1 5KG", "qty": "1", "unit": "un", "price": "24.90", "total": "24.90" }
  ],
  "total": 24.90
}
```

Errors return `{ok:false, error}` with status 400/502.

## Deploy

```bash
npm i -g wrangler
wrangler login
wrangler deploy
```

Worker URL: `https://nfce-rj.<your-subdomain>.workers.dev`. Paste it into the
app: Settings → "Importar Nota Fiscal" → Worker URL.

### Lock CORS

In `wrangler.toml`:

```toml
[vars]
ALLOWED_ORIGIN = "https://myownlists.com"
```

Then `wrangler deploy` again.

## Limits

- Cloudflare free tier: 100 000 requests/day per account.
- SEFAZ-RJ may rate-limit or block by IP. The worker passes a browser-like
  User-Agent and runs from Cloudflare egress IPs (good reputation).

## Maintenance

SEFAZ-RJ HTML structure is not a public contract. Selectors in
`nfce-rj.js` (`txtTit`, `Rqtd`, `RUN`, `RvlUnit`, `valor`) target the current
layout. If parsing returns `ok:false, error:"no items parsed"`, inspect the
SEFAZ page source and update the regexes.

## Only RJ?

Other states use different portals. This worker only handles RJ. To add
SP/MG/etc., fork `nfce-rj.js`, change `SEFAZ_URL`, and adjust selectors.
