/**
 * Límites de subida de PDFs, compartidos por la ruta del servidor y la página.
 * La API de Claude acepta hasta 32 MB por petición y el PDF viaja en base64 (≈ +33%):
 * 20 MB entre todos los archivos deja margen para los datos y el análisis anterior.
 */
export const MAX_PDFS = 5;
export const MAX_TOTAL_MB = 20;
