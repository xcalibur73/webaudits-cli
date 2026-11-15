/**
 * WebAudits CLI : Core Forensic Auditing Engine
 * Independent web performance, TTFB, and Schema.org auditing utility.
 *
 * Copyright (c) 2026 Sadikeen Firoz <sfs@webaudits.pro>
 * License: MIT
 */

export async function auditUrl(rawUrl, options = {}) {
  let urlStr = (rawUrl || '').trim();
  if (!urlStr) {
    throw new Error('A valid website URL is required.');
  }

  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = 'https://' + urlStr;
  }

  const parsedUrl = new URL(urlStr);
  const timeoutMs = options.timeoutMs || 15000;
  const userAgent = options.userAgent || 'WebAudits-CLI/1.0.0 (+https://webaudits.pro)';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const startTime = performance.now();
  let response;
  let ttfbMs = 0;

  try {
    response = await fetch(parsedUrl.href, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    ttfbMs = Math.round(performance.now() - startTime);
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms while connecting to ${parsedUrl.hostname}.`);
    }
    throw new Error(`Failed to fetch ${parsedUrl.href}: ${err.message}`);
  }

  const html = await response.text();
  clearTimeout(timer);
  const totalDurationMs = Math.round(performance.now() - startTime);

  // Extract HTTP Headers
  const headers = {};
  for (const [key, value] of response.headers.entries()) {
    headers[key.toLowerCase()] = value;
  }

  const status = response.status;
  const finalUrl = response.url;
  const redirected = response.redirected;

  // Compression analysis
  const contentEncoding = headers['content-encoding'] || 'none';
  const isCompressed = /(br|gzip|deflate|zstd)/i.test(contentEncoding);

  // CDN & Server Detection
  let detectedCdn = 'Direct / Origin';
  const serverHeader = headers['server'] || '';
  if (headers['cf-ray'] || /cloudflare/i.test(serverHeader)) {
    detectedCdn = 'Cloudflare Edge';
  } else if (headers['x-vercel-id']) {
    detectedCdn = 'Vercel Anycast Edge';
  } else if (headers['x-fastly-request-id'] || /fastly/i.test(serverHeader)) {
    detectedCdn = 'Fastly Edge';
  } else if (headers['x-amz-cf-id'] || headers['x-amz-cf-pop']) {
    detectedCdn = 'AWS CloudFront';
  } else if (headers['x-akamai-transformed'] || /akamai/i.test(serverHeader)) {
    detectedCdn = 'Akamai Intelligent Edge';
  } else if (headers['x-sucuri-id']) {
    detectedCdn = 'Sucuri WAF Edge';
  }

  // Security Headers
  const hasHsts = !!headers['strict-transport-security'];
  const hasCsp = !!headers['content-security-policy'];
  const hasXFrame = !!headers['x-frame-options'];
  const hasNosniff = (headers['x-content-type-options'] || '').toLowerCase().includes('nosniff');

  // HTML Content Analysis
  const htmlBytes = Buffer.byteLength(html, 'utf8');
  const htmlKb = Math.round((htmlBytes / 1024) * 10) / 10;

  // Extract Document Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Extract Meta Description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const metaDescription = descMatch ? descMatch[1].trim() : '';

  // Extract Canonical URL
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  const canonicalUrl = canonicalMatch ? canonicalMatch[1].trim() : '';

  // Extract H1 Headings
  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  const h1Texts = h1Matches.map((h1) => h1.replace(/<[^>]+>/g, '').trim()).filter(Boolean);

  // Extract Synchronous Scripts in Head (Potential Render-Blocking)
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headHtml = headMatch ? headMatch[1] : '';
  const syncScriptsInHead = (headHtml.match(/<script(?![^>]*(async|defer|type=["']module["']|type=["']application\/ld\+json["']))[^>]*src=/gi) || []).length;

  // Extract External Stylesheets
  const stylesheetCount = (headHtml.match(/<link[^>]*rel=["']stylesheet["']/gi) || []).length;

  // Extract Schema.org JSON-LD Entities
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const schemaEntities = [];
  for (const block of jsonLdMatches) {
    const jsonStr = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => item['@type'] && schemaEntities.push(item['@type']));
      } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
        parsed['@graph'].forEach((item) => item['@type'] && schemaEntities.push(item['@type']));
      } else if (parsed['@type']) {
        schemaEntities.push(parsed['@type']);
      }
    } catch {
      // Ignored malformed JSON
    }
  }

  // Check llms.txt endpoint
  let hasLlmsTxt = false;
  try {
    let llmsRes = await fetch(`${parsedUrl.origin}/llms.txt`, {
      method: 'HEAD',
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(6000),
    });
    if (llmsRes.status !== 200 && llmsRes.status !== 404) {
      llmsRes = await fetch(`${parsedUrl.origin}/llms.txt`, {
        method: 'GET',
        headers: { 'User-Agent': userAgent },
        signal: AbortSignal.timeout(6000),
      });
    }
    hasLlmsTxt = llmsRes.status === 200;
  } catch {
    hasLlmsTxt = false;
  }

  // Calculate Scores & Findings
  const findings = [];
  let score = 100;

  // 1. TTFB evaluation
  if (ttfbMs <= 200) {
    findings.push({ category: 'Speed', severity: 'pass', label: 'Fast Server TTFB', detail: `${ttfbMs}ms (optimal cached edge response)` });
  } else if (ttfbMs <= 800) {
    score -= 10;
    findings.push({ category: 'Speed', severity: 'notice', label: 'Acceptable TTFB', detail: `${ttfbMs}ms (meets Google 800ms standard)` });
  } else {
    score -= 25;
    findings.push({ category: 'Speed', severity: 'warning', label: 'High Server Latency', detail: `${ttfbMs}ms exceeds 800ms budget` });
  }

  // 2. Compression evaluation
  if (isCompressed) {
    findings.push({ category: 'Payload', severity: 'pass', label: 'HTTP Compression Active', detail: `Encoded with ${contentEncoding}` });
  } else {
    score -= 15;
    findings.push({ category: 'Payload', severity: 'warning', label: 'Uncompressed HTML', detail: 'Missing Brotli or Gzip transfer encoding' });
  }

  // 3. Security evaluation
  if (hasHsts) {
    findings.push({ category: 'Security', severity: 'pass', label: 'Strict-Transport-Security Active', detail: headers['strict-transport-security'] });
  } else {
    score -= 8;
    findings.push({ category: 'Security', severity: 'notice', label: 'Missing HSTS Header', detail: 'Recommended for SSL preload enforcement' });
  }

  if (hasXFrame) {
    findings.push({ category: 'Security', severity: 'pass', label: 'Clickjacking Protection Active', detail: headers['x-frame-options'] });
  }

  // 4. On-Page SEO evaluation
  if (title) {
    const len = title.length;
    if (len >= 50 && len <= 60) {
      findings.push({ category: 'SEO', severity: 'pass', label: 'Optimal Title Tag Length', detail: `"${title}" (${len} chars)` });
    } else {
      findings.push({ category: 'SEO', severity: 'notice', label: 'Title Tag Window', detail: `"${title}" (${len} chars, optimal: 50:60)` });
    }
  } else {
    score -= 15;
    findings.push({ category: 'SEO', severity: 'warning', label: 'Missing Document Title', detail: 'Page lacks a <title> element' });
  }

  if (h1Texts.length === 1) {
    findings.push({ category: 'SEO', severity: 'pass', label: 'Single H1 Structure', detail: `"${h1Texts[0]}"` });
  } else if (h1Texts.length === 0) {
    score -= 10;
    findings.push({ category: 'SEO', severity: 'warning', label: 'Missing H1 Heading', detail: 'No <h1> heading found in document' });
  } else {
    score -= 5;
    findings.push({ category: 'SEO', severity: 'notice', label: 'Multiple H1 Headings', detail: `Found ${h1Texts.length} H1 elements` });
  }

  // 5. Schema.org evaluation
  if (schemaEntities.length > 0) {
    findings.push({ category: 'Schema', severity: 'pass', label: 'Schema.org Graph Detected', detail: `Entities: ${schemaEntities.join(', ')}` });
  } else {
    score -= 10;
    findings.push({ category: 'Schema', severity: 'notice', label: 'No Structured Data Found', detail: 'Zero Schema.org JSON-LD entities detected' });
  }

  // 6. AI Readiness evaluation
  if (hasLlmsTxt) {
    findings.push({ category: 'AI Search', severity: 'pass', label: 'llms.txt Endpoint Active', detail: `${parsedUrl.origin}/llms.txt verified` });
  } else {
    findings.push({ category: 'AI Search', severity: 'notice', label: 'No llms.txt Manifest', detail: 'Missing AI crawler discovery file' });
  }

  // Compute final score and grade
  const finalScore = Math.max(0, Math.min(100, score));
  let grade = 'F';
  if (finalScore >= 95) grade = 'A+';
  else if (finalScore >= 85) grade = 'A';
  else if (finalScore >= 75) grade = 'B';
  else if (finalScore >= 65) grade = 'C';
  else if (finalScore >= 50) grade = 'D';

  const webAuditsUrl = `https://webaudits.pro/tools/website-speed-test?url=${encodeURIComponent(parsedUrl.href)}`;

  return {
    url: parsedUrl.href,
    finalUrl,
    redirected,
    status,
    score: finalScore,
    grade,
    metrics: {
      ttfbMs,
      totalDurationMs,
      htmlBytes,
      htmlKb,
      detectedCdn,
      contentEncoding,
      syncScriptsInHead,
      stylesheetCount,
      schemaCount: schemaEntities.length,
      schemas: schemaEntities,
      hasLlmsTxt,
      hasHsts,
      hasCsp,
      hasXFrame,
      hasNosniff,
    },
    meta: {
      title,
      titleLength: title.length,
      metaDescription,
      metaDescriptionLength: metaDescription.length,
      canonicalUrl,
      h1Count: h1Texts.length,
      h1s: h1Texts,
    },
    findings,
    webAuditsUrl,
  };
}
