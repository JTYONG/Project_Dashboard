/* EVA SQUARE — thin fetch wrapper around the backend REST API. Same-origin
 * by default (the FastAPI backend serves this frontend as static files —
 * see backend/app/main.py), so no base URL or CORS setup is needed for the
 * local basis version. A deployed build only needs to change API_BASE.
 */
window.SQ = window.SQ || {};

(function () {
  "use strict";

  const API_BASE = ""; // same-origin; set to e.g. "https://api.example.com" for a split deployment
  const TOKEN_KEY = "eva_square_token";

  function getToken() { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }
  function setToken(t) { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ } }

  async function request(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    const token = getToken();
    if (token) headers["Authorization"] = "Bearer " + token;
    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + path, opts);
    if (!res.ok) {
      let detail = res.statusText;
      try { const j = await res.json(); detail = j.detail || detail; } catch (e) { /* non-JSON error body */ }
      const err = new Error(detail);
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async function upload(path, file) {
    const headers = {};
    const token = getToken();
    if (token) headers["Authorization"] = "Bearer " + token;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(API_BASE + path, { method: "POST", headers, body: fd });
    if (!res.ok) { const err = new Error(res.statusText); err.status = res.status; throw err; }
    return res.json();
  }

  const get = (path) => request("GET", path);
  const post = (path, body) => request("POST", path, body === undefined ? {} : body);
  const patch = (path, body) => request("PATCH", path, body);

  SQ.api = {
    getToken, setToken,
    // auth
    register: (fullName, email, password) => post("/api/auth/register", { fullName, email, password }),
    login: (email, password) => post("/api/auth/login", { email, password }),
    demoLogin: (scenario) => post(`/api/auth/demo-login/${scenario}`),
    logout: () => post("/api/auth/logout"),
    me: () => get("/api/auth/me"),
    // consent
    getConsent: () => get("/api/consent"),
    acceptTerms: () => post("/api/consent/accept-terms"),
    patchConsent: (kind, id, value) => patch("/api/consent", { kind, id, value }),
    // settings
    getSettings: () => get("/api/settings"),
    patchSettings: (body) => patch("/api/settings", body),
    // reports
    listReports: () => get("/api/reports"),
    getReport: (id) => get(`/api/reports/${id}`),
    createSampleReport: (scenario, fileName, fullPipeline) => post("/api/reports/sample", { scenario, fileName: fileName || null, fullPipeline: !!fullPipeline }),
    uploadReport: (file) => upload("/api/reports/upload", file),
    verifyReport: (id, values) => post(`/api/reports/${id}/verify`, { values }),
    getQuestionnaire: (id) => get(`/api/reports/${id}/questionnaire`),
    patchQuestionnaire: (id, patchObj) => patch(`/api/reports/${id}/questionnaire`, { patch: patchObj }),
    analyzeReport: (id) => post(`/api/reports/${id}/analyze`),
    getAnalysis: (id) => get(`/api/reports/${id}/analysis`),
    getTrends: (id) => get(`/api/reports/${id}/trends`),
    // action plan
    getActionPlan: () => get("/api/action-plan"),
    toggleActionItem: (code) => post("/api/action-plan/toggle", { code }),
    // meta (static content)
    metaDomains: () => get("/api/meta/domains"),
    metaLabDictionary: () => get("/api/meta/lab-dictionary"),
    metaQuestionnaireSections: () => get("/api/meta/questionnaire-sections"),
    metaLegal: () => get("/api/meta/legal"),
    metaReferenceScales: () => get("/api/meta/reference-scales"),
    metaReferralLevels: () => get("/api/meta/referral-levels"),
    metaEducation: () => get("/api/meta/education"),
    metaSampleScenarios: () => get("/api/meta/sample-scenarios"),
  };
})();
