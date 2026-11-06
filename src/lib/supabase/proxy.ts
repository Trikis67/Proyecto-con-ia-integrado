import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigurado, supabaseKey, supabaseUrl } from "./config";

const RUTAS_PRIVADAS = ["/panel"];

/** Refresca la sesión en cada petición y saca a /login a quien no tenga sesión. */
export async function actualizarSesion(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!supabaseConfigurado) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const conSesion = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!conSesion && RUTAS_PRIVADAS.some((r) => pathname.startsWith(r))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("siguiente", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
