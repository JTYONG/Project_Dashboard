/* SQUARE Prototype1_Version2 — Playwright smoke test.
 * Walks both sample scenarios (routine, urgent) through every screen,
 * asserts zero console errors, and takes a screenshot of each screen for
 * visual QA. Run: node test/smoke.js
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const SHOT_DIR = path.join(__dirname, "screenshots");
const URL = "file://" + path.join(ROOT, "index.html");

const ROUTES_AFTER_SEED = [
  "dashboard", "reports", "upload", "domain/cardiovascular", "domain/cardiovascular/results",
  "domain/cardiovascular/how", "domain/cardiovascular/modifiers", "domain/cardiovascular/recs",
  "domain/cardiovascular/education", "domain/metabolic", "domain/metabolic/results",
  "domain/liver", "domain/renal", "domain/haematology", "domain/anthropometric",
  "results/LAB_LDL", "results/LAB_APOB", "action-plan", "referral", "report", "trends",
  "profile", "settings",
];

async function run() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  let totalErrors = 0;
  let shotIndex = 0;

  for (const scenario of ["routine", "urgent"]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
    page.on("pageerror", (err) => errors.push("pageerror: " + err.message));

    await page.goto(URL);
    await page.waitForSelector(".auth-hero");
    await shoot(page, `${scenario}-01-welcome`);

    // Full journey via the auth-card demo shortcut.
    await page.click(scenario === "routine" ? "text=Load a routine sample report" : "text=Load an urgent-pathway sample");
    await page.waitForTimeout(400);
    await shoot(page, `${scenario}-02-analysis-summary`);

    for (const route of ROUTES_AFTER_SEED) {
      await page.evaluate((r) => { location.hash = "#/" + r; }, route);
      await page.waitForTimeout(150);
      await shoot(page, `${scenario}-${slug(route)}`);
    }

    // Exercise the manual upload → verify → questions → analysis pipeline once (routine only).
    if (scenario === "routine") {
      await page.evaluate(() => { SQ.store.reset(); });
      await page.evaluate(() => { location.hash = "#/welcome"; });
      await page.waitForTimeout(150);
      await page.click("text=Get started free");
      await page.waitForTimeout(150);
      await page.fill("#reg-name", "QA Tester");
      await page.fill("#reg-email", "qa@example.com");
      await page.fill("#reg-pw", "password123");
      await page.click("button:has-text('Continue')");
      await page.waitForTimeout(150);
      await shoot(page, "flow-terms");
      await page.check("#tc-agree");
      await page.click("text=Continue to Consent");
      await page.waitForTimeout(150);
      await shoot(page, "flow-consent-before");
      // .toggle inputs are visually hidden (0x0, custom switch styling) — drive them
      // via evaluate + a real change event rather than Playwright's pointer interaction.
      await page.evaluate(() => {
        document.querySelectorAll(".consent-item .toggle input").forEach((el) => {
          el.checked = true;
          el.dispatchEvent(new Event("change", { bubbles: true }));
        });
      });
      await page.click("text=Continue to SQUARE");
      await page.waitForTimeout(150);
      await shoot(page, "flow-dashboard-empty");
      await page.click("text=Upload a report");
      await page.waitForTimeout(150);
      await page.click("text=Use a routine sample instead");
      await page.waitForTimeout(150);
      await shoot(page, "flow-verify");
      await page.click("text=Confirm & continue");
      await page.waitForTimeout(150);
      await shoot(page, "flow-questions");
      await page.click("text=Continue to analysis");
      await page.waitForTimeout(1600);
      await shoot(page, "flow-analysis-summary");
    }

    if (errors.length) {
      console.log(`\n[${scenario}] console/page errors (${errors.length}):`);
      errors.forEach((e) => console.log("  - " + e));
      totalErrors += errors.length;
    } else {
      console.log(`[${scenario}] no console/page errors across ${ROUTES_AFTER_SEED.length + 2} screens.`);
    }
    await page.close();
  }

  await browser.close();
  console.log(`\nScreenshots saved to ${SHOT_DIR} (${shotIndex} total).`);
  if (totalErrors > 0) { console.log(`\nFAIL: ${totalErrors} error(s) found.`); process.exit(1); }
  console.log("\nPASS: smoke test clean.");

  async function shoot(page, name) {
    shotIndex++;
    await page.screenshot({ path: path.join(SHOT_DIR, name + ".png") });
  }
}

function slug(route) { return route.replace(/\//g, "-"); }

run().catch((e) => { console.error(e); process.exit(1); });
