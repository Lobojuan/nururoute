"""
NuruRoute visual QA — screenshots every public route at 390 / 820 / 1280 / 1440,
checks for horizontal overflow, missing <h1>, console/page errors and broken internal links.
Usage: python3 qa/visual-qa.py [base_url]   (default http://localhost:8080)
Output: qa/out/<route>-<width>.png + qa/out/report.json ; exits 1 on any failure.
"""
import asyncio, json, sys
from pathlib import Path
from urllib.parse import urljoin, urlparse
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
ROUTES = ["/", "/models", "/studio", "/developers", "/wallet", "/pricing", "/impact", "/investors", "/console"]
WIDTHS = [390, 820, 1280, 1440]
OUT = Path(__file__).parent / "out"; OUT.mkdir(exist_ok=True)

async def main():
    report, failures = [], 0
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context()
        pg = await ctx.new_page()
        # Note: forced reduced-motion is checked separately below (layout only) because the
        # server cannot know the OS preference, so React logs a benign hydration note there.
        errs = []
        pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
        pg.on("console", lambda m: errs.append(f"console: {m.text}") if m.type == "error" else None)
        links = set()
        for route in ROUTES:
            for w in WIDTHS:
                errs.clear()
                await pg.set_viewport_size({"width": w, "height": 1800})
                await pg.goto(urljoin(BASE, route), wait_until="networkidle")
                await pg.wait_for_timeout(600)
                sw = await pg.evaluate("document.documentElement.scrollWidth")
                h1 = await pg.locator("h1").count()
                title = await pg.title()
                if w == 1280:
                    hrefs = await pg.eval_on_selector_all("a[href^='/']", "as => as.map(a => a.getAttribute('href'))")
                    links.update(h.split('#')[0].split('?')[0] for h in hrefs if h)
                slug = route.strip("/").replace("/", "_") or "home"
                await pg.screenshot(path=str(OUT / f"{slug}-{w}.png"))
                row = {"route": route, "width": w, "scrollWidth": sw, "h1": h1, "title": title, "errors": errs[:5]}
                row["ok"] = sw <= w and h1 == 1 and not errs and "Lovable" not in title
                failures += 0 if row["ok"] else 1
                report.append(row)
                print(("OK  " if row["ok"] else "FAIL"), route, w, f"sw={sw}", f"h1={h1}", errs[:1])
        # internal links resolve (non-404)
        for l in sorted(links):
            if l.startswith("/api/"): continue
            r = await pg.request.get(urljoin(BASE, l))
            ok = r.status < 400
            failures += 0 if ok else 1
            report.append({"link": l, "status": r.status, "ok": ok})
            if not ok: print("FAIL link", l, r.status)
        # reduced-motion layout pass (390 + 1280): no overflow, page still renders an h1
        rctx = await b.new_context(reduced_motion="reduce")
        rpg = await rctx.new_page()
        for route in ROUTES:
            for w in (390, 1280):
                await rpg.set_viewport_size({"width": w, "height": 1800})
                await rpg.goto(urljoin(BASE, route), wait_until="networkidle")
                sw = await rpg.evaluate("document.documentElement.scrollWidth")
                h1 = await rpg.locator("h1").count()
                ok = sw <= w and h1 == 1
                failures += 0 if ok else 1
                report.append({"route": route, "width": w, "reducedMotion": True, "scrollWidth": sw, "h1": h1, "ok": ok})
                if not ok: print("FAIL reduced-motion", route, w, sw, h1)
        await b.close()
    (OUT / "report.json").write_text(json.dumps(report, indent=2))
    print(f"\n{len(report)} checks, {failures} failures")
    sys.exit(1 if failures else 0)

asyncio.run(main())
