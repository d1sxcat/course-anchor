import { defineConfig } from "eslint/config";

import { baseConfig } from "@course-anchor/eslint-config/base";
import { reactRouter } from "@course-anchor/eslint-config/react-router";

export default defineConfig(
  {
		files: ['**/tests/**/*.ts'],
	},
	{
		ignores: ['.react-router/*'],
	},
  //baseConfig,
  reactRouter,
);