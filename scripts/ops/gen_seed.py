#!/usr/bin/env python3
"""
يحوّل بيانات العمليات الحقيقية (src/data/ops/*.json) إلى supabase/seed.sql.

الملف الناتج idempotent — تقدر تنفّذه أكثر من مرة بأمان (on conflict do update)،
فأي تحديث للإكسل يُعاد توليده ويُعاد تنفيذه بدون ما يكرّر أو يفقد شي.

التشغيل:  python3 scripts/ops/gen_seed.py
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data" / "ops"
OUT = ROOT / "supabase" / "seed.sql"


def q(v) -> str:
    """نص SQL آمن: التنصيص المفرد يُضاعف."""
    if v is None:
        return "null"
    return "'" + str(v).replace("'", "''") + "'"


def num(v) -> str:
    if v is None or v == "":
        return "0"
    f = float(v)
    return str(int(f)) if f == int(f) else repr(f)


def jsonb(v) -> str:
    return q(json.dumps(v, ensure_ascii=False)) + "::jsonb"


def arr(items) -> str:
    if not items:
        return "'{}'::text[]"
    return "array[" + ", ".join(q(i) for i in items) + "]::text[]"


def main() -> int:
    ing = json.loads((DATA / "ingredients.json").read_text(encoding="utf-8"))
    men = json.loads((DATA / "menu.json").read_text(encoding="utf-8"))
    rec = json.loads((DATA / "recipes.json").read_text(encoding="utf-8"))
    rot = json.loads((DATA / "rotation.json").read_text(encoding="utf-8"))
    settings = json.loads((DATA / "settings.json").read_text(encoding="utf-8"))
    defs = json.loads((DATA / "gate-defs.json").read_text(encoding="utf-8"))
    fs = json.loads((DATA / "food-safety.json").read_text(encoding="utf-8"))
    axes = json.loads((DATA / "launch-axes.json").read_text(encoding="utf-8"))

    # --- فحص سلامة قبل التوليد: نفس فحوصات integrityChecks في المحرك ---
    ing_keys = {i["key"] for i in ing}
    menu_ids = {m["id"] for m in men}
    errors = []
    for line in rec:
        if line["ing"] not in ing_keys:
            errors.append(f"سطر وصفة يشير لمكوّن غير موجود: {line['sku']} -> {line['ing']}")
        if line["sku"] not in menu_ids:
            errors.append(f"سطر وصفة يشير لصنف غير موجود: {line['sku']}")
        if not float(line["grams"]) > 0:
            errors.append(f"سطر وصفة بوزن غير صالح: {line['sku']} {line['ing']}")
    for d_i, day in enumerate(rot["days"]):
        for s_i, sku in enumerate(day["slots"]):
            if sku not in menu_ids:
                errors.append(f"خانة دوران تشير لصنف غير موجود: يوم {d_i+1} خانة {s_i} -> {sku}")
    sections = {m["section"] for m in men}
    missing = sections - set(settings["sections"].keys())
    if missing:
        errors.append(f"أقسام في المنيو بلا إعدادات: {missing}")

    # تعريفات البوابات: النوع المحسوب لازم بلا مالك، وغيره لازم له مالك،
    # والأنواع الفريدة ما تتكرر — نفس ما يفرضه setGateDef في التطبيق.
    roles = {"executive", "kitchen", "quality"}
    seen_idx = set()
    for g in defs["gates"]:
        if g["index"] in seen_idx:
            errors.append(f"رقم بوابة مكرر: {g['index']}")
        seen_idx.add(g["index"])
        if g["kind"] == "kitchen_pilot":
            if g["ownerRole"] is not None:
                errors.append(f"بوابة محسوبة لها مالك: {g['label']}")
        elif g["ownerRole"] not in roles:
            errors.append(f"بوابة بلا مالك صحيح: {g['label']} -> {g['ownerRole']}")
    for kind in ("kitchen_pilot", "shelf", "price"):
        n = sum(1 for g in defs["gates"] if g["kind"] == kind)
        if n > 1:
            errors.append(f"نوع بوابة فريد مكرر: {kind} ({n})")
    if not any(g["kind"] == "shelf" for g in defs["gates"]):
        errors.append("ما فيه بوابة صلاحية — تنبيه الصلاحية الطويلة ما يشتغل")
    for a in defs["ingredientApprovals"]:
        if a["ownerRole"] not in roles:
            errors.append(f"اعتماد مكوّن بلا مالك صحيح: {a['label']}")
    if settings.get("pilotPassesRequired") is None:
        errors.append("pilotPassesRequired ناقص من settings.json — بوابة المطبخ ما تُختم أبداً")

    # سلامة الغذاء: كل حد يشير لخطوة موجودة، والعددي له طرف واحد على الأقل،
    # وكل خطوة حرجة لها حد — خطوة CCP بلا حد يعني مراقبة بلا معيار.
    step_idx = {st["index"] for st in fs["haccpSteps"]}
    for cl in fs["criticalLimits"]:
        if cl["step"] not in step_idx:
            errors.append(f"حد حرج يشير لخطوة غير موجودة: {cl['parameter']} -> {cl['step']}")
        if cl["kind"] == "numeric" and cl["min"] is None and cl["max"] is None:
            errors.append(f"حد عددي بلا طرف أدنى ولا أعلى: {cl['parameter']}")
    limited = {cl["step"] for cl in fs["criticalLimits"]}
    for st in fs["haccpSteps"]:
        if st["isCcp"] and st["index"] not in limited:
            errors.append(f"خطوة حرجة بلا حد حرج: {st['label']}")
        if not st["isCcp"] and st["index"] in limited:
            errors.append(f"حد حرج على خطوة غير حرجة: {st['label']}")
    for pr in fs["prpPrograms"]:
        if pr["ownerRole"] not in roles:
            errors.append(f"برنامج PRP بلا مالك صحيح: {pr['code']}")
    for ic in fs["isoClauses"]:
        if ic["ownerRole"] not in roles:
            errors.append(f"بند ISO بلا مالك صحيح: {ic['clause']}")
    if errors:
        print("فحص السلامة فشل — ما تم توليد الملف:", file=sys.stderr)
        for e in errors:
            print("  -", e, file=sys.stderr)
        return 1

    L: list[str] = []
    w = L.append
    w("-- ============================================================================")
    w("-- بيانات العمليات الحقيقية — مُولَّدة آلياً. لا تعدّل هذا الملف يدوياً.")
    w("-- المصدر: src/data/ops/*.json")
    w("-- التوليد: python3 scripts/ops/gen_seed.py")
    w(f"-- المحتوى: {len(men)} صنف · {len(ing)} مكوّن · {len(rec)} سطر وصفة · "
      f"{len(rot['days'])} يوم دوران")
    w("--")
    w("-- idempotent: تنفيذه مرة ثانية يحدّث القيم ولا يكرّرها.")
    w("-- ملاحظة: ما يلمس بوابات الجودة ولا خطة الإنتاج — هذي يدخلها الفريق.")
    w("-- ============================================================================")
    w("")
    w("begin;")
    w("")

    # --- المكوّنات ---
    w(f"-- {len(ing)} مكوّن")
    w("insert into ops_ingredients "
      "(key, name, name_en, kcal, protein, carb, fat, fiber, price, allergen_text, source, flags, hidden, sort_order) values")
    rows = []
    for i, r in enumerate(ing):
        rows.append(
            f"  ({q(r['key'])}, {q(r['name'])}, {q(r.get('nameEn',''))}, "
            f"{num(r['kcal'])}, {num(r['protein'])}, {num(r['carb'])}, {num(r['fat'])}, {num(r['fiber'])}, "
            f"{num(r['price'])}, {q(r.get('allergenText',''))}, {q(r.get('source',''))}, "
            f"{jsonb(r.get('flags',{}))}, {q(r.get('hidden',''))}, {i})"
        )
    w(",\n".join(rows))
    w("on conflict (key) do update set")
    w("  name = excluded.name, name_en = excluded.name_en, kcal = excluded.kcal,")
    w("  protein = excluded.protein, carb = excluded.carb, fat = excluded.fat,")
    w("  fiber = excluded.fiber, price = excluded.price,")
    w("  allergen_text = excluded.allergen_text, source = excluded.source,")
    w("  flags = excluded.flags, hidden = excluded.hidden, sort_order = excluded.sort_order;")
    w("")

    # --- المنيو ---
    w(f"-- {len(men)} صنف")
    w("insert into ops_menu_items "
      "(id, section, category, name, name_en, cuisine, identity, shelf_life_h, reheat, ops_note, method, eng_group, sort_order) values")
    rows = []
    for i, m in enumerate(men):
        rows.append(
            f"  ({q(m['id'])}, {q(m['section'])}, {q(m.get('category',''))}, {q(m['name'])}, "
            f"{q(m.get('nameEn',''))}, {q(m.get('cuisine',''))}, {q(m.get('identity',''))}, "
            f"{int(m['shelfLifeH'])}, {q(m.get('reheat',''))}, {q(m.get('opsNote',''))}, "
            f"{q(m.get('method',''))}, {q(m.get('engGroup',''))}, {i})"
        )
    w(",\n".join(rows))
    w("on conflict (id) do update set")
    w("  section = excluded.section, category = excluded.category, name = excluded.name,")
    w("  name_en = excluded.name_en, cuisine = excluded.cuisine, identity = excluded.identity,")
    w("  shelf_life_h = excluded.shelf_life_h, reheat = excluded.reheat,")
    w("  ops_note = excluded.ops_note, method = excluded.method,")
    w("  eng_group = excluded.eng_group, sort_order = excluded.sort_order;")
    w("")

    # --- الوصفات: نحذف ونعيد لأن السطور ما لها مفتاح طبيعي ثابت ---
    w(f"-- {len(rec)} سطر وصفة (تُستبدل بالكامل)")
    w("delete from ops_recipe_lines;")
    w("insert into ops_recipe_lines (sku, type, ing, grams, sort_order) values")
    rows = []
    for i, r in enumerate(rec):
        rows.append(f"  ({q(r['sku'])}, {q(r['type'])}, {q(r['ing'])}, {num(r['grams'])}, {i})")
    w(",\n".join(rows))
    w(";")
    w("")

    # --- تعريفات البوابات والاعتمادات ---
    # قيم بداية فقط: بعد التشغيل تملكها الإدارة التنفيذية. ولهذا do nothing على
    # الصفوف الموجودة — إعادة تنفيذ seed.sql ما تمسح تعديلاتها ولا تعيد تنشيط
    # بوابة أوقفتها، بخلاف باقي الجداول اللي مصدرها الإكسل.
    w(f"-- {len(defs['gates'])} بوابة اعتماد (قيم بداية — لا تُكتب فوق الموجود)")
    w("insert into ops_gate_defs (gate_index, label, kind, owner_role, resets_on_recipe_change, active, note) values")
    rows = []
    for g in defs["gates"]:
        owner = "null" if g["ownerRole"] is None else f"{q(g['ownerRole'])}::staff_role"
        rows.append(
            f"  ({int(g['index'])}, {q(g['label'])}, {q(g['kind'])}, {owner}, "
            f"{'true' if g['resetsOnRecipeChange'] else 'false'}, true, {q(g.get('note',''))})"
        )
    w(",\n".join(rows))
    w("on conflict (gate_index) do nothing;")
    w("")

    w(f"-- {len(defs['ingredientApprovals'])} اعتماد مكوّن (قيم بداية)")
    w("insert into ops_ing_approval_defs (approval_index, label, kind, owner_role, active, note) values")
    rows = []
    for a in defs["ingredientApprovals"]:
        rows.append(
            f"  ({int(a['index'])}, {q(a['label'])}, {q(a['kind'])}, "
            f"{q(a['ownerRole'])}::staff_role, true, {q(a.get('note',''))})"
        )
    w(",\n".join(rows))
    w("on conflict (approval_index) do nothing;")
    w("")

    # --- محاور قرار الإطلاق ---
    # قيم بداية: محور لكل وحدة قائمة في النظام. التنفيذي يوقف أو يعيد التسمية،
    # فـ do nothing على الموجود مثل البوابات.
    w(f"-- {len(axes)} محور جاهزية (قيم بداية — لا تُكتب فوق الموجود)")
    w("insert into ops_launch_axes (axis_index, label, kind, active, note) values")
    w(",\n".join(
        f"  ({int(a['index'])}, {q(a['label'])}, {q(a['kind'])}, "
        f"{'true' if a['active'] else 'false'}, {q(a.get('note',''))})"
        for a in axes))
    w("on conflict (axis_index) do nothing;")
    w("")

    # --- سلامة الغذاء: الخطة والحدود والبرامج والبنود ---
    # قيم بداية قياسية تملكها الجودة بعد التشغيل، فـ do nothing على الموجود.
    w(f"-- خطة HACCP: {len(fs['haccpSteps'])} خطوة (قيم بداية — لا تُكتب فوق الموجود)")
    w("insert into safety_haccp_steps (step_index, label, stage, hazard, hazard_type, control_measure, is_ccp, ccp_code) values")
    w(",\n".join(
        f"  ({int(st['index'])}, {q(st['label'])}, {q(st['stage'])}, {q(st['hazard'])}, "
        f"{q(st['hazardType'])}, {q(st['controlMeasure'])}, {'true' if st['isCcp'] else 'false'}, {q(st['ccpCode'])})"
        for st in fs["haccpSteps"]))
    w("on conflict (step_index) do nothing;")
    w("")

    w(f"-- {len(fs['criticalLimits'])} حد حرج")
    w("insert into safety_critical_limits (step_index, parameter, limit_kind, min_value, max_value, unit, monitoring_method, frequency, corrective_action, sort_order)")
    w("select v.* from (values")
    w(",\n".join(
        f"  ({int(cl['step'])}, {q(cl['parameter'])}, {q(cl['kind'])}, "
        f"{'null' if cl['min'] is None else num(cl['min'])}, {'null' if cl['max'] is None else num(cl['max'])}, "
        f"{q(cl['unit'])}, {q(cl['method'])}, {q(cl['frequency'])}, {q(cl['corrective'])}, {i})"
        for i, cl in enumerate(fs["criticalLimits"])))
    w(") as v(step_index, parameter, limit_kind, min_value, max_value, unit, monitoring_method, frequency, corrective_action, sort_order)")
    w("where not exists (select 1 from safety_critical_limits x")
    w("  where x.step_index = v.step_index and x.parameter = v.parameter);")
    w("")

    w(f"-- {len(fs['prpPrograms'])} برنامج متطلبات أساسية")
    w("insert into safety_prp_programs (code, label, category, owner_role, frequency, sort_order) values")
    w(",\n".join(
        f"  ({q(pr['code'])}, {q(pr['label'])}, {q(pr['category'])}, {q(pr['ownerRole'])}::staff_role, "
        f"{q(pr['frequency'])}, {i})"
        for i, pr in enumerate(fs["prpPrograms"])))
    w("on conflict (code) do nothing;")
    w("")

    w(f"-- {len(fs['isoClauses'])} بند ISO 22000")
    w("insert into safety_iso_clauses (clause, title, owner_role, sort_order) values")
    w(",\n".join(
        f"  ({q(ic['clause'])}, {q(ic['title'])}, {q(ic['ownerRole'])}::staff_role, {i})"
        for i, ic in enumerate(fs["isoClauses"])))
    w("on conflict (clause) do nothing;")
    w("")

    # --- الإعدادات ---
    w("-- إعدادات الحصص والتكلفة والتسعير")
    w(f"insert into ops_settings (id, data) values (1, {jsonb(settings)})")
    w("on conflict (id) do update set data = excluded.data;")
    w("")

    # --- بيانات الدوران ---
    w("-- مسميات الخانات وقواعدها")
    w("insert into ops_rotation_meta (id, slot_labels, slot_rule, day_labels, rules) values")
    w(f"  (1, {arr(rot['slotLabels'])}, {arr(rot['slotRule'])}, "
      f"{arr([d['label'] for d in rot['days']])}, {q(rot.get('rules',''))})")
    w("on conflict (id) do update set")
    w("  slot_labels = excluded.slot_labels, slot_rule = excluded.slot_rule,")
    w("  day_labels = excluded.day_labels, rules = excluded.rules;")
    w("")

    total_slots = sum(len(d["slots"]) for d in rot["days"])
    w(f"-- جدول الدوران: {len(rot['days'])} يوم × {len(rot['days'][0]['slots'])} خانة = {total_slots} خانة")
    w("insert into ops_rotation (day_index, slot, sku) values")
    rows = []
    for d_i, day in enumerate(rot["days"]):
        for s_i, sku in enumerate(day["slots"]):
            rows.append(f"  ({d_i}, {s_i}, {q(sku)})")
    w(",\n".join(rows))
    w("on conflict (day_index, slot) do update set sku = excluded.sku;")
    w("")

    w("commit;")
    w("")
    w("-- تحقق سريع بعد التنفيذ:")
    w("--   select count(*) from ops_ingredients;   -- المتوقع " + str(len(ing)))
    w("--   select count(*) from ops_menu_items;    -- المتوقع " + str(len(men)))
    w("--   select count(*) from ops_recipe_lines;  -- المتوقع " + str(len(rec)))
    w("--   select count(*) from ops_rotation;      -- المتوقع " + str(total_slots))
    w("--   select count(*) from ops_gate_defs;     -- المتوقع " + str(len(defs["gates"])))
    w("--   select count(*) from ops_launch_axes;   -- المتوقع " + str(len(axes)))
    w("--   select count(*) from safety_critical_limits; -- المتوقع " + str(len(fs["criticalLimits"])))
    w("")

    OUT.write_text("\n".join(L), encoding="utf-8")
    print(f"تم التوليد: {OUT.relative_to(ROOT)}")
    print(f"  {len(ing)} مكوّن · {len(men)} صنف · {len(rec)} سطر وصفة · {total_slots} خانة دوران")
    print(f"  الحجم: {OUT.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
