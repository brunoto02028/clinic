const fs = require('fs');
const BASE = 'http://localhost:4000';
const RED_FLAGS = ["unexplainedWeightLoss","nightPain","traumaHistory","neurologicalSymptoms","bladderBowelDysfunction","recentInfection","cancerHistory","steroidUse","osteoporosisRisk","cardiovascularSymptoms","severeHeadache","dizzinessBalanceIssues"];
const TEXT_AT_RISK = ["painPattern","alcoholUse","gpDetails","emergencyContact","emergencyContactPhone"];
function token(u) { return JSON.parse(fs.readFileSync(`./.qa-tmp/login-${u}.json`,'utf8')).accessToken; }
async function api(u, path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(u)}`, ...(opts.headers||{}) },
  });
  let body; const txt = await res.text();
  try { body = JSON.parse(txt); } catch { body = txt; }
  return { status: res.status, body };
}
function pick(s, keys) { const o = {}; for (const k of keys) o[k] = s ? s[k] : undefined; return o; }
module.exports = { api, RED_FLAGS, TEXT_AT_RISK, pick, BASE };
