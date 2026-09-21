import { useEffect, useMemo, useRef, useState } from 'react';
import { DocumentRenderSettings, Page, PageFormat } from '../../types/project';
import { PdfPageRenderer } from '../PdfPageRenderer/PdfPageRenderer';

type FitPagePreviewProps = {
  page: Page;
  className?: string;
  padding?: number;
  renderSettings?: DocumentRenderSettings;
  previewPageNumber?: boolean;
};

const pageDimensions: Record<PageFormat, { width: number; height: number }> = {
  a4_portrait: { width: 794, height: 1123 },
  a4_landscape: { width: 1123, height: 794 }
};

export function FitPagePreview({
  page,
  className = '',
  padding = 10,
  renderSettings,
  previewPageNumber = false
}: FitPagePreviewProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const pageFormat = renderSettings?.pageFormat ?? 'a4_portrait';
  const dimensions = pageDimensions[pageFormat];
  const scale = useMemo(() => {
    if (!size.width || !size.height) return 0.1;
    return Math.max(0.01, Math.min((size.width - padding * 2) / dimensions.width, (size.height - padding * 2) / dimensions.height));
  }, [dimensions.height, dimensions.width, padding, size.height, size.width]);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    const update = () => setSize({ width: node.clientWidth, height: node.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className={`fit-page-preview ${className}`.trim()}>
      <div
        className="fit-page-preview-scale"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          transform: `translate(-50%, -50%) scale(${scale})`
        }}
      >
        <PdfPageRenderer
          page={page}
          renderSettings={renderSettings}
          forcePageNumber={previewPageNumber}
        />
      </div>
    </div>
  );
}
