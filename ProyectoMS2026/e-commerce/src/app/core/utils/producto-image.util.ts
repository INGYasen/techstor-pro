export function resolveProductoImagenUrl(imagenUrl?: string | null): string | null {
  if (!imagenUrl) {
    return null;
  }

  if (imagenUrl.startsWith('http://') || imagenUrl.startsWith('https://') || imagenUrl.startsWith('data:')) {
    return imagenUrl;
  }

  return imagenUrl.startsWith('/') ? imagenUrl : `/${imagenUrl}`;
}
