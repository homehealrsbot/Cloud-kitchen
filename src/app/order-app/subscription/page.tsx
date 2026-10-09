import ComingSoon from "@/components/order/ComingSoon";

export const metadata = { title: "اشتراكي — Macro Meals" };

// قبل: خطة ثابتة "تنزيل وزن — أسبوعية" مع حالة (نشط/متوقف/ملغى) في الذاكرة فقط،
// تضيع عند تحديث الصفحة. إيقاف اشتراك ما يُحفظ في أي مكان أسوأ من عدم وجود الزر.
export default function SubscriptionPage() {
  return (
    <ComingSoon
      title="اشتراكي"
      what="إدارة الاشتراك قيد البناء"
      needs="الإيقاف والإلغاء الفوري لازم يُحفظان في جدول الاشتراكات ويوقفان التوصيل فعلياً — مو زر يغيّر شكل الشاشة فقط."
    />
  );
}
