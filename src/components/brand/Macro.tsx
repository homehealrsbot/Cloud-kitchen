// شارات الماكروز وأشرطتها — بكود ألوان الهوية، وبمكان واحد.
//
// كانت الشارة مكتوبة داخل صفحة المنيو وحدها. التطبيق وصفحة الصنف يحتاجونها
// بنفس الشكل بالضبط، وثبات هذا الكود هو نص فائدته: العميل يعرف الرقم بلمحة
// بدل ما يقرأ الكلمة كل مرة. فنُقلت هنا.

import { MACRO, type MacroKey } from "@/lib/brand";
import { T } from "@/lib/kitchen-shared";

/** شارة ماكرو: بروتين ليموني، كارب برتقالي، دهون كريمي. */
export function MacroChip({ macro, value, size = "md" }: { macro: MacroKey; value: number; size?: "sm" | "md" }) {
  const m = MACRO[macro];
  const sm = size === "sm";
  return (
    <span
      className={`flex-1 rounded-lg text-center leading-none ${sm ? "px-1.5 py-1" : "px-2 py-1.5"}`}
      // الدهون كريمية على خلفية بيضاء — بدون حد تختفي حوافها
      style={{ background: m.bg, color: m.fg, border: macro === "fat" ? `1px solid ${T.border}` : undefined }}
    >
      <span className={`num block font-extrabold ${sm ? "text-[11px]" : "text-[13px]"}`}>{value}g</span>
      <span className={`block font-bold opacity-80 ${sm ? "text-[8px] mt-0.5" : "text-[9px] mt-0.5"}`}>{m.label}</span>
    </span>
  );
}

/**
 * شريط ماكرو على خلفية غابية — نفس بطاقة التطبيق في دليل الهوية.
 * القيمة نسبة مئوية من 0 إلى 100.
 */
export function MacroBar({ macro, pct }: { macro: MacroKey; pct: number }) {
  const m = MACRO[macro];
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="num text-[11px] font-bold" style={{ color: "#FFFFFFB3" }}>{Math.round(clamped)}%</span>
        <span className="text-[11px] font-bold" style={{ color: "#FFFFFF" }}>{m.label}</span>
      </div>
      {/* التعبئة تبدأ من اليمين — اتجاه القراءة العربي، مثل الشاشة في الدليل */}
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "#FFFFFF1F" }}>
        <div className="h-full rounded-full" style={{ width: `${clamped}%`, background: m.bg }} />
      </div>
    </div>
  );
}

/**
 * نسبة طاقة كل ماكرو من مجموع السعرات: بروتين 4، كارب 4، دهون 9 سعرات للجرام.
 * نفس المعادلة اللي يتحقق فيها المحرك من اتساق القيم (kcalDiff).
 */
export function energySplit(protein: number, carb: number, fat: number) {
  const kcal = 4 * protein + 4 * carb + 9 * fat;
  if (kcal <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: (4 * protein * 100) / kcal,
    carbs: (4 * carb * 100) / kcal,
    fat: (9 * fat * 100) / kcal,
  };
}
