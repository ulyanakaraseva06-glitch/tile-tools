export const MAX_IMAGE_SIDE = 2600;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type CompressImageOptions = {
  maxSide?: number;
  maxBytes?: number;
  quality?: number;
  outputType?: 'image/jpeg' | 'image/png';
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export async function compressImage(file: File, options: CompressImageOptions = {}): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Поддерживаются JPG, PNG и WebP.');
  }
  const maxBytes = options.maxBytes ?? MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    throw new Error(`Файл слишком большой. Загрузите изображение до ${Math.round(maxBytes / 1024 / 1024)} МБ.`);
  }

  const dataUrl = await fileToDataUrl(file);
  const image = await loadImage(dataUrl);
  const maxSide = options.maxSide ?? MAX_IMAGE_SIDE;
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.round(image.width * ratio);
  const height = Math.round(image.height * ratio);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return dataUrl;
  context.drawImage(image, 0, 0, width, height);
  const keepPng = (options.outputType ?? file.type) === 'image/png';
  if (keepPng) return canvas.toDataURL('image/png');
  return canvas.toDataURL(options.outputType ?? 'image/jpeg', options.quality ?? 0.92);
}
