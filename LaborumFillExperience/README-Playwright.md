# Laborum Playwright Automation

This is the alternative to UI.Vision.

## Install

```powershell
npm install
npx playwright install chromium
```

If the Chromium download is slow, skip `npx playwright install chromium`. The script will use your installed Chrome or Edge when available.

## Run one CSV row

```powershell
npm run laborum:fill
```

The browser opens visibly. Log in if Laborum asks for it; the session is saved in `.auth/laborum-profile`.

## Choose another row

```powershell
npm run laborum:fill -- --row=2
```

## Use a specific browser

```powershell
npm run laborum:fill -- --browser="C:/Program Files/Google/Chrome/Application/chrome.exe"
```

## Submit after filling

```powershell
npm run laborum:fill -- --save
```

CSV columns:

```text
empresa,actividad,puesto,nivel,area,subarea,pais,mesInicio,anoInicio,mesFin,anoFin,detalle,personasACargo,presupuesto
```

The select values must match the visible option text in Laborum, including accents.
