// المسار القديم صار يحوّل.
//
// قراءات حرارة التخزين ما عادت سجلاً منفصلاً بحدود مكتوبة في الكود
// (SAFE_RANGES). صارت حدوداً حرجة تحت خطوة «التخزين البارد» في خطة HACCP،
// والقراءات تُسجَّل في سجل مراقبة النقاط الحرجة وتُحكم بها، وتُعتمد بتوقيع ثانٍ.

import { redirect } from "next/navigation";

export default function TemperatureLogRedirect() {
  redirect("/admin/safety/ccp");
}
