import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // كود React Bits مستورَد كما هو من المكتبة ولا نعدّله: تعديله يعني أن
    // تحديثه لاحقاً يمسح تعديلنا بصمت. فحصه بقواعدنا يبلّغ عن أنماط فيه لا
    // نملك إصلاحها، ويخفي خلفها أخطاءنا نحن.
    "src/components/react-bits/**",
  ]),
]);

export default eslintConfig;
