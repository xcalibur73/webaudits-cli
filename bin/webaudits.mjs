#!/usr/bin/env node

/**
 * WebAudits CLI : Executable Binary
 * Unthrottled Core Web Vitals, TTFB, and Schema Diagnostic Tool
 *
 * Usage:
 *   npx webaudits <url>
 *   npx webaudits <url> --json
 *   npx webaudits --help
 *
 * Copyright (c) 2026 Sadikeen Firoz <sfs@webaudits.pro>
 * License: MIT
 */

import { auditUrl } from '../index.js';

const args = process.argv.slice(2);

// Handle help
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.log(`
WebAudits CLI : Unthrottled Core Web Vitals & SEO Diagnostic Tool

Usage:
  npx webaudits <url> [options]
  webaudits <url> [options]

Options:
  --json          Output raw JSON result
  --full          Display detailed headers and raw findings
  --timeout <ms>  Request timeout in milliseconds (default: 15000)
  -v, --version   Show CLI version
  -h, --help      Display this help message

Examples:
  npx webaudits https://webaudits.pro
  npx webaudits example.com --json
  npx webaudits https://stripe.com --full

Full white-label audits and two-stage verification:
  https://webaudits.pro
`);
  process.exit(0);
}

// Handle version
if (args.includes('--version') || args.includes('-v')) {
  console.log('webaudits v1.0.0');
  process.exit(0);
}

// Extract flags
const isJson = args.includes('--json');
const isFull = args.includes('--full');
let timeoutMs = 15000;

const timeoutIdx = args.indexOf('--timeout');
if (timeoutIdx !== -1 && args[timeoutIdx + 1]) {
  timeoutMs = parseInt(args[timeoutIdx + 1], 10) || 15000;
}

const targetUrl = args.find((arg) => !arg.startsWith('-'));
if (!targetUrl) {
  console.error('Error: Please provide a target URL to audit (e.g. npx webaudits https://example.com)');
  process.exit(1);
}

// ANSI Color Helpers
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

