import type { ResourceLanguage } from "i18next";
import notFound from "./not-found";
import translation from "./translation";
import auth from "./auth";

export default { notFound, translation, auth } satisfies ResourceLanguage;