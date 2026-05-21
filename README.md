# Free Bet Code Converter

Drop-in bet code converter for your site, with a three-provider fallback chain:

**Betloy → Betpaddi → ConvertBetCodes**

If one fails or runs out of credits, the next takes over automatically.

## What's built in

- **Three-provider fallback chain** — service stays up as long as any provider works.
- **6-hour cache** — the same code converted twice only costs one API credit.
- **Rate limiting** — 10 conversions per minute per IP, so bots can't drain your free credits.
- **Health endpoint** — `/api/health` shows which providers are configured and cache size.

## Setup

1. **Install deps:**
   ```bash
   npm install
   ```

2. **Get API keys** (at least one; more = better resilience):
   - **Betloy** (primary): https://betloy.com — sign up, get key from dashboard. Free tier ≈ 10 conversions/month.
   - **Betpaddi** (fallback 1): https://betpaddi.com/developers — sign up, request API access. Pricing not public.
   - **ConvertBetCodes** (fallback 2): https://convertbetcodes.com — contact them for an API key.

3. **Configure:**
   ```bash
   cp .env.example .env
   ```
   Paste in whatever keys you have. Missing providers are skipped automatically.

4. **Run:**
   ```bash
   npm start
   ```
   Open http://localhost:3000

## API

`POST /api/convert`

```json
{ "from": "sportybet", "to": "1xbet", "code": "ABC123" }
```

Success:
```json
{
  "code": "LZKQ4",
  "bookmaker": "1xbet",
  "provider": "betloy",
  "cached": false
}
```

`GET /api/health` — returns which providers are configured.

## Production notes

- **Move the cache to Redis** so it survives restarts and works across multiple instances.
- **Watch bookmaker name conventions** — each provider may spell bookies differently (`bet9ja` vs `Bet9ja`). Normalize per-provider inside each `convertVia...` function if needed.
- **Adjust the rate limit** in `server.js` (`convertLimiter`) based on your traffic.
- **Never commit `.env`** — keys go to environment variables on your host (Vercel, Railway, etc.).
