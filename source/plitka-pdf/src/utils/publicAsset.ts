const pdfAssetPrefixes = ['/brand/', '/landing/', '/placeholders/'];

/**
 * Resolve bundled PDF assets against the deployment base. External URLs,
 * uploaded data and shared Tile Tools media must remain untouched.
 */
export function resolvePublicAssetUrl(src: string): string {
  if (!src || !pdfAssetPrefixes.some((prefix) => src.startsWith(prefix))) return src;

  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${src.replace(/^\/+/, '')}`;
}
