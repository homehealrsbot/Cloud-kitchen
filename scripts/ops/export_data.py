"""Export the operations workbook's INPUT data to JSON for the app, plus
the workbook's cached computed values as an expected-results file for verification."""
import json, sys, openpyxl

src, out_dir, expected_path = sys.argv[1], sys.argv[2], sys.argv[3]
wb = openpyxl.load_workbook(src, data_only=True)

FLAG_KEYS = ["gluten", "dairy", "egg", "fish", "shellfish", "nuts", "peanut", "soy", "sesame", "celery"]

# ---------- Ingredients ----------
ws = wb["Ingredients"]
ingredients = []
for r in range(5, 85):
    key = ws.cell(r, 1).value
    if not key:
        continue
    ingredients.append({
        "key": key,
        "name": ws.cell(r, 2).value,
        "nameEn": ws.cell(r, 3).value,
        "kcal": ws.cell(r, 4).value,
        "protein": ws.cell(r, 5).value,
        "carb": ws.cell(r, 6).value,
        "fat": ws.cell(r, 7).value,
        "fiber": ws.cell(r, 8).value,
        "price": ws.cell(r, 9).value,
        "allergenText": ws.cell(r, 10).value or "",
        "source": ws.cell(r, 11).value or "",
        "flags": {k: bool(ws.cell(r, 12 + i).value) for i, k in enumerate(FLAG_KEYS)},
        "hidden": ws.cell(r, 22).value or "",
    })

# ---------- Recipes ----------
ws = wb["Recipes"]
recipes = []
for r in range(5, 462):
    sku = ws.cell(r, 1).value
    if not sku:
        continue
    recipes.append({"sku": sku, "type": ws.cell(r, 3).value, "ing": ws.cell(r, 4).value, "grams": ws.cell(r, 7).value})

# ---------- Menu (static columns only) ----------
ws = wb["Master_Menu"]
eng = wb["Eng_Matrix"]
eng_group = {eng.cell(r, 1).value: eng.cell(r, 3).value for r in range(5, 58)}
menu = []
for r in range(5, 58):
    sid = ws.cell(r, 1).value
    menu.append({
        "id": sid,
        "section": ws.cell(r, 2).value,
        "category": ws.cell(r, 3).value,
        "name": ws.cell(r, 4).value,
        "nameEn": ws.cell(r, 5).value,
        "cuisine": ws.cell(r, 6).value,
        "identity": ws.cell(r, 7).value,
        "shelfLifeH": ws.cell(r, 27).value,
        "reheat": ws.cell(r, 28).value or "",
        "opsNote": ws.cell(r, 29).value or "",
        "method": ws.cell(r, 30).value or "",
        "engGroup": eng_group[sid],
    })

# ---------- Rotation ----------
ws = wb["Rotation_14d"]
slot_labels = (["فطور %d" % i for i in range(1, 5)] + ["غداء %d" % i for i in range(1, 5)] +
               ["عشاء %d" % i for i in range(1, 5)] + ["سناك %d" % i for i in range(1, 5)] +
               ["شوربة 1", "شوربة 2", "سلطة 1", "سلطة 2", "حلا 1", "حلا 2"])
slot_rule = (["فطور"] * 4 + ["دجاج", "دجاج", "لحم", "سمك/ربيان"] * 2 + ["سناك"] * 4 +
             ["شوربة"] * 2 + ["سلطة"] * 2 + ["حلا"] * 2)
days = []
for r in range(5, 19):
    label = ws.cell(r, 1).value
    slots = [str(ws.cell(r, c).value).split(" ")[0] for c in range(2, 24)]
    days.append({"label": label, "slots": slots})
rotation = {"slotLabels": slot_labels, "slotRule": slot_rule, "days": days, "rules": ws["A76"].value}

