"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { prepararEmpresaDemo } from "@/lib/demo";

/** «Probar el demo»: entra sin correo con una sesión anónima y deja el panel listo. */
export async function entrarDemo() {
  if (!supabaseConfigurado) redirect("/login");
  const supabase = await createClient();

  // Si ya tiene sesión (demo o real), solo lo llevamos al panel
  const { data: actual } = await supabase.auth.getClaims();
  if (actual?.claims) redirect("/panel");

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) redirect("/login?error=demo");

  await prepararEmpresaDemo(data.user.id);
  redirect("/panel?vista=empresa");
}
