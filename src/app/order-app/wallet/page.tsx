import ComingSoon from "@/components/order/ComingSoon";

export const metadata = { title: "باقتي — Macro Meals" };

// قبل: رصيد 30 يوم مع 6 أيام مستخدمة و3 عمليات خصم مكتوبة في الكود.
// نظام الاشتراكات والمحفظة بالأيام يحتاج جداول subscriptions و wallet_ledger.
export default function WalletPage() {
  return (
    <ComingSoon
      title="باقتي"
      what="نظام الباقات والمحفظة قيد البناء"
      needs="رصيد الباقة بالأيام وسجل الخصم اليومي يحتاجان جدولي الاشتراكات وحركة المحفظة في قاعدة البيانات. المرحلة القادمة."
    />
  );
}
