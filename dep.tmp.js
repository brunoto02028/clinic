require("dotenv").config();
const BASE=process.env.COOLIFY_BASE_URL,TOKEN=process.env.COOLIFY_API_TOKEN;
(async()=>{const d=await fetch(`${BASE}/api/v1/deployments/applications/o9plir7dhgskyng8athrp1ec?take=1`,{headers:{Authorization:`Bearer ${TOKEN}`}});
const j=await d.json();for(const x of (Array.isArray(j)?j:j.deployments??j.data??[]).slice(0,1))
console.log(`${(x.status||"?").padEnd(12)} ${(x.commit||"?").slice(0,9)}`);})();
