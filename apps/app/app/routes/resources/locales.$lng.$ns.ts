import { data } from "react-router";
import { z } from "zod";
import resources from "~/locales";
import type { Route } from "./+types/locales.$lng.$ns";

export async function loader({ params }: Route.LoaderArgs) {
  const lng = z
    .enum(Object.keys(resources) as Array<keyof typeof resources>)
    .safeParse(params.lng);

  if (lng.error) return data({ error: lng.error }, { status: 400 });

  const namespaces = resources[lng.data];

  const ns = z
    .enum(Object.keys(namespaces) as Array<keyof typeof namespaces>)
    .safeParse(params.ns);

  if (ns.error) return data({ error: ns.error }, { status: 400 });

  const headers = new Headers();

  if (process.env.NODE_ENV === "production") {
    headers.set(
      "Cache-Control", "max-age=300, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=604800"
    );
  }

  return data(namespaces[ns.data], { headers });
}

export function LanguageSwitch() {
  
}