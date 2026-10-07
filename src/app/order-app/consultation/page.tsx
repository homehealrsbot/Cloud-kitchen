import ComingSoon from "@/components/order/ComingSoon";

export const metadata = { title: "استشارة تغذية — Macro meals" };

// قبل: 5 مواعيد متاحة مكتوبة في الكود، والحجز ما يُحفظ في أي مكان.
export default function ConsultationPage() {
  return (
    <ComingSoon
      title="استشارة تغذية"
      what="حجز الاستشارات قيد البناء"
      needs="المواعيد المتاحة والحجز الفعلي يحتاجان جدول مواعيد مرتبطاً بتقويم أخصائي التغذية — عشان ما نعرض موعداً مو متاح فعلاً."
    />
  );
}
