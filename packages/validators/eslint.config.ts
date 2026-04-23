import { defineConfig } from "eslint/config";

import { baseConfig } from "@course-anchor/eslint-config/base";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
);
