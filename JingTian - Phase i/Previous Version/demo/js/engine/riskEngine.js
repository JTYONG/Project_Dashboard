/**
 * Module 12 (Risk Stratification Engine).
 * Deliberately simple additive score for demo purposes -- NOT a validated
 * calculator (not Framingham/ASCVD/etc.). It exists to show that risk is
 * computed separately from single-marker classification, combining
 * demographics + history + multiple findings, per the framework's
 * "classification != risk" principle.
 */
window.MHR = window.MHR || {};

MHR.runRiskEngine = function (state, findings) {
  function sevOf(code) {
    var f = findings.find(function (x) { return x.code === code; });
    return f ? f.severity : 0;
  }
  function cap(v, max) { return Math.min(v, max); }

  var points = 0;
  var factors = [];

  var age = state.demographics && state.demographics.age;
  if (age >= 60) { points += 2; factors.push("Age 60+"); }
  else if (age >= 45) { points += 1; factors.push("Age 45-59"); }

  if (state.history && state.history.smoking === "YES") { points += 2; factors.push("Current smoking"); }
  if (state.history && state.history.familyCVD === "YES") { points += 1; factors.push("Family history of early heart disease"); }

  var bpSev = cap(Math.max(sevOf("SBP"), sevOf("DBP")), 3);
  if (bpSev > 0) { points += bpSev; factors.push("Elevated blood pressure"); }

  var glySev = cap(Math.max(sevOf("LAB_HBA1C"), sevOf("LAB_GLU_FAST")), 2);
  if (glySev > 0) { points += glySev; factors.push("Elevated glucose / HbA1c"); }

  var lipSev = cap(Math.max(sevOf("LAB_LDL"), sevOf("LAB_TC"), sevOf("LAB_TG")), 2);
  if (lipSev > 0) { points += lipSev; factors.push("Elevated lipids"); }

  var bmiSev = cap(sevOf("BMI"), 2);
  if (bmiSev > 0) { points += bmiSev; factors.push("Elevated BMI"); }

  var band = "Low";
  if (points > 6) band = "High";
  else if (points >= 3) band = "Moderate";

  return { score: points, band: band, factors: factors };
};
