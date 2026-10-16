// Load test — k6 (https://k6.io), run from its Docker image (DEPLOYMENT.md, step 7).
//
//   docker run --rm -i --network iadaf_iadaf-network grafana/k6:2.3.0 run \
//     -e BASE_URL=http://frontend:3000 -e LOAD_EMAIL=… -e LOAD_PASSWORD=… - < tests/load/load-test.js
//
// Visitors browse the public pages; members (with LOAD_EMAIL/LOAD_PASSWORD, a
// test account) the signed-in ones. One sign-in in setup(), its session shared
// by every member: signing in per user would hit the login rate limit.
//
// The assistant (LLM) is left out: each answer is billed, and what limits it
// is the budget and the per-account quota, not the server.
//
// Settings: LOAD_VISITORS (20), LOAD_MEMBERS (10), LOAD_DURATION (3m).

import http from "k6/http";
import { check, sleep } from "k6";

const BASE = (__ENV.BASE_URL || "http://frontend:3000").replace(/\/+$/, "");
const EMAIL = __ENV.LOAD_EMAIL;
const PASSWORD = __ENV.LOAD_PASSWORD;
const DURATION = __ENV.LOAD_DURATION || "3m";
const VISITORS = Number(__ENV.LOAD_VISITORS || 20);
const MEMBERS = Number(__ENV.LOAD_MEMBERS || 10);

const ramp = (target) => [
  { duration: "30s", target },
  { duration: DURATION, target },
  { duration: "15s", target: 0 },
];

export const options = {
  scenarios: {
    visitors: { executor: "ramping-vus", exec: "visitor", startVUs: 0, stages: ramp(VISITORS) },
    ...(EMAIL ? { members: { executor: "ramping-vus", exec: "member", startVUs: 0, stages: ramp(MEMBERS) } } : {}),
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{kind:page}": ["p(95)<1500"],
    "http_req_duration{kind:api}": ["p(95)<500"],
    checks: ["rate>0.99"],
  },
};

export function setup() {
  if (!EMAIL) return {};
  // Signed in the way the login form does.
  const csrfToken = http.get(`${BASE}/api/auth/csrf`).json("csrfToken");
  http.post(
    `${BASE}/api/auth/callback/credentials`,
    { csrfToken, email: EMAIL, password: PASSWORD },
    { redirects: 0 },
  );
  const cookies = http.cookieJar().cookiesForURL(BASE);
  const name = Object.keys(cookies).find((cookie) => cookie.includes("session-token"));
  if (!name) throw new Error("Connexion refusée pour LOAD_EMAIL.");
  return { session: { [name]: cookies[name][0] } };
}

// No redirect followed: a 307 to /login (lost session) must count as a failure.
function get(path, kind, cookies) {
  const response = http.get(`${BASE}${path}`, { tags: { kind, name: path }, redirects: 0, cookies });
  check(response, { [`${path} : 200`]: (r) => r.status === 200 });
}

export function visitor() {
  get("/", "page");
  sleep(1);
  get("/nosPacks", "page");
  sleep(1);
  get("/cgv", "page");
  sleep(2);
}

export function member(data) {
  get("/dashboard", "page", data.session);
  sleep(1);
  get("/api/account", "api", data.session);
  get("/myFolders", "page", data.session);
  sleep(1);
  get("/documents", "page", data.session);
  sleep(2);
}
