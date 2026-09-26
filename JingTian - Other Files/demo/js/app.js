/**
 * UI orchestrator (Layer 1 -- User Experience). Talks to the engine modules
 * only through their public functions; contains no medical thresholds
 * itself.
 */
(function () {
  "use strict";

  var STEPS = ["welcome", "demographics", "anthro", "history", "labs", "triggers", "report"];
  var stepIndex = 0;

  var HISTORY_QUESTIONS = [
    { key: "smoking", label: "Current smoker?" },
    { key: "familyCVD", label: "Family history of early heart disease?" },
    { key: "familyDiabetes", label: "Family history of diabetes?" },
    { key: "stress", label: "High stress level currently?" },
    { key: "priorHTN", label: "Previously diagnosed with hypertension?" },
    { key: "priorDM", label: "Previously diagnosed with diabetes?" },
  ];

  function freshState() {
    return {
      userId: "DEMO-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      demographics: { age: null, sex: "M" },
      anthro: { height: null, weight: null, waist: null, sbp: null, dbp: null, hr: null },
      history: {},
      labResults: {},
      answers: {},
    };
  }

  var state = freshState();

  // ---------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------
  function showStep(name) {
    stepIndex = STEPS.indexOf(name);
    document.querySelectorAll(".step").forEach(function (el) {
      el.hidden = el.getAttribute("data-step") !== name;
    });
    document.getElementById("stepper").textContent =
      name === "welcome" ? "" : "Step " + stepIndex + " of " + (STEPS.length - 1);
    window.scrollTo(0, 0);
    if (name === "demographics") {
      document.getElementById("f_age").value = state.demographics.age || "";
      document.getElementById("f_sex").value = state.demographics.sex || "M";
    }
    if (name === "anthro") {
      ["height", "weight", "waist", "sbp", "dbp", "hr"].forEach(function (k) {
        document.getElementById("f_" + k).value = state.anthro[k] || "";
      });
    }
    if (name === "history") renderHistoryStep();
    if (name === "labs") renderLabsStep();
    if (name === "triggers") renderTriggersStep();
    if (name === "report") renderReportStep();
  }

  document.querySelectorAll("[data-next]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      collectCurrentStep();
      showStep(STEPS[stepIndex + 1]);
    });
  });
  document.querySelectorAll("[data-back]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      collectCurrentStep();
      showStep(STEPS[Math.max(0, stepIndex - 1)]);
    });
  });

  function collectCurrentStep() {
    var name = STEPS[stepIndex];
    if (name === "demographics") {
      state.demographics.age = parseInt(document.getElementById("f_age").value, 10) || null;
      state.demographics.sex = document.getElementById("f_sex").value;
    }
    if (name === "anthro") {
      ["height", "weight", "waist", "sbp", "dbp", "hr"].forEach(function (k) {
        var el = document.getElementById("f_" + k);
        state.anthro[k] = el.value === "" ? null : parseFloat(el.value);
      });
    }
    if (name === "history") {
      HISTORY_QUESTIONS.forEach(function (q) {
        var el = document.getElementById("h_" + q.key);
        if (el) state.history[q.key] = el.value;
      });
    }
    if (name === "labs") {
      MHR.labDictionary.forEach(function (t) {
        var el = document.getElementById("lab_" + t.code);
        state.labResults[t.code] = el.value === "" ? "" : el.value;
      });
    }
    if (name === "triggers") {
      document.querySelectorAll("#triggerList select[data-qkey]").forEach(function (el) {
        state.answers[el.getAttribute("data-qkey")] = el.value;
      });
    }
  }

  // ---------------------------------------------------------------
  // Step renderers
  // ---------------------------------------------------------------
  function renderHistoryStep() {
    var grid = document.getElementById("historyGrid");
    grid.innerHTML = "";
    HISTORY_QUESTIONS.forEach(function (q) {
      var label = document.createElement("div");
      label.className = "q";
      label.textContent = q.label;
      var select = document.createElement("select");
      select.id = "h_" + q.key;
      ["UNKNOWN", "YES", "NO", "NOT APPLICABLE"].forEach(function (opt) {
        var o = document.createElement("option");
        o.value = opt === "NOT APPLICABLE" ? "N_A" : opt;
        o.textContent = opt;
        select.appendChild(o);
      });
      select.value = state.history[q.key] || "UNKNOWN";
      grid.appendChild(label);
      grid.appendChild(select);
    });
  }

  function renderLabsStep() {
    var tbody = document.querySelector("#labTable tbody");
    tbody.innerHTML = "";
    MHR.labDictionary.forEach(function (t) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + t.name + "</td>" +
        "<td><code>" + t.code + "</code></td>" +
        "<td><input type='number' step='0.1' id='lab_" + t.code + "' /></td>" +
        "<td>" + t.unit + "</td>";
      tbody.appendChild(tr);
      var input = tr.querySelector("input");
      input.value = state.labResults[t.code] || "";
    });
  }

  function renderTriggersStep() {
    var findings = MHR.runRuleEngine(state);
    var overallSeverity = findings.reduce(function (m, f) { return Math.max(m, f.severity); }, 0);
    var fh = MHR.buildFindingsHelper(findings, state, overallSeverity);
    var triggers = MHR.runQuestionEngine(fh);
    var container = document.getElementById("triggerList");
    container.innerHTML = "";

    if (triggers.length === 0) {
      container.innerHTML = "<p class='hint'>No findings activated a targeted question set -- nothing further to ask.</p>";
      return;
    }

    triggers.forEach(function (trig) {
      var block = document.createElement("div");
      block.className = "trigger-block";
      var h3 = document.createElement("h3");
      h3.textContent = "Triggered by: " + trig.label;
      block.appendChild(h3);
      trig.questions.forEach(function (q, i) {
        var qkey = trig.id + "_" + i;
        var row = document.createElement("div");
        row.className = "q-row";
        var qEl = document.createElement("div");
        qEl.textContent = q;
        var select = document.createElement("select");
        select.setAttribute("data-qkey", qkey);
        ["UNKNOWN", "YES", "NO", "NOT APPLICABLE"].forEach(function (opt) {
          var o = document.createElement("option");
          o.value = opt === "NOT APPLICABLE" ? "N_A" : opt;
          o.textContent = opt;
          select.appendChild(o);
        });
        select.value = state.answers[qkey] || "UNKNOWN";
        row.appendChild(qEl);
        row.appendChild(select);
        block.appendChild(row);
      });
      container.appendChild(block);
    });
  }

  function toneClass(tone) { return "tone-" + tone; }

  function renderReportStep() {
    var report = MHR.generateReport(state);
    var root = document.getElementById("reportRoot");

    var html = "";

    // Pathway banner (safety-first)
    html += "<div class='pathway-banner " + toneClass(report.redFlag.pathway.tone) + "'>" +
      report.redFlag.pathway.label +
      "<div class='sub'>" + pathwayExplainer(report.redFlag) + "</div></div>";

    // Section 1: Health Snapshot
    html += "<div class='report-section'><h2>1. Health Snapshot</h2><div class='snapshot-grid'>";
    html += snapTile("Age / Sex", (report.demographics.age || "—") + " / " + (report.demographics.sex || "—"));
    var bmiF = report.findings.find(function (f) { return f.code === "BMI"; });
    html += snapTile("BMI", bmiF ? bmiF.value + " (" + bmiF.classification + ")" : "—");
    var bpS = report.findings.find(function (f) { return f.code === "SBP"; });
    var bpD = report.findings.find(function (f) { return f.code === "DBP"; });
    html += snapTile("Blood Pressure", (bpS ? bpS.value : "—") + "/" + (bpD ? bpD.value : "—") + " mmHg");
    html += snapTile("Cardiovascular Risk (demo score)", report.risk.band + " (" + report.risk.score + " pts)");
    html += "</div></div>";

    // Section 2: Health Domains
    html += "<div class='report-section'><h2>2. Health Domains</h2>";
    if (report.domains.length === 0) {
      html += "<p class='hint'>No lab results were entered.</p>";
    }
    report.domains.forEach(function (d) {
      html += "<div class='domain-row'><span>" + d.domain + "</span>" +
        "<span class='pill " + toneClass(d.status.tone) + "'>" + d.status.label + "</span></div>";
    });
    html += "</div>";

    // Section 3: Laboratory & Anthropometric Findings
    html += "<div class='report-section'><h2>3. Detailed Findings</h2>";
    if (report.findings.length === 0) {
      html += "<p class='hint'>No findings recorded.</p>";
    }
    report.findings
      .slice()
      .sort(function (a, b) { return b.severity - a.severity; })
      .forEach(function (f) {
        html += "<div class='finding-row'><div><div class='name'>" + f.name + "</div>" +
          "<div class='meta'>" + f.value + " " + f.unit + "</div></div>" +
          "<span class='pill " + toneClass(severityTone(f.severity)) + "'>" + f.classification + "</span></div>";
      });
    html += "</div>";

    // Section 4: Recommendations (suppressed on Prompt/Urgent pathways)
    if (report.redFlag.pathway.key === "PROMPT" || report.redFlag.pathway.key === "URGENT") {
      html += "<div class='report-section'><h2>4. Recommendations</h2>" +
        "<p class='hint'>Routine wellness recommendations are suppressed on this pathway. Please see a healthcare " +
        "professional for the finding(s) above before any lifestyle plan is started.</p></div>";
    } else {
      html += "<div class='report-section'><h2>4. Top Priorities</h2>";
      if (report.recommendations.top.length === 0) {
        html += "<p class='hint'>No specific priorities identified.</p>";
      }
      report.recommendations.top.forEach(function (r) { html += recCard(r, false); });
      html += "</div>";

      if (report.recommendations.secondary.length > 0) {
        html += "<div class='report-section'><h2>5. Secondary Recommendations</h2>";
        report.recommendations.secondary.forEach(function (r) { html += recCard(r, true); });
        html += "</div>";
      }
    }

    // Section: Monitoring / Follow-up
    html += "<div class='report-section'><h2>Monitoring Plan</h2><ul>";
    report.recommendations.top.concat(report.recommendations.secondary).forEach(function (r) {
      html += "<li>" + r.followUp + "</li>";
    });
    if (report.recommendations.top.length === 0 && report.recommendations.secondary.length === 0) {
      html += "<li>Repeat a general health panel in 12 months, or sooner if symptomatic.</li>";
    }
    html += "</ul></div>";

    // Version / audit footer (Module 23/24 concept)
    html += "<div class='version-footer'>User: " + report.userId + " &middot; Generated: " + new Date(report.generatedAt).toLocaleString() +
      " &middot; Rule Engine " + report.versions.ruleEngine +
      " &middot; Reference Ranges " + report.versions.referenceRanges +
      " &middot; Risk Engine " + report.versions.riskEngine + "</div>";

    root.innerHTML = html;
  }

  function pathwayExplainer(redFlag) {
    if (redFlag.pathway.key === "ROUTINE") return "No finding met the medical-review threshold in this demo ruleset.";
    var names = redFlag.triggeredBy.map(function (f) { return f.name; }).join(", ");
    return "Triggered by: " + (names || "overall severity") + ". Wellness recommendations are suppressed on this pathway per the safety-override principle.";
  }

  function severityTone(sev) {
    if (sev >= 4) return "critical";
    if (sev === 3) return "bad";
    if (sev >= 1) return "warn";
    return "good";
  }

  function snapTile(k, v) {
    return "<div class='snap-tile'><div class='k'>" + k + "</div><div class='v'>" + v + "</div></div>";
  }

  function recCard(r, secondary) {
    return "<div class='rec-card" + (secondary ? " secondary" : "") + "'><h3>" + r.issue + " <code style='font-size:.7rem;color:#889'>" + r.code + "</code></h3>" +
      "<dl>" +
      "<dt>Recommendation</dt><dd>" + r.action + "</dd>" +
      "<dt>Why</dt><dd>" + r.why + "</dd>" +
      "<dt>Expected Benefit</dt><dd>" + r.benefit + "</dd>" +
      "<dt>Precaution</dt><dd>" + r.precaution + "</dd>" +
      "<dt>Follow-Up</dt><dd>" + r.followUp + "</dd>" +
      "</dl></div>";
  }

  // ---------------------------------------------------------------
  // Sample data
  // ---------------------------------------------------------------
  function loadSample(kind) {
    state = freshState();
    if (kind === "routine") {
      state.demographics = { age: 52, sex: "M" };
      state.anthro = { height: 175, weight: 83, waist: 96, sbp: 132, dbp: 85, hr: 76 };
      state.history = { smoking: "NO", familyCVD: "YES", familyDiabetes: "YES", stress: "YES", priorHTN: "NO", priorDM: "NO" };
      state.labResults = {
        LAB_GLU_FAST: "6.2", LAB_HBA1C: "6.1", LAB_TC: "5.8", LAB_LDL: "3.6",
        LAB_HDL: "1.1", LAB_TG: "2.0", LAB_ALT: "68", LAB_CREAT: "88", LAB_HB: "145",
      };
    } else {
      state.demographics = { age: 61, sex: "M" };
      state.anthro = { height: 170, weight: 90, waist: 104, sbp: 190, dbp: 125, hr: 92 };
      state.history = { smoking: "YES", familyCVD: "YES", familyDiabetes: "YES", stress: "YES", priorHTN: "YES", priorDM: "NO" };
      state.labResults = {
        LAB_GLU_FAST: "9.8", LAB_HBA1C: "11.2", LAB_TC: "7.1", LAB_LDL: "5.2",
        LAB_HDL: "0.9", LAB_TG: "3.1", LAB_ALT: "55", LAB_CREAT: "95", LAB_HB: "138",
      };
    }
    showStep("demographics");
  }

  // ---------------------------------------------------------------
  // Wire up static buttons
  // ---------------------------------------------------------------
  document.getElementById("btnStart").addEventListener("click", function () { state = freshState(); showStep("demographics"); });
  document.getElementById("btnSampleRoutine").addEventListener("click", function () { loadSample("routine"); });
  document.getElementById("btnSampleUrgent").addEventListener("click", function () { loadSample("urgent"); });
  document.getElementById("btnRunEngine").addEventListener("click", function () { collectCurrentStep(); showStep("triggers"); });
  document.getElementById("btnGenerateReport").addEventListener("click", function () { collectCurrentStep(); showStep("report"); });
  document.getElementById("btnPrint").addEventListener("click", function () { window.print(); });
  document.getElementById("btnRestart").addEventListener("click", function () { state = freshState(); showStep("welcome"); });

  showStep("welcome");
})();
