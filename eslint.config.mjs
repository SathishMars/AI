import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const sharedIgnores = [
  "**/node_modules/**",
  "**/.next/**",
  "**/out/**",
  "**/build/**",
  "**/dist/**",
  "**/coverage/**",
  "next-env.d.ts",
];

const eslintConfig = [
  {
    ignores: sharedIgnores,
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["jest.setup.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
