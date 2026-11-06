export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** false mientras no exista .env.local: la app arranca y muestra cómo configurarla. */
export const supabaseConfigurado = Boolean(supabaseUrl && supabaseKey);
