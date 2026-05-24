import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_CSV = "LaborumFillExperience/LaborumExperience.csv";
const FORM_URL = "https://www.laborum.cl/candidatos/curriculum/experiencia/agregar";
const browserCandidates = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
];

const columns = [
  "empresa",
  "actividad",
  "puesto",
  "nivel",
  "area",
  "subarea",
  "pais",
  "mesInicio",
  "anoInicio",
  "mesFin",
  "anoFin",
  "detalle",
  "personasACargo",
  "presupuesto"
];

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      i++;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function loadRow() {
  const csvPath = path.resolve(argValue("csv", DEFAULT_CSV));
  const rowIndex = Number.parseInt(argValue("row", "1"), 10) - 1;
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const row = rows[rowIndex];

  if (!row) {
    throw new Error(`CSV row ${rowIndex + 1} not found in ${csvPath}`);
  }

  return Object.fromEntries(columns.map((column, index) => [column, row[index]?.trim() ?? ""]));
}

function localBrowserPath() {
  return browserCandidates.find((candidate) => fs.existsSync(candidate));
}

function xpathLiteral(value) {
  if (!value.includes("'")) return `'${value}'`;
  if (!value.includes('"')) return `"${value}"`;
  return `concat('${value.replace(/'/g, `', "'", '`)}')`;
}

async function setText(page, selector, value) {
  const field = page.locator(selector);
  await field.waitFor({ state: "visible", timeout: 15000 });
  await field.fill(value ?? "");
}

async function selectReact(page, containerId, label, index = 0) {
  if (!label) return;

  const container = page.locator(`[id="${containerId}"]`).nth(index);
  await container.waitFor({ state: "visible", timeout: 15000 });
  await container.click();

  const input = container.locator("input").first();
  const editable = await input.evaluate((el) => !el.disabled && !el.readOnly).catch(() => false);
  if (editable) {
    await input.fill(label);
  }

  const option = page.locator(
    `xpath=//*[contains(@class, "select__option") or @role="option" or contains(@id, "-option-")][normalize-space(.)=${xpathLiteral(label)}]`
  );
  await option.first().waitFor({ state: "visible", timeout: 15000 });
  await option.first().click();
}

async function main() {
  const data = loadRow();
  const save = hasFlag("save");
  const headless = hasFlag("headless");
  const userDataDir = path.resolve(".auth/laborum-profile");
  const executablePath = argValue("browser", localBrowserPath());

  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath,
    headless,
    viewport: { width: 1366, height: 900 }
  });
  const page = context.pages()[0] ?? await context.newPage();

  await page.goto(FORM_URL, { waitUntil: "domcontentloaded" });
  await page.locator("#empresa").waitFor({ state: "visible", timeout: 120000 });

  await setText(page, "#empresa", data.empresa);
  await selectReact(page, "select-actividad", data.actividad);
  await setText(page, "#puesto", data.puesto);
  await selectReact(page, "select-nivel", data.nivel);
  await selectReact(page, "select-area", data.area);
  await selectReact(page, "select-subarea", data.subarea);
  await selectReact(page, "select-pais", data.pais);
  await selectReact(page, "month", data.mesInicio, 0);
  await selectReact(page, "year", data.anoInicio, 0);
  await selectReact(page, "month", data.mesFin, 1);
  await selectReact(page, "year", data.anoFin, 1);
  await setText(page, "#detalle", data.detalle);
  await setText(page, "#personasACargo", data.personasACargo);

  if (data.presupuesto) {
    await page.locator(`input[name="presupuesto"][value="${data.presupuesto}"]`).click();
  }

  if (save) {
    await page.locator("#experiencias-form-guardar").first().click();
  } else {
    console.log("Form filled. Run with --save when you want to submit.");
  }

  if (!headless) {
    console.log("Browser left open for review. Press Ctrl+C when finished.");
    await page.pause();
  }

  await context.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
