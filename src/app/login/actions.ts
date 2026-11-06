"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { rutaSegura } from "@/lib/rutas";

export type EstadoLogin =
  | { tipo: "inicio" }
  | { tipo: "enviado"; correo: string }
  | { tipo: "error"; mensaje: string; correo?: string; intento?: number };

export async function enviarEnlace(_previo: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  if (!supabaseConfigurado) {
    return { tipo: "error", mensaje: "El servidor aún no está conectado a Supabase." };
  }

  const correo = String(form.get("correo") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return { tipo: "error", mensaje: "Ese correo no parece válido. Revisa que tenga @ y dominio.", correo, intento: Date.now() };
  }

  const origen = (await headers()).get("origin") ?? "http://localhost:3000";
  const siguiente = rutaSegura(form.get("siguiente"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: correo,
    options: { emailRedirectTo: `${origen}/auth/callback?siguiente=${encodeURIComponent(siguiente)}` },
  });

  if (error) {
    return {
      tipo: "error",
      correo,
      intento: Date.now(),
      mensaje:
        error.status === 429
          ? "Se enviaron demasiados enlaces en poco tiempo. Usa el último que te llegó o vuelve a intentarlo en una hora."
          : "No pudimos enviar el enlace. Intenta de nuevo en un momento.",
    };
  }

  return { tipo: "enviado", correo };
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
