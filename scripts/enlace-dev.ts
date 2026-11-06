/**
 * Solo para desarrollo local: genera un enlace de entrada sin mandar correo
 * (el correo gratuito de Supabase permite muy pocos envíos por hora).
 *
 *   npm run enlace-dev -- tu@correo.com
 *
 * El enlace sirve una sola vez y caduca en una hora. No lo compartas: da acceso a esa cuenta.
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const correo = process.argv[2]?.trim().toLowerCase();
  if (!correo || !correo.includes("@")) {
    console.error("Uso: npm run enlace-dev -- tu@correo.com");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secreta = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secreta) {
    console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, secreta, { auth: { persistSession: false } });
  // Solo cuentas que ya existen: este comando no crea usuarios
  const { data, error } = await supabase.auth.admin.generateLink({ type: "magiclink", email: correo });
  if (error) {
    console.error("No se pudo generar el enlace:", error.message);
    process.exit(1);
  }

  const base = process.env.SITIO_URL ?? "http://localhost:3000";
  const enlace = `${base}/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink&siguiente=/panel`;
  console.log(`\nAbre este enlace en el navegador donde quieres entrar (sirve una vez, caduca en 1 hora):\n\n${enlace}\n`);
}

main();
