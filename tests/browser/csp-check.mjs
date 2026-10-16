#!/usr/bin/env node
// Content Security Policy, checked in a real browser: every page loads with
// no violation and its JavaScript actually runs (a policy too strict breaks
// the site silently — the server returns 200 either way), and an injected
// script does not run.
//
//   node --experimental-websocket tests/browser/csp-check.mjs [base-url]
//   (Node 22+ needs no flag; base-url defaults to http://localhost:3000)
//
// Use the site's canonical address (AUTH_URL): Auth.js redirects there, and a
// prefetch redirected to another origin is rightly blocked by connect-src.
//
// Needs Chrome, Chromium or Edge (CHROME=/path/to/browser to choose).
// Signed-in pages too, with SESSION_COOKIE="name=value", or --signup to create
// a throwaway account first (test stacks only). Without --signup it only
// reads: safe against any environment.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const SIGNUP = args.includes("--signup");
const BASE = (args.find((arg) => !arg.startsWith("--")) ?? "http://localhost:3000").replace(/\/+$/, "");
const PUBLIC_PAGES = ["/", "/login", "/register", "/nosPacks", "/cgv", "/mentions-legales", "/mot-de-passe-oublie"];
const SIGNED_IN_PAGES = ["/dashboard", "/chatIa", "/myFolders", "/documents"];
const PORT = 9333;

const browserPath = [
  process.env.CHROME,
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((path) => path && existsSync(path));
if (!browserPath) {
  console.error("Aucun navigateur Chromium trouvé (variable CHROME).");
  process.exit(2);
}

const profile = mkdtempSync(join(tmpdir(), "csp-check-"));
const browser = spawn(
  browserPath,
  ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
   "--no-first-run", "--no-default-browser-check",
   // CI runners (Ubuntu 24.04) forbid the namespaces Chrome's sandbox needs;
   // it only ever loads the site under test there.
   ...(process.env.CI ? ["--no-sandbox"] : []),
   "about:blank"],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function devtools() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
      return target.webSocketDebuggerUrl;
    } catch {
      await sleep(200);
    }
  }
  throw new Error("le navigateur ne répond pas");
}

function connect(url) {
  const socket = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    } else if (message.method) {
      for (const listener of listeners.get(message.method) ?? []) listener(message.params);
    }
  });
  return new Promise((resolve) => {
    socket.addEventListener("open", () =>
      resolve({
        send: (method, params = {}) =>
          new Promise((ok, ko) => {
            const id = nextId++;
            pending.set(id, { resolve: ok, reject: ko });
            socket.send(JSON.stringify({ id, method, params }));
          }),
        on: (method, listener) => listeners.set(method, [...(listeners.get(method) ?? []), listener]),
        close: () => socket.close(),
      }),
    );
  });
}

// Recorded from the very first byte of each page: injected by DevTools, so
// not subject to the policy it watches.
const RECORDER = `
  window.__violations = [];
  document.addEventListener("securitypolicyviolation", (event) => {
    window.__violations.push(event.violatedDirective + " " + (event.blockedURI || "inline"));
  });
`;

const PROBE = `(async () => {
  await new Promise((resolve) => setTimeout(resolve, 1500)); // hydration, service worker
  const reactRoot = Object.keys(document).some((key) => key.startsWith("__reactContainer"));
  const worker = "serviceWorker" in navigator ? Boolean(await navigator.serviceWorker.getRegistration()) : false;
  return {
    violations: window.__violations,
    javascriptRan: Boolean(window.next?.version) || reactRoot,
    noncedScripts: document.querySelectorAll("script[nonce]").length,
    serviceWorker: worker,
  };
})()`;

// The classic XSS payload: an event-handler attribute in injected markup.
const INJECTION = `(async () => {
  window.__injected = false;
  const image = document.createElement("img");
  image.setAttribute("onerror", "window.__injected = true");
  image.src = "/csp-check-missing.png";
  document.body.appendChild(image);
  await new Promise((resolve) => setTimeout(resolve, 800));
  return window.__injected;
})()`;

/** A throwaway account, signed in the way the login form does: its session cookie. */
async function signUp() {
  const email = `csp-check-${Date.now()}@test.fr`;
  const password = "Motdepasse123";
  await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "CSP Check", email, password }),
  });
  const csrf = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrf.json();
  const cookies = csrf.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");
  const signIn = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: cookies },
    body: new URLSearchParams({ csrfToken, email, password }),
  });
  const session = signIn.headers.getSetCookie().map((cookie) => cookie.split(";")[0])
    .find((cookie) => cookie.includes("session-token="));
  if (!session) throw new Error("connexion du compte de test refusée");
  return session;
}

async function load(page, path) {
  const loaded = new Promise((resolve) => page.on("Page.loadEventFired", resolve));
  await page.send("Page.navigate", { url: BASE + path });
  await loaded;
}

async function evaluate(page, expression) {
  const { result, exceptionDetails } = await page.send("Runtime.evaluate", {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.text);
  return result.value;
}

let failures = 0;
const page = await connect(await devtools());
try {
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.send("Page.addScriptToEvaluateOnNewDocument", { source: RECORDER });

  const pages = [...PUBLIC_PAGES];
  const sessionCookie = process.env.SESSION_COOKIE ?? (SIGNUP ? await signUp() : undefined);
  if (sessionCookie) {
    const [name, ...value] = sessionCookie.split("=");
    await page.send("Network.setCookie", { name, value: value.join("="), url: BASE });
    pages.push(...SIGNED_IN_PAGES);
  }

  for (const path of pages) {
    await load(page, path);
    const report = await evaluate(page, PROBE);
    const ok = report.violations.length === 0 && report.javascriptRan;
    if (!ok) failures++;
    console.log(
      `  ${ok ? "OK  " : "FAIL"} ${path.padEnd(22)} JS ${report.javascriptRan ? "exécuté" : "BLOQUÉ"}, ` +
        `${report.noncedScripts} scripts signés, service worker ${report.serviceWorker ? "actif" : "absent"}` +
        (report.violations.length ? ` — violations : ${report.violations.join(" | ")}` : ""),
    );
  }

  await load(page, "/");
  const injected = await evaluate(page, INJECTION);
  if (injected) failures++;
  console.log(`  ${injected ? "FAIL" : "OK  "} script injecté (onerror) ${injected ? "EXÉCUTÉ" : "bloqué"}`);
} finally {
  page.close();
  const exited = new Promise((resolve) => browser.once("exit", resolve));
  browser.kill();
  await Promise.race([exited, sleep(5000)]);
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  } catch {
    // Windows may keep a profile file locked a moment longer: a leftover in
    // the temp directory is not a test failure.
  }
}

console.log(`== CSP : ${failures === 0 ? "aucun problème" : `${failures} problème(s)`}`);
process.exit(failures === 0 ? 0 : 1);
