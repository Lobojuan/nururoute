# Visual QA

`python3 qa/visual-qa.py` screenshots every public route at 390 / 820 / 1280 / 1440 px,
and fails on horizontal overflow, missing or duplicate `<h1>`, console/page errors,
placeholder titles or broken internal links. Screenshots and `report.json` land in `qa/out/`.
Run it before every release; the "Tested on" bar in the site footer describes this contract.
