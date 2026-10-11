import ComingSoon from "@/components/order/ComingSoon";

export const metadata = { title: "تأكيد التسليم — Macro Meals" };

// قبل: طلب ثابت "#A1042 — شوفان بروتين + فواكه" مع عنوان مكتوب في الكود.
export default function DeliveryProofPage() {
  return (
    <ComingSoon
      title="تأكيد التسليم"
      what="توثيق التسليم قيد البناء"
      needs="التوثيق بالموقع والصورة يحتاج جدول الطلبات اليومية وربطه بمندوب التوصيل، عشان يكون التوثيق على طلب حقيقي."
    />
  );
}
