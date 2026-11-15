# webaudits

> Fast, unthrottled forensic website audit CLI for Core Web Vitals, server TTFB, and Schema.org validation.

[![npm version](https://img.shields.io/npm/v/webaudits.svg?style=flat-square)](https://www.npmjs.com/package/webaudits)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg?style=flat-square)](https://nodejs.org/)

Zero-dependency command-line utility for engineers, SEOs, and site reliability teams to diagnose live server response latency (TTFB), edge CDN routing, HTML compression, document metadata, and Schema.org structured data graphs directly from the terminal in under 2 seconds.

---

## Instant Usage (Zero Installation)

Run directly in your terminal using `npx`:

```bash
npx webaudits https://webaudits.pro
```

Or install globally:

```bash
npm install -g webaudits
webaudits https://example.com
```

---

## Terminal Output Preview

```
──────────────────────────────────────────────────────────────────────────────
 WebAudits CLI : Forensic Performance & Schema Audit
 Target: https://webaudits.pro/
──────────────────────────────────────────────────────────────────────────────

  Overall Health:   A   90/100  (HTTP 200)

  CORE TELEMETRY METRICS:
  - Server TTFB:        217 ms (target < 200ms, Google budget: 800ms)
  - Edge Network:       Vercel Anycast Edge
  - Compression:        br (99.4 KB transfer)
  - Schema.org Graphs:  5 entities (WebSite, WebPage, Organization)
  - AI Discovery:       Active (/llms.txt found)
  - Transport Security: HSTS Active

  ON-PAGE DIAGNOSTICS:
  - Title (61 chars):   "WebAudits.pro: Forensic Core Web Vitals & Speed Autopsies"
  - Description:       "Isolate exact DOM elements delaying LCP, trace JavaScript..."
  - Primary H1:        "Empirical Website Forensics & Core Web Vitals Auditing"
  - Head Scripts:      1 render-blocking candidates

  AUDIT FINDINGS:
  [PASS] Fast Server TTFB: 217ms (meets Google 800ms standard)
  [PASS] HTTP Compression Active: Encoded with br
  [PASS] Strict-Transport-Security Active: max-age=63072000; includeSubDomains; preload
  [PASS] Clickjacking Protection Active: DENY
  [PASS] Single H1 Structure: "Empirical Website Forensics & Core Web Vitals Auditing"
  [PASS] Schema.org Graph Detected: Entities: WebSite, WebPage, Organization, DigitalDocument, Person
  [PASS] llms.txt Endpoint Active: https://webaudits.pro/llms.txt verified

──────────────────────────────────────────────────────────────────────────────
  Full Forensic Teardown & Two-Stage Verification:
  https://webaudits.pro/tools/website-speed-test?url=https%3A%2F%2Fwebaudits.pro%2F
──────────────────────────────────────────────────────────────────────────────
```

---

## CLI Options

| Flag | Description | Example |
| :--- | :--- | :--- |
| `--json` | Output machine-readable JSON result | `webaudits https://stripe.com --json` |
| `--full` | Display detailed HTTP headers and security flags | `webaudits https://github.com --full` |
| `--timeout <ms>` | Set custom network timeout (default: 15000ms) | `webaudits example.com --timeout 5000` |
| `-v, --version` | Output installed CLI version | `webaudits --version` |
| `-h, --help` | Display command line usage guide | `webaudits --help` |

---

## Programmatic Node.js API

You can import `webaudits` directly into your Node.js scripts or testing frameworks:

```javascript
import { auditUrl } from 'webaudits';

const result = await auditUrl('https://webaudits.pro');

console.log('Score:', result.score);
console.log('Server TTFB:', result.metrics.ttfbMs, 'ms');
console.log('Edge CDN:', result.metrics.detectedCdn);
console.log('Schema Entities:', result.metrics.schemas);
console.log('AI Ready (llms.txt):', result.metrics.hasLlmsTxt);
```

---

## CI/CD Integration (GitHub Actions)

Add continuous performance and schema regression checks to your build pipeline:

```yaml
name: Production Performance Audit

on:
  deployment_status:
  schedule:
    - cron: '0 8 * * 1' # Every Monday morning

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - name: Audit Production Endpoint
        run: npx webaudits https://yourdomain.com --json > audit.json
      - name: Verify TTFB Budget
        run: |
          node -e "
            const report = require('./audit.json');
            if (report.metrics.ttfbMs > 800) {
              console.error('TTFB exceeded 800ms budget:', report.metrics.ttfbMs);
              process.exit(1);
            }
            console.log('Performance audit passed with score:', report.score);
          "
```

---

## What WebAudits Evaluates

| Audit Dimension | Target & Scope |
| :--- | :--- |
| Server Response Time (TTFB) | Measures raw origin latency against Google 800ms threshold and edge CDN caching. |
| Wire Compression | Confirms whether your server serves modern Brotli (`br`), Gzip, or uncompressed raw text. |
| Edge Infrastructure | Detects Anycast CDNs including Cloudflare, Vercel, Fastly, AWS CloudFront, and Akamai. |
| Transport Security | Validates HTTP Strict Transport Security (`HSTS`), clickjacking framing protection (`X-Frame-Options`), and Content Security Policy. |
| On-Page Hierarchy | Audits document `<title>` length against the 50:60 character SERP window, meta descriptions, and unique `<h1>` usage. |
| Schema.org Knowledge Graph | Extracts nested JSON-LD graphs (`WebSite`, `Organization`, `TechArticle`, `Product`, `ProfilePage`). |
| AI Search Readiness | Verifies whether domain publishes a root `llms.txt` manifest for ChatGPT, Perplexity, and autonomous agents. |

---

## Full Forensic Teardowns & White-Label Reports

For element-level DOM attribution, two-stage false-positive elimination, and client-ready PDF tear sheets, visit [WebAudits.pro](https://webaudits.pro).

- [Free Website Speed Test](https://webaudits.pro/tools/website-speed-test)
- [LCP Checker](https://webaudits.pro/tools/lcp-checker)
- [Agency Omni-Audit Generator](https://webaudits.pro/omni-audit)
- [Core Web Vitals Teardowns](https://webaudits.pro/teardowns)

---

## Links

- [webaudits-cli GitHub Repository](https://github.com/xcalibur73/webaudits-cli)
- [WebAudits.pro LCP Checker](https://webaudits.pro/tools/lcp-checker)
- [WebAudits.pro Website Speed Test](https://webaudits.pro/tools/website-speed-test)

---

## License

MIT (c) 2026 Sadikeen Firoz. See [LICENSE](./LICENSE) for details.
