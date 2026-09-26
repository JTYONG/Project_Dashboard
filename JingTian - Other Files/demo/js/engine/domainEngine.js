/**
 * Module 14 (Health Domain Analysis Module).
 * Groups individual findings into interpretable domains rather than
 * presenting a flat list of test results.
 */
window.MHR = window.MHR || {};

MHR.domainStatusFromSeverity = function (sev) {
  if (sev >= 4) return { label: "Medical Review", tone: "critical" };
  if (sev === 3) return { label: "Higher Priority", tone: "bad" };
  if (sev >= 1) return { label: "Needs Attention", tone: "warn" };
  return { label: "Within Expected Range", tone: "good" };
};

MHR.runDomainEngine = function (findings) {
  var byDomain = {};
  findings.forEach(function (f) {
    if (!byDomain[f.domain]) byDomain[f.domain] = [];
    byDomain[f.domain].push(f);
  });
  return Object.keys(byDomain).map(function (domain) {
    var items = byDomain[domain];
    var maxSev = items.reduce(function (m, f) { return Math.max(m, f.severity); }, 0);
    return {
      domain: domain,
      items: items,
      maxSeverity: maxSev,
      status: MHR.domainStatusFromSeverity(maxSev),
    };
  }).sort(function (a, b) { return b.maxSeverity - a.maxSeverity; });
};
