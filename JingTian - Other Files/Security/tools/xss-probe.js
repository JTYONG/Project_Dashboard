#!/usr/bin/env node
/**
 * Regression probe for finding MHR-001 (unescaped values in the report DOM).
 *
 *   cd "Phase i/demo" && npm i -D playwright && npx playwright install chromium
 *   node ../../Security/tools/xss-probe.js
 *
 * Serves the Phase 1 demo, poisons the lab dictionary with a payload the way
 * an OCR'd lab name eventually could, walks the sample-patient flow to the
 * generated report, and checks whether the payload was PARSED as HTML rather
 * than shown as text.
 *
 * Exit 0 = payload rendered inert (escaped). Exit 1 = injection succeeded.
 *
 * Mirrors the local static server in Phase i/demo/test/smoke.js.
 */
"use strict";

const path = require("path");
const http = require("http");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "../../Phase i/demo");
const PORT = 8935;
const PAYLOAD = '<img src=x onerror="console.log(\'MHR-XSS-EXECUTED\')">';

function contentType(f) {
  if (f.endsWith(".html")) return "text/html";
  if (f.endsWith(".css")) return "text/css";
  if (f.endsWith(".js")) return "application/javascript";
  return "application/octet-stream";
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split("?")[0]);
      // Note: resolved and bounds-checked, unlike test/smoke.js — see MHR-004.
      let filePath = path.resolve(ROOT, "." + (rel === "/" ? "/index.html" : rel));
      if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end("forbidden"); return; }
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end("not found"); return; }
        let body = data;
        // Poison the first analyte name, as an OCR'd lab name could.
        if (filePath.endsWith("labDictionary.js")) {
          body = Buffer.from(
            data.toString("utf8").replace(/name:\s*"([^"]*)"/, 'name: ' + JSON.stringify(PAYLOAD)),
            "utf8"
          );
        }
        res.writeHead(200, { "Content-Type": contentType(filePath) });
        res.end(body);
      });
    });
    server.listen(PORT, () => resolve(server));
  });
}

(async () => {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch (e) {
    console.error("playwright not installed. From Phase i/demo:");
    console.error("  npm i -D playwright && npx playwright install chromium");
    process.exit(2);
  }

  const server = await startServer();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let executed = false;
  page.on("console", (m) => { if (m.text().includes("MHR-XSS-EXECUTED")) executed = true; });
  page.on("dialog", async (d) => { executed = true; await d.dismiss(); });

  await page.goto("http://localhost:" + PORT + "/", { waitUntil: "networkidle" });
  await page.click("#btnSampleRoutine");

  // Walk the wizard to the report.
  for (let i = 0; i < 6; i++) {
    const next = page.locator("section:visible [data-next]").first();
    if (await next.count()) { await next.click(); await page.waitForTimeout(120); }
  }
  for (const id of ["#btnRunEngine", "#btnGenerateReport"]) {
    const b = page.locator(id);
    if (await b.isVisible().catch(() => false)) { await b.click(); await page.waitForTimeout(200); }
  }

  const parsed = await page.locator('img[src="x"]').count();
  const escapedText = (await page.locator("body").innerText()).includes("<img src=x");

  await browser.close();
  server.close();

  console.log("payload parsed as HTML : " + (parsed > 0));
  console.log("handler executed       : " + executed);
  console.log("payload shown as text  : " + escapedText);

  if (parsed > 0 || executed) {
    console.log("\nFAIL — MHR-001 is live: untrusted text reaches the report DOM unescaped.");
    process.exit(1);
  }
  console.log("\nPASS — payload rendered inert.");
  process.exit(0);
})();
