import ComingSoon from "@/components/order/ComingSoon";

export const metadata = { title: "تتبع تقدمي — Macro Meals" };

// قبل: مسار وزن من 82 إلى 78.8 كجم على 6 أسابيع + مذكرة طعام — كلها مكتوبة في الكود.
export default function ProgressPage() {
  return (
    <ComingSoon
      title="تتبع تقدمك"
      what="تتبع الوزن ومذكرة الطعام قيد البناء"
      needs="المسار يحتاج جدول قياسات الوزن وربط الوجبات المستلمة فعلياً باشتراكك، عشان تكون الأرقام قياساتك أنت مو عيّنة."
    />
  );
}
