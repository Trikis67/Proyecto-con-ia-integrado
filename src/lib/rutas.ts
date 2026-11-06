/** Solo rutas internas, para que nadie use el login como redirección a otro sitio. */
export function rutaSegura(ruta: unknown, porDefecto = "/panel") {
  return typeof ruta === "string" && ruta.startsWith("/") && !ruta.startsWith("//") && !ruta.startsWith("/\\")
    ? ruta
    : porDefecto;
}
