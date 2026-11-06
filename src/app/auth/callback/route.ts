import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rutaSegura } from "@/lib/rutas";

/** El enlace del correo llega aquí con un código; lo cambiamos por una sesión. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const codigo = searchParams.get("code");
  const destino = rutaSegura(searchParams.get("siguiente"));

  if (codigo) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
  }

  return NextResponse.redirect(`${origin}/login?error=enlace`);
}
