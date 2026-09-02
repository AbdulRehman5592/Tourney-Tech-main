import { chromium } from "playwright";

const OUT = "C:/Users/hp/AppData/Local/Temp/claude/d--AAA-MY-PROJECTS-Tourney-Tech/fa50860f-da32-4fd9-8637-8b546d28822b/scratchpad/shots";
const EMAIL = process.env.TT_EMAIL;
const PASSWORD = process.env.TT_PASSWORD;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto("http://localhost:3000/auth/login", { waitUntil: "networkidle" });
await page.fill("#email", EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 15000 });
console.log("logged in, now at:", page.url());

const pages = [
  ["admin_all_tournaments", "/admin/all-tournaments"],
  ["admin_registration_requests", "/admin/registration-requests"],
  ["dashboard_teamup", "/dashboard/teamup"],
  ["admin_create_tournament", "/admin/create-tournament"],
];

for (const [name, path] of pages) {
  try {
    await page.goto("http://localhost:3000" + path, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log("shot:", name);
  } catch (err) {
    console.log("FAILED:", name, err.message);
  }
}

await browser.close();
