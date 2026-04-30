import { initReactI18next } from "react-i18next";
import { createCookie } from "react-router";
import { createI18nextMiddleware } from "remix-i18next/middleware";
import resources from "~/locales"; // Import your locales
import "i18next";
import { prisma } from "~/lib/db.server";
import { getUserId } from "~/lib/auth.server";

// This cookie will be used to store the user locale preference
export const localeCookie = createCookie("ca_lng", {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
});

export const [i18nextMiddleware, getLocale, getInstance] =
  createI18nextMiddleware({
    detection: {
      supportedLanguages: ["de", "en"], // Your supported languages, the fallback should be last
      fallbackLanguage: "en", // Your fallback language
      cookie: localeCookie, // The cookie to store the user preference
      async findLocale(request) {
        const userId = await getUserId(request)
        if (!userId) return null

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { locale: true },
        })
        return user?.locale || null
      },
    },
    i18next: { resources }, // Your locales
    plugins: [initReactI18next], // Plugins you may need, like react-i18next
  });

// This adds type-safety to the `t` function
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: typeof resources.en; // Use `en` as source of truth for the types
  }
}