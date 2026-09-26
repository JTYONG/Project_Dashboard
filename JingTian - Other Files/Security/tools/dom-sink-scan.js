#!/usr/bin/env node
/**
 * MyHealthReport — dependency-free security scan for the front end.
 *
 *   node Security/tools/dom-sink-scan.js "Phase i/demo"
 *
 * Deliberately has no dependencies so it runs on a laptop, in CI, and inside
 * a sandbox with no network. It is a lint, not a proof: it flags patterns
 * that become vulnerabilities the moment untrusted content (an OCR'd lab
 * name, a free-text note, a filename) reaches them. Triage the output against
 * real code paths — see Security/agent/RUNBOOK.md step 2.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const TARGET = process.argv[2] || ".";
const EXT = new Set([".js", ".mjs", ".cjs", ".ts", ".html", ".htm"]);
const SKIP_DIR = new Set(["node_modules", ".git", "dist", "build", "evidence"]);

const RULES = [
  {
    id: "MHR-SINK-HTML",
    sev: "HIGH",
    re: /\.(innerHTML|outerHTML)\s*=(?!\s*(""|''|``)\s*;?\s*$)/,
    why: "HTML sink assigned a non-empty value. Anything interpolated here is unescaped by construction.",
    fix: "Use textContent, or route every interpolated value through one escapeHtml() helper.",
  },
  {
    id: "MHR-SINK-INSERT",
    sev: "HIGH",
    re: /insertAdjacentHTML\s*\(|document\.write\s*\(/,
    why: "HTML sink taking a string.",
    fix: "Build nodes, or escape every interpolated value.",
  },
  {
    id: "MHR-HTML-ACCUM",
    sev: "HIGH",
    re: /\w+\s*\+=\s*["'`]<[a-zA-Z/][^\n]*["'`]\s*\+/,
    why: "HTML markup accumulated into a string variable — the classic unescaped-report pattern.",
    fix: "Escape at every interpolation point, or build the report as nodes.",
  },
  {
    id: "MHR-TEMPLATE-HTML",
    sev: "MEDIUM",
    re: /`[^`]*<[a-zA-Z][^`]*\$\{[^}]+\}/,
    why: "Template literal with HTML tags interpolates a value directly.",
    fix: "Escape the interpolated value.",
  },
  {
    id: "MHR-WEAK-ID",
    sev: "HIGH",
    re: /(user_?id|report_?id|token|session_?id|nonce|secret|key)\s*[:=][^;\n]{0,80}Math\.random/i,
    why: "Predictable identifier. Math.random() is not a source of unguessable values.",
    fix: "crypto.randomUUID() or crypto.getRandomValues().",
  },
  {
    id: "MHR-PHI-STORAGE",
    sev: "HIGH",
    re: /(localStorage|sessionStorage)\s*(\.setItem\s*\(|\[|\.\w+\s*=)/,
    why: "Browser storage is readable by any script on the origin, survives logout, and is not encrypted. Health data does not belong there.",
    fix: "Keep patient data server-side, or in memory for the session only.",
  },
  {
    id: "MHR-EVAL",
    sev: "HIGH",
    re: /\beval\s*\(|new\s+Function\s*\(|setTimeout\s*\(\s*["'`]/,
    why: "Dynamic code execution.",
    fix: "Remove it.",
  },
  {
    id: "MHR-PATH-TRAVERSAL",
    sev: "HIGH",
    re: /path\.join\s*\([^)]*(decodeURIComponent|req\.url|req\.params|request\.url)/,
    why: "Request-controlled path joined to a filesystem root. '../' escapes the root.",
    fix: "path.resolve() then verify the result still startsWith the root before reading.",
  },
  {
    id: "MHR-PHI-LOG",
    sev: "MEDIUM",
    re: /console\.\w+\s*\(\s*(state|report|patient|labResults|findings|demographics|answers)\b/,
    why: "Logging a whole patient/report object. Logs land in places with weaker access control than the database.",
    fix: "Log identifiers, not values.",
  },
  {
    id: "MHR-INLINE-HANDLER",
    sev: "MEDIUM",
    re: /<[a-zA-Z][^>]*\son(click|error|load|mouseover)\s*=/,
    why: "Inline event handler — blocks a strict Content-Security-Policy.",
    fix: "addEventListener.",
  },
];

const findings = [];

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    console.error("cannot read " + dir + ": " + e.message);
    process.exit(2);
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIR.has(e.name)) walk(full);
    } else if (EXT.has(path.extname(e.name).toLowerCase())) {
      scan(full);
    }
  }
}

function scan(file) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);

  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|#)/.test(line)) return; // comments
    for (const r of RULES) {
      if (r.re.test(line)) {
        findings.push({
          file, line: i + 1, id: r.id, sev: r.sev,
          why: r.why, fix: r.fix, code: line.trim().slice(0, 110),
        });
      }
    }
  });

  // File-level checks
  if (/\.html?$/i.test(file)) {
    if (!/Content-Security-Policy/i.test(text)) {
      findings.push({
        file, line: 1, id: "MHR-NO-CSP", sev: "MEDIUM",
        why: "No Content-Security-Policy. A CSP is the cheapest mitigation for the HTML-sink findings above.",
        fix: "Add a meta CSP now; move it to a response header when a server exists.",
        code: "<head> has no CSP meta tag",
      });
    }
  }
}

walk(TARGET);

const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
findings.sort((a, b) => order[a.sev] - order[b.sev] || a.id.localeCompare(b.id) || a.file.localeCompare(b.file) || a.line - b.line);

console.log("MyHealthReport DOM/front-end security scan");
console.log("target: " + TARGET + "   " + new Date().toISOString());
console.log("=".repeat(72));

if (findings.length === 0) {
  console.log("\nNo patterns flagged.\n");
  process.exit(0);
}

let last = null;
for (const f of findings) {
  if (f.id !== last) {
    console.log("\n[" + f.sev + "] " + f.id);
    console.log("  " + f.why);
    console.log("  fix: " + f.fix);
    last = f.id;
  }
  console.log("    " + f.file + ":" + f.line + "  " + f.code);
}

const high = findings.filter((f) => f.sev === "HIGH").length;
console.log("\n" + "=".repeat(72));
console.log(findings.length + " finding(s), " + high + " high.");
console.log("Not all are exploitable today — triage per Security/agent/RUNBOOK.md step 2.");

process.exit(high > 0 ? 1 : 0);
