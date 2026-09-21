import { PageFormat } from '../types/project';

const COLOR_FUNCTION_PATTERN = /color\(\s*srgb\s+([^)]*)\)/gi;
const COLOR_STYLE_PROPERTIES = [
  'background-color',
  'border-bottom-color',
  'border-left-color',
  'border-right-color',
  'border-top-color',
  'box-shadow',
  'caret-color',
  'color',
  'column-rule-color',
  'fill',
  'outline-color',
  'stroke',
  'text-decoration-color',
  'text-emphasis-color',
  'text-shadow',
  '-webkit-text-fill-color',
  '-webkit-text-stroke-color'
] as const;

function srgbChannelToByte(channel: string): number | null {
  const value = Number.parseFloat(channel);
  if (!Number.isFinite(value)) return null;
  return Math.round(Math.min(1, Math.max(0, value)) * 255);
}

function srgbColorToRgba(contents: string, originalColor: string): string {
  const [channelsPart, alphaPart] = contents.split('/').map((part) => part.trim());
  const channels = channelsPart.split(/\s+/);
  if (channels.length !== 3) return originalColor;

  const rgb = channels.map(srgbChannelToByte);
  if (rgb.some((channel) => channel === null)) return originalColor;

  const parsedAlpha = alphaPart ? Number.parseFloat(alphaPart) : 1;
  const alpha = Number.isFinite(parsedAlpha) ? Math.min(1, Math.max(0, parsedAlpha)) : 1;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function replaceUnsupportedColors(value: string): string {
  return value.replace(COLOR_FUNCTION_PATTERN, (color, contents: string) => srgbColorToRgba(contents, color));
}

function normalizeColorsForCanvas(sourceElement: HTMLElement, clonedElement: HTMLElement): void {
  const sourceNodes = [sourceElement, ...Array.from(sourceElement.querySelectorAll<HTMLElement>('*'))];
  const clonedNodes = [clonedElement, ...Array.from(clonedElement.querySelectorAll<HTMLElement>('*'))];

  sourceNodes.forEach((sourceNode, index) => {
    const clonedNode = clonedNodes[index];
    if (!clonedNode) return;

    const computedStyle = window.getComputedStyle(sourceNode);
    COLOR_STYLE_PROPERTIES.forEach((property) => {
      const value = computedStyle.getPropertyValue(property);
      if (!value.includes('color(')) return;
      clonedNode.style.setProperty(property, replaceUnsupportedColors(value), 'important');
    });
  });
}

export function snapExportBox(box: { left: number; top: number; width: number; height: number }) {
  return {
    left: Math.round(box.left),
    top: Math.round(box.top),
    width: Math.max(1, Math.round(box.width)),
    height: Math.max(1, Math.round(box.height))
  };
}

function prepareExportClone(clonedElement: HTMLElement) {
  clonedElement.style.opacity = '1';
  clonedElement.style.visibility = 'visible';
  clonedElement.style.transform = 'none';
  clonedElement.style.left = '0';
  clonedElement.style.top = '0';
  clonedElement.style.position = 'relative';
  clonedElement.style.margin = '0';

  clonedElement.querySelectorAll<HTMLElement>('.page-zone').forEach((zone) => {
    const next = snapExportBox({
      left: zone.offsetLeft,
      top: zone.offsetTop,
      width: zone.offsetWidth,
      height: zone.offsetHeight
    });
    zone.style.left = `${next.left}px`;
    zone.style.top = `${next.top}px`;
    zone.style.width = `${next.width}px`;
    zone.style.height = `${next.height}px`;
  });

  clonedElement.querySelectorAll('img').forEach((image) => {
    image.loading = 'eager';
    image.decoding = 'sync';
    image.style.maxWidth = 'none';
  });
}

function waitForElementImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll('img'));
  return Promise.all(images.map((image) => {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const finish = () => resolve();
      image.addEventListener('load', finish, { once: true });
      image.addEventListener('error', finish, { once: true });
    });
  }));
}

export async function exportElementsToPdf(elements: HTMLElement[], filename: string, pageFormat: PageFormat = 'a4_portrait'): Promise<void> {
  if (!elements.length) {
    throw new Error('Не найдены страницы для PDF-экспорта.');
  }

  const [{ default: html2canvas }, jspdfModule] = await Promise.all([
    import('html2canvas'),
    import('jspdf')
  ]);
  const PdfConstructor = jspdfModule.default ?? jspdfModule.jsPDF;

  const isLandscape = pageFormat === 'a4_landscape';
  const pdf = new PdfConstructor({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;

  for (let index = 0; index < elements.length; index += 1) {
    const element = elements[index];
    await waitForElementImages(element);

    const canvas = await html2canvas(element, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      imageTimeout: 15000,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.offsetWidth,
      windowHeight: element.offsetHeight,
      width: element.offsetWidth,
      height: element.offsetHeight,
      onclone: (_document, clonedElement) => {
        normalizeColorsForCanvas(element, clonedElement);
        prepareExportClone(clonedElement);
      }
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    if (index > 0) pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  }

  pdf.save(filename.replace(/[\\/:*?"<>|]+/g, '-'));
}
