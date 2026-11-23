import { MindMap, LayoutResult } from '../types';
import { generateSvgMarkup, getExportFileName, getExportSize } from '../utils/exportUtils';
import { storageAdapter } from './storageAdapter';

/**
 * Export to standalone SVG file
 */
export function exportMapToSvgFile(map: MindMap, layout: LayoutResult) {
  const svg = generateSvgMarkup(map, layout);
  storageAdapter.exportFile(getExportFileName(map.title, 'svg'), svg, 'svg');
}

/**
 * Export to high-resolution PNG image
 */
export function exportMapToPngFile(map: MindMap, layout: LayoutResult) {
  const svgString = generateSvgMarkup(map, layout);
  const { width, height } = getExportSize(layout);
  const filename = getExportFileName(map.title, 'png');

  const canvas = document.createElement('canvas');
  const scaleFactor = 2; // Retina / high quality 2x scale
  canvas.width = width * scaleFactor;
  canvas.height = height * scaleFactor;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(scaleFactor, scaleFactor);

  const img = new Image();
  // Use data URL for high compatibility across CSP environments
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

  img.onload = () => {
    ctx.drawImage(img, 0, 0);
    storageAdapter.exportFile(filename, canvas.toDataURL('image/png'), 'png');
  };

  img.onerror = (err) => {
    console.error('Failed to load SVG for PNG conversion, attempting fallback:', err);
    // Fallback using Blob URL
    try {
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        ctx.drawImage(fallbackImg, 0, 0);
        URL.revokeObjectURL(blobUrl);
        storageAdapter.exportFile(filename, canvas.toDataURL('image/png'), 'png');
      };
      fallbackImg.src = blobUrl;
    } catch (fallbackErr) {
      console.error('PNG export failed completely:', fallbackErr);
    }
  };

  img.src = svgDataUrl;
}
