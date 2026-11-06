import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { rutaSegura } from "@/lib/rutas";

const TIPOS: EmailOtpType[] = ["magiclink", "email", "signup", "recovery", "invite", "email_change"];

/**
 * Entrada con token de un solo uso (`token_hash`). A diferencia de /auth/callback,
 * funciona aunque el enlace se abra en otro navegador. La usa `npm run enlace-dev`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const destino = rutaSegura(searchParams.get("siguiente"));

  if (tokenHash && tipo && TIPOS.includes(tipo)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
  }

  return NextResponse.redirect(`${origin}/login?error=enlace`);
}
