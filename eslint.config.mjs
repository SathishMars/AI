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
  {
    // Relax some rules for test and mock files to avoid large bulk edits
    files: ["src/test/**", "src/test/**/*", "**/__mocks__/**", "src/test/**/__mocks__/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "react/display-name": "off",
      "@typescript-eslint/no-unused-vars": "off"
    },
  },
];

export default eslintConfig;
