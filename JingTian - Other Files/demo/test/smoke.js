// Functional smoke test: serves the demo, walks both sample flows through
// to the final report, and fails on any console error or missing content.
const { chromium } = require("playwright");
const path = require("path");
const http = require("http");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const PORT = 8934;

function contentType(file) {
  if (file.endsWith(".html")) return "text/html";
  if (file.endsWith(".css")) return "text/css";
  if (file.endsWith(".js")) return "application/javascript";
  return "application/octet-stream";
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
      if (req.url === "/") filePath = path.join(ROOT, "index.html");
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end("not found: " + filePath); return; }
        res.writeHead(200, { "Content-Type": contentType(filePath) });
        res.end(data);
      });
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function run() {
  const server = await startServer();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push("console.error: " + msg.text()); });

  async function testFlow(sampleBtnId, expectPathwaySubstring, expectSuppressedRecs) {
    await page.goto(`http://localhost:${PORT}/index.html`);
    await page.click("#" + sampleBtnId);
    await page.waitForSelector("#f_age");
    const age = await page.inputValue("#f_age");
    if (!age) throw new Error(`[${sampleBtnId}] demographics not populated`);

    await page.click("[data-step='demographics'] [data-next]");
    await page.waitForSelector("#f_height");
    const height = await page.inputValue("#f_height");
    if (!height) throw new Error(`[${sampleBtnId}] anthro not populated`);

    await page.click("[data-step='anthro'] [data-next]");
    await page.waitForSelector("#historyGrid select");

    await page.click("[data-step='history'] [data-next]");
    await page.waitForSelector("#labTable input");
    const labVal = await page.inputValue("#lab_LAB_HBA1C");
    if (!labVal) throw new Error(`[${sampleBtnId}] labs not populated`);

    await page.click("#btnRunEngine");
    await page.waitForSelector("#triggerList");
    const triggerHtml = await page.innerHTML("#triggerList");
    if (triggerHtml.trim().length === 0) throw new Error(`[${sampleBtnId}] no trigger content rendered`);

    await page.click("#btnGenerateReport");
    await page.waitForSelector(".pathway-banner");
    const bannerText = await page.innerText(".pathway-banner");
    if (!bannerText.includes(expectPathwaySubstring)) {
      throw new Error(`[${sampleBtnId}] expected pathway containing "${expectPathwaySubstring}", got "${bannerText}"`);
    }
    const reportHtml = await page.innerHTML("#reportRoot");
    const hasRecSection = reportHtml.includes("rec-card");
    if (expectSuppressedRecs && hasRecSection) {
      throw new Error(`[${sampleBtnId}] expected recommendations suppressed but rec-card found`);
    }
    if (!expectSuppressedRecs && !hasRecSection) {
      throw new Error(`[${sampleBtnId}] expected recommendation cards but none found`);
    }
    if (!reportHtml.includes("Rule Engine")) {
      throw new Error(`[${sampleBtnId}] version footer missing`);
    }
    console.log(`OK: ${sampleBtnId} -> pathway="${bannerText.split("\n")[0]}" recCards=${hasRecSection}`);
  }

  try {
    await testFlow("btnSampleRoutine", "Routine Wellness Pathway", false);
    await testFlow("btnSampleUrgent", "Urgent Medical Assessment", true);

    // Also test the print button doesn't throw, and Back navigation works.
    await page.goto(`http://localhost:${PORT}/index.html`);
    await page.click("#btnStart");
    await page.fill("#f_age", "40");
    await page.selectOption("#f_sex", "F");
    await page.click("[data-step='demographics'] [data-next]");
    await page.click("[data-step='anthro'] [data-back]");
    const ageAfterBack = await page.inputValue("#f_age");
    if (ageAfterBack !== "40") throw new Error("Back navigation lost demographics state");
    console.log("OK: manual entry + back navigation preserves state");

    if (errors.length) {
      console.error("Console/page errors detected:\n" + errors.join("\n"));
      process.exitCode = 1;
    } else {
      console.log("ALL SMOKE TESTS PASSED, NO CONSOLE ERRORS");
    }
  } catch (e) {
    console.error("SMOKE TEST FAILURE:", e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
}

run();