# ---------- Settings ----------
ws = wb["Settings"]
settings = {
    "multipliers": {ws.cell(r, 2).value: {"lean": ws.cell(r, 3).value, "balanced": ws.cell(r, 4).value,
                                          "performance": ws.cell(r, 5).value} for r in range(5, 9)},
    "sections": {ws.cell(r, 1).value: {"packaging": ws.cell(r, 2).value, "targetCostPct": ws.cell(r, 3).value}
                 for r in range(12, 18)},
    "wastePct": ws["B20"].value,
    "spiceAllowance": ws["B21"].value,
    "priceRoundStep": ws["B22"].value,
    "lowCarbMax": ws["B25"].value,
    "highProteinMin": ws["B26"].value,
    "kcalDiffMax": ws["B27"].value,
    "vatRate": ws["B32"].value,
    "priceIncludesVat": ws["B33"].value,
    "paymentFeePct": ws["B34"].value,
    "appCommissionPct": ws["B35"].value,
    "appSalesShare": ws["B36"].value,
    "marginWarnPct": ws["B44"].value,
    # مستنتج من لقطة الجودة في الملف: الصنفان المعلّمان HOLD هما الوحيدان بصلاحية أعلى من 72 ساعة
    "shelfLifeApprovalH": 72,
}
for r in range(38, 44):
    settings["sections"][ws.cell(r, 1).value]["labor"] = ws.cell(r, 2).value

# ---------- Quality snapshot ----------
ws = wb["استيراد_من_الجودة"]
gate_names = [ws.cell(4, c).value for c in range(2, 10)]
quality = {
    "snapshotDate": str(ws["B3"].value)[:10],
    "gateNames": gate_names,
    "sku": {ws.cell(r, 1).value: {"gates": [ws.cell(r, c).value for c in range(2, 10)],
                                 "status": ws.cell(r, 10).value, "blocker": ws.cell(r, 11).value,
                                 "alert": ws.cell(r, 12).value or ""} for r in range(5, 58)},
    "ingredient": {ws.cell(r, 14).value: [ws.cell(r, c).value for c in range(15, 18)] for r in range(5, 85)},
}

for name, data in [("ingredients", ingredients), ("recipes", recipes), ("menu", menu),
                   ("rotation", rotation), ("settings", settings)]:
    with open(f"{out_dir}/{name}.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

# ---------- Expected (cached workbook results) ----------
ws = wb["Master_Menu"]
cols = {"rawWeight": 8, "kcal": 9, "protein": 10, "carb": 11, "fat": 12, "fiber": 13, "kcalLean": 14,
        "proteinLean": 15, "kcalPerf": 16, "proteinPerf": 17, "ingCost": 18, "totalCost": 19, "price": 20,
        "costPct": 21, "marginPerDish": 22, "lowCarb": 23, "highProtein": 24, "kcalDiff": 25, "allergens": 26,
        "priceExVat": 31, "labor": 32, "fees": 33, "fullCost": 34, "contribution": 35, "contributionPct": 36,
        "status": 37, "ingCostPerf": 38, "totalCostPerf": 39, "pricePerf": 40, "perfMarginAtBalanced": 41}
expected_menu = {ws.cell(r, 1).value: {k: ws.cell(r, c).value for k, c in cols.items()} for r in range(5, 58)}
d = wb["لوحة_القيادة"]
expected = {
    "menu": expected_menu,
    "quality": quality,
    "dashboard": {
        "total": d["A5"].value, "ready": d["C5"].value, "pending": d["E5"].value, "hold": d["G5"].value,
        "avgContributionPct": d["I5"].value,
        "bySection": {d.cell(r, 1).value: [d.cell(r, c).value for c in range(2, 10)] for r in range(9, 15)},
        "weakest5": [d.cell(r, 2).value for r in range(18, 23)],
        "integrity": {d.cell(r, 1).value: d.cell(r, 2).value for r in range(50, 57)},
    },
    "rotationCounts": {wb["Rotation_14d"].cell(r, 1).value: wb["Rotation_14d"].cell(r, 3).value for r in range(22, 75)},
    "rotationCheck": [wb["Rotation_14d"].cell(r, 27).value for r in range(5, 19)],
}
with open(expected_path, "w", encoding="utf-8") as f:
    json.dump(expected, f, ensure_ascii=False, indent=1)
print(len(ingredients), "ingredients;", len(recipes), "recipe lines;", len(menu), "menu items;", len(days), "days")
print(json.dumps(settings, ensure_ascii=False)[:900])
