// Procesa y optimiza imágenes manteniendo la máxima calidad posible y fidelidad visual.

const MAX_DIMENSION = 3840; // 4K Ultra HD
const QUALITY = 0.98; // Máxima calidad sin degradación perceptible

export async function fileToCompressedDataUrl(
  file: File,
  maxDimension = MAX_DIMENSION,
): Promise<string> {
  const rawDataUrl = await readAsDataUrl(file);
  
  // Si la imagen es PNG o SVG, o el archivo ya es ligero (< 3MB), preservamos el formato original íntegro
  if (file.type === 'image/png' || file.type === 'image/svg+xml' || (file.size < 3 * 1024 * 1024 && !file.type.includes('tiff'))) {
    try {
      // Solo ajustamos si excede dimensiones descomunales (> 4K)
      return await downscaleIfExceeds(rawDataUrl, maxDimension, file.type);
    } catch {
      return rawDataUrl;
    }
  }

  try {
    return await downscale(rawDataUrl, maxDimension, file.type || 'image/png');
  } catch {
    return rawDataUrl;
  }
}

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen'));
    reader.readAsDataURL(file);
  });
}

function downscaleIfExceeds(dataUrl: string, maxDimension: number, mimeType: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        if (img.width <= maxDimension && img.height <= maxDimension) {
          return resolve(dataUrl);
        }
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        const format = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(format, QUALITY));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => reject(new Error('Imagen inválida'));
    img.src = dataUrl;
  });
}

function downscale(dataUrl: string, maxDimension: number, mimeType: string): Promise<string> {
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
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        const format = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(format, QUALITY));
      } catch (err) {
        reject(err as Error);
      }
    };
    img.onerror = () => reject(new Error('Imagen inválida'));
    img.src = dataUrl;
  });
}
