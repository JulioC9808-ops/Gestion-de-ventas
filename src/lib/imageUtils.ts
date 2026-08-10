// Reduce y comprime imágenes antes de guardarlas en la base local.
// Evita que la app se quede en negro por falta de memoria/espacio en Android.

const MAX_DIMENSION = 1280;
const QUALITY = 0.72;

export async function fileToCompressedDataUrl(
  file: File,
  maxDimension = MAX_DIMENSION,
): Promise<string> {
  const rawDataUrl = await readAsDataUrl(file);
  try {
    return await downscale(rawDataUrl, maxDimension);
  } catch {
    // Si el navegador no pudo procesar la imagen, devolvemos el original
    return rawDataUrl;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

function downscale(dataUrl: string, maxDimension: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Sin contexto 2D'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', QUALITY));
      } catch (err) {
        reject(err as Error);
      }
    };
    img.onerror = () => reject(new Error('Imagen inválida'));
    img.src = dataUrl;
  });
}
