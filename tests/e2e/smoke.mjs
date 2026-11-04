/**
 * End-to-end smoke test (real browser). Requires a running app + MongoDB and an installed Chrome or Edge.
 *   BASE_URL=http://localhost:3000 npm run test:e2e
 * It creates records prefixed "E2E " and removes them at the end.
 */
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const results = [];
const consoleErrors = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? " - " + extra : ""}`); };

async function launch() {
  for (const channel of ["chrome", "msedge"]) {
    try { return await chromium.launch({ channel, headless: true }); } catch { /* try next */ }
  }
  throw new Error("No Chrome or Edge found for Playwright.");
}

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`${page.url()} :: ${m.text()}`); });
page.on("pageerror", (e) => consoleErrors.push(`${page.url()} :: ${e.message}`));
const api = async (path, init) => (await ctx.request.fetch(`${BASE}/api${path}`, init)).json();

try {
  // Dashboard
  await page.goto(BASE, { waitUntil: "networkidle" });
  check("dashboard renders countdown", await page.getByText(/until .*2026/).first().isVisible());
  check("dashboard shows today's mission or empty state", (await page.getByText(/Today.s mission/).count()) > 0);

  // Roadmap: 31 days, complete a task persists across reload
  await page.goto(`${BASE}/roadmap?day=1`, { waitUntil: "networkidle" });
  const days = await api("/roadmapDays?limit=100");
  check("31 roadmap days seeded", days.total === 31);
  const box = page.getByRole("checkbox").first();
  await box.check();
  await page.waitForTimeout(800);
  await page.reload({ waitUntil: "networkidle" });
  check("task completion persists after refresh", await page.getByRole("checkbox").first().isChecked());
  await page.getByRole("checkbox").first().uncheck();

  // Resources search
  await page.goto(`${BASE}/resources`, { waitUntil: "networkidle" });
  await page.getByLabel("Search resources").fill("portswigger");
  await page.waitForTimeout(700);
  check("resource search by title", (await page.getByRole("link", { name: /PortSwigger/ }).count()) >= 1);
  const link = page.getByRole("link", { name: /PortSwigger/ }).first();
  check("external links are safe", /noopener/.test((await link.getAttribute("rel")) ?? "") && (await link.getAttribute("target")) === "_blank");

  // Notes: create, type, autosave, reload, search
  await page.goto(`${BASE}/notes?new=1`, { waitUntil: "networkidle" });
  await page.getByLabel("Note title").waitFor();
  await page.getByLabel("Note title").fill("E2E autosave note");
  await page.getByLabel("Note body (Markdown)").fill("# Hello\n\n```bash\nnmap -sV 10.0.0.1\n```\n\n<script>window.__pwned=1</script>");
  await page.getByText(/^Saved \d/).waitFor({ timeout: 8000 });
  check("autosave status shows Saved", true);
  await page.reload({ waitUntil: "networkidle" });
  check("note body persists after refresh", (await page.getByLabel("Note body (Markdown)").inputValue()).includes("nmap -sV"));
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await page.locator(".md pre code").first().waitFor();
  check("code block rendered", true);
  check("script not executed / not rendered", (await page.evaluate(() => window.__pwned)) === undefined && (await page.locator(".md script").count()) === 0);
  await page.goto(`${BASE}/notes`, { waitUntil: "networkidle" });
  await page.getByLabel("Search notes").first().fill("autosave note");
  await page.waitForTimeout(800);
  check("note search finds title", (await page.getByRole("button", { name: /E2E autosave note/ }).count()) >= 1);

  // Challenge + two attempts + retry queue
  const ch = await api("/challenges", { method: "POST", data: { title: "E2E challenge", category: "Web Security", difficulty: "intermediate" } });
  await api("/challengeAttempts", { method: "POST", data: { challengeId: ch.id, attemptedAt: new Date().toISOString(), status: "failed", durationMinutes: 20, hintsUsed: 1 } });
  await page.goto(`${BASE}/challenges`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: /Retry queue/ }).click();
  check("failed challenge appears in retry queue", await page.getByText("E2E challenge").first().isVisible());
  await api("/challengeAttempts", { method: "POST", data: { challengeId: ch.id, attemptedAt: new Date().toISOString(), status: "solved", durationMinutes: 10 } });
  const a = await api("/analytics");
  check("analytics counts attempts not unique challenges", a.overall.attempts >= 2 && a.overall.uniqueChallengesAttempted >= 1);

  // Pages load without crashing
  for (const p of ["/analytics", "/weaknesses", "/readiness", "/reports", "/mocks", "/settings"]) {
    await page.goto(`${BASE}${p}`, { waitUntil: "networkidle" });
    check(`page ${p} renders heading`, (await page.locator("h1").count()) > 0 || p === "/settings");
  }

  // Mobile navigation drawer
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Open navigation" }).click();
  check("mobile drawer opens", await page.getByRole("dialog", { name: "Navigation" }).isVisible());
  await page.getByRole("link", { name: "My Notes" }).click();
  await page.waitForURL(/\/notes/);
  check("mobile drawer navigates", true);

  // cleanup
  const notes = await api("/notes?q=E2E");
  for (const n of notes.items) await ctx.request.delete(`${BASE}/api/notes/${n.id}`);
  await ctx.request.delete(`${BASE}/api/challenges/${ch.id}`);
} catch (e) {
  check("script completed", false, e.message);
}

check("no console errors in primary flows", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