async function main() {
  if (!isJson) {
    process.stdout.write(`\n${c.cyan}${c.bold}Connecting to ${targetUrl}...${c.reset}\r`);
  }

  try {
    const result = await auditUrl(targetUrl, { timeoutMs });

    if (isJson) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    // Clear loading line
    process.stdout.write(' '.repeat(60) + '\r');

    // Terminal Banner
    console.log(`${c.dim}──────────────────────────────────────────────────────────────────────────────${c.reset}`);
    console.log(`${c.bold}${c.white} WebAudits CLI : Forensic Performance & Schema Audit${c.reset}`);
    console.log(`${c.dim} Target: ${c.reset}${c.cyan}${result.url}${c.reset}`);
    console.log(`${c.dim}──────────────────────────────────────────────────────────────────────────────${c.reset}\n`);

    // Grade and Score Badge
    let gradeBadge = `${c.bgGreen}${c.bold} ${result.grade} ${c.reset}`;
    if (result.grade === 'B') gradeBadge = `${c.bgYellow}${c.bold} ${result.grade} ${c.reset}`;
    if (['C', 'D', 'F'].includes(result.grade)) gradeBadge = `${c.bgRed}${c.bold} ${result.grade} ${c.reset}`;

    console.log(`  ${c.bold}Overall Health:${c.reset}  ${gradeBadge}  ${c.bold}${result.score}/100${c.reset}  ${c.dim}(HTTP ${result.status})${c.reset}\n`);

    // Telemetry Grid
    const ttfbColor = result.metrics.ttfbMs <= 200 ? c.green : result.metrics.ttfbMs <= 800 ? c.yellow : c.red;
    const compColor = result.metrics.contentEncoding !== 'none' ? c.green : c.red;
    const schemaColor = result.metrics.schemaCount > 0 ? c.green : c.yellow;
    const llmsColor = result.metrics.hasLlmsTxt ? c.green : c.dim;

    console.log(`  ${c.bold}CORE TELEMETRY METRICS:${c.reset}`);
    console.log(`  - Server TTFB:        ${ttfbColor}${result.metrics.ttfbMs} ms${c.reset} ${c.dim}(target < 200ms, Google budget: 800ms)${c.reset}`);
    console.log(`  - Edge Network:       ${c.white}${result.metrics.detectedCdn}${c.reset}`);
    console.log(`  - Compression:        ${compColor}${result.metrics.contentEncoding}${c.reset} ${c.dim}(${result.metrics.htmlKb} KB transfer)${c.reset}`);
    console.log(`  - Schema.org Graphs:  ${schemaColor}${result.metrics.schemaCount} entities${c.reset} ${c.dim}(${result.metrics.schemas.slice(0, 3).join(', ') || 'none'})${c.reset}`);
    console.log(`  - AI Discovery:       ${llmsColor}${result.metrics.hasLlmsTxt ? 'Active (/llms.txt found)' : 'None (/llms.txt missing)'}${c.reset}`);
    console.log(`  - Transport Security: ${result.metrics.hasHsts ? c.green + 'HSTS Active' : c.yellow + 'HSTS Missing'}${c.reset}\n`);

    // On-Page Diagnostics
    console.log(`  ${c.bold}ON-PAGE DIAGNOSTICS:${c.reset}`);
    const titleLen = result.meta.titleLength;
    const titleStatus = titleLen >= 50 && titleLen <= 60 ? c.green : c.yellow;
    console.log(`  - Title (${titleStatus}${titleLen} chars${c.reset}):   "${result.meta.title || c.red + 'Missing' + c.reset}"`);
    console.log(`  - Description:       "${result.meta.metaDescription ? result.meta.metaDescription.slice(0, 75) + '...' : c.red + 'Missing' + c.reset}"`);
    console.log(`  - Primary H1:        "${result.meta.h1s[0] || c.red + 'Missing' + c.reset}"`);
    console.log(`  - Head Scripts:      ${result.metrics.syncScriptsInHead} render-blocking candidates\n`);

    // Findings List
    console.log(`  ${c.bold}AUDIT FINDINGS:${c.reset}`);
    for (const f of result.findings) {
      let icon = `${c.green}[PASS]${c.reset}`;
      if (f.severity === 'notice') icon = `${c.yellow}[NOTE]${c.reset}`;
      if (f.severity === 'warning') icon = `${c.red}[WARN]${c.reset}`;
      console.log(`  ${icon} ${c.bold}${f.label}:${c.reset} ${f.detail}`);
    }

    if (isFull) {
      console.log(`\n  ${c.bold}RAW SECURITY HEADERS:${c.reset}`);
      console.log(`  - CSP:               ${result.metrics.hasCsp ? 'Configured' : 'None'}`);
      console.log(`  - X-Frame-Options:   ${result.metrics.hasXFrame ? 'DENY / SAMEORIGIN' : 'None'}`);
      console.log(`  - X-Content-Type:    ${result.metrics.hasNosniff ? 'nosniff' : 'None'}`);
    }

    // Call to action & White-Label link
    console.log(`\n${c.dim}──────────────────────────────────────────────────────────────────────────────${c.reset}`);
    console.log(`  ${c.bold}Full Forensic Teardown & Two-Stage Verification:${c.reset}`);
    console.log(`  ${c.cyan}${c.bold}${result.webAuditsUrl}${c.reset}`);
    console.log(`${c.dim}──────────────────────────────────────────────────────────────────────────────${c.reset}\n`);

  } catch (err) {
    if (isJson) {
      console.error(JSON.stringify({ error: err.message }, null, 2));
    } else {
      console.error(`\n${c.red}${c.bold}Error:${c.reset} ${err.message}\n`);
    }
    process.exit(1);
  }
}

main();
