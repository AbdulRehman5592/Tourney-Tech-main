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

// 1) Expand a tournament on All Tournaments page
await page.goto("http://localhost:3000/admin/all-tournaments", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
const firstHeader = page.locator("section button").first();
await firstHeader.click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/all_tournaments_expanded.png` });
console.log("shot: all_tournaments_expanded");

// 2) Registration requests -- scroll right to reveal Notes column
await page.goto("http://localhost:3000/admin/registration-requests", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
const scrollBox = page.locator(".scrollbar-x").first();
await scrollBox.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/registration_notes_column.png` });
console.log("shot: registration_notes_column");

// 3) Open the tournament edit form
await page.goto("http://localhost:3000/admin/create-tournament", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
const editBtn = page.locator("button:has(svg)").filter({ hasText: "" }).first();
// click the pencil edit icon in the first row's Actions column
await page.locator("tbody tr").first().locator("button").first().click();
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/edit_form_top.png`, fullPage: false });
console.log("shot: edit_form_top");

// Scroll the modal/form down to the first game's fields
const eventTitleLabel = page.getByText("Event Title", { exact: false }).first();
if (await eventTitleLabel.count()) {
  await eventTitleLabel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/edit_form_game_fields.png` });
  console.log("shot: edit_form_game_fields");
} else {
  console.log("Event Title label not found");
}

await browser.close();
