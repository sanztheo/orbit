import tsParser from "@typescript-eslint/parser";

// Root config — covers backend/ and frontend/ TypeScript files with no rules.
// Each app has its own full ESLint config; this exists only to satisfy the
// PostToolUse ESLint hook when it lints individual files from the project root.
export default [
  {
    files: ["*.mjs", "*.js", "*.cjs"],
  },
  {
    files: ["backend/**/*.ts", "frontend/**/*.ts", "frontend/**/*.tsx"],
    languageOptions: { parser: tsParser },
  },
];
