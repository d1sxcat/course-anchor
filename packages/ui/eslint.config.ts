import { defineConfig } from "eslint/config";

import { baseConfig } from "@course-anchor/eslint-config/base";
import { reactConfig } from "@course-anchor/eslint-config/react";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  reactConfig,
);