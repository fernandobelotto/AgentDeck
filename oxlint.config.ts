import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

export default defineConfig({
  extends: [core],
  ignorePatterns: core.ignorePatterns,
  rules: {
    // Owner preference: arrow-function components and declarations.
    "eslint/func-style": "off",
    "react/function-component-definition": "off",
  },
});
