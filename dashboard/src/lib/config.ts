/** Dev override: treat every signed-in user as admin. Keep false in production. */
export const DEV_ALL_ADMIN = false;

/**
 * OpenCV / ML Kit remote OCR analyse API.
 * Use same-origin `/api/ocr` so the browser never hits Railway directly
 * (Railway does not send Access-Control-Allow-Origin). Vite and Vercel
 * proxy this path to:
 * https://plastictrade-image-fetcher-production.up.railway.app/process
 */
export const OCR_PROCESS_URL = '/api/ocr';

export const OCR_TIMEOUT_MS = 120_000;
