import { MindMap, LayoutResult, LayoutType, PositionedNode, ThemeConfig } from '../types';
import { getFontFaces, type FontFaceSource } from './fontFaces';
import { buildFontFamilyCss, LATIN_UNICODE_RANGE, resolveFontStyle } from './fontStyles';
import { CONNECTION_WIDTH, getAnchorY } from './connectionPath';
import { getTheme } from './themes';
import {
  FOLD_COUNT_HEIGHT,
  getFoldCountWidth,
  getFoldMarker,
  getFoldSide,
  getNodeColors,
  getNodeFontSpec,
  getNodeShapeSpec,
  getProgressBadgeSpec,
} from './nodeStyle';
import {
  NODE_ROW,
  estimateProgressBadgeWidth,
  getImageRect,
  getShapeBorderWidth,
  getShapePadding,
  getTextAreaSpan,
} from './nodeDimensions';
import { CHECK_ICON, LINK_ICON, NOTE_ICON, getExportIcon, renderIconSvg } from './exportIcons';

const EXPORT_PADDING = 60;
/** 折りたたみの数の印と、ノードの辺との間隔（画面の入れ物の余白 pl-1 と同じ） */
const FOLD_MARKER_GAP = 4;

/** Image size including the surrounding padding */
export function getExportSize(layout: LayoutResult): { width: number; height: number } {
  return {
    width: layout.bounds.width + EXPORT_PADDING * 2,
    height: layout.bounds.height + EXPORT_PADDING * 2,
  };
}

/** File name for an exported image; characters unusable in file names become `_` */
export function getExportFileName(title: string, ext: 'svg' | 'png'): string {
  return `${title.replace(/[/\\?%*:|"<>]/g, '_')}_mindmap.${ext}`;
}

/**
 * Generate Standalone SVG markup from LayoutResult
 */
export function generateSvgMarkup(map: MindMap, layout: LayoutResult): string {
  const theme = getTheme(map.themeId);
  const minX = layout.bounds.minX - EXPORT_PADDING;
  const minY = layout.bounds.minY - EXPORT_PADDING;
  const { width, height } = getExportSize(layout);

  const fontStyle = resolveFontStyle(map.fontFamily);
  const svgFontFamily = buildFontFamilyCss(fontStyle, "'");
  const usedFaces = usedFontFaceKeys(map, layout);
  const fontFacesCss = getFontFaces(fontStyle.id)
    .filter((face) => usedFaces.has(`${face.weight}-${face.style}`))
    .map(renderFontFaceCss)
    .join('\n    ');

  const pathsSvg = layout.connections
    .map(
      (c) =>
        `<path d="${c.path}" fill="none" stroke="${c.color || theme.lineColor}" stroke-width="${
          c.isRootBranch ? CONNECTION_WIDTH.rootBranch : CONNECTION_WIDTH.branch
        }" stroke-linecap="round" />`
    )
    .join('\n  ');

  const nodesSvg = layout.nodes
    .map((n) => renderNodeSvg(n, n.id === map.rootId, theme, svgFontFamily, map.layoutType))
    .join('\n');

  const bgFill = theme.isDark ? '#020617' : '#f8fafc';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}">${
    fontFacesCss ? `\n  <defs>\n    <style>\n    ${fontFacesCss}\n    </style>\n  </defs>` : ''
  }
  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${bgFill}" />
  <g id="connections">
    ${pathsSvg}
  </g>
  <g id="nodes">
    ${nodesSvg}
  </g>
</svg>`;
}

/**
 * 書き出しで使う同梱フォントの組み合わせ（`500-normal` など）。使う分だけ SVG に埋め込む。
 * ノードの文字は太さ・斜体のとおり、進捗バッジ（100% 以外）と折りたたみの数の印は太字
 */
function usedFontFaceKeys(map: MindMap, layout: LayoutResult): Set<string> {
  const keys = new Set<string>();
  for (const n of layout.nodes) {
    const isRoot = n.id === map.rootId;
    if (n.text) {
      const font = getNodeFontSpec(n, isRoot);
      keys.add(`${font.bold ? 700 : 500}-${font.italic ? 'italic' : 'normal'}`);
    }
    if (n.progress !== undefined && n.progress !== 100) keys.add('700-normal');
    if (getFoldMarker(n, { isEditing: false, isHovered: false, isSelected: false })?.kind === 'count') {
      keys.add('700-normal');
    }
  }
  return keys;
}

/** 同梱フォント 1 つ分の @font-face（data URI）。画面（fontLoader）と同じ名前・範囲で登録する */
function renderFontFaceCss(face: FontFaceSource): string {
  return `@font-face { font-family: '${face.family}'; src: url(${face.dataUri}) format('woff2'); font-weight: ${face.weight}; font-style: ${face.style}; unicode-range: ${LATIN_UNICODE_RANGE}; }`;
}

/** SVG に書く数値の丸め（小数 3 桁） */
function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

const BADGE_HEIGHT = 20; // text-xs の 1 行（16）+ py-0.5
const BADGE_RADIUS = 6; // rounded-control
const BADGE_CHECK_SIZE = 12; // w-3
const INDICATOR_ICON_SIZE = 14; // w-3.5

type NodeShapeSpec = ReturnType<typeof getNodeShapeSpec>;
type NodeColorSet = ReturnType<typeof getNodeColors>;
type NodeFontSpec = ReturnType<typeof getNodeFontSpec>;

/** 画像（画面と同じ位置・大きさで、全体が見えるように置く）。画像がなければ空 */
function renderImageSvg(n: PositionedNode, imageRect: ReturnType<typeof getImageRect>): string {
  if (!imageRect || !n.image) return '';
  return `
      <image href="${escapeXml(n.image)}" x="${round(imageRect.x)}" y="${round(imageRect.y)}" width="${round(
        imageRect.width
      )}" height="${imageRect.height}" preserveAspectRatio="xMidYMid meet" />`;
}

/** 行の左端に置くもの（アイコン・進捗バッジ）。置いた分だけ、文字の列の左端を右へ動かして返す */
function renderLeadingParts(
  n: PositionedNode,
  isRoot: boolean,
  theme: ThemeConfig,
  colors: NodeColorSet,
  svgFontFamily: string,
  startLeft: number,
  centerY: number
): { parts: string[]; left: number } {
  const parts: string[] = [];
  let left = startLeft;

  if (n.icon && colors.icon) {
    parts.push(renderIconSvg(getExportIcon(n.icon), left, centerY - NODE_ROW.iconWidth / 2, NODE_ROW.iconWidth, colors.icon));
    left += NODE_ROW.iconWidth + NODE_ROW.gap;
  }

  if (n.progress !== undefined) {
    const badge = getProgressBadgeSpec(n.progress, isRoot, theme);
    const badgeWidth = estimateProgressBadgeWidth(n.progress);
    const badgeY = centerY - BADGE_HEIGHT / 2;
    parts.push(
      `<rect x="${round(left)}" y="${round(badgeY)}" width="${badgeWidth}" height="${BADGE_HEIGHT}" rx="${BADGE_RADIUS}" fill="${badge.bg}" />`
    );
    parts.push(
      n.progress === 100
        ? renderIconSvg(
            CHECK_ICON,
            left + (badgeWidth - BADGE_CHECK_SIZE) / 2,
            centerY - BADGE_CHECK_SIZE / 2,
            BADGE_CHECK_SIZE,
            badge.check
          )
        : `<text x="${round(left + badgeWidth / 2)}" y="${round(centerY + 4)}" text-anchor="middle" font-family="${svgFontFamily}" font-size="12px" font-weight="bold" fill="${badge.text}">${n.progress}%</text>`
    );
    left += badgeWidth + NODE_ROW.gap;
  }
  return { parts, left };
}

/**
 * 行の右端に置くもの（リンク・メモの印）。置いた分だけ、文字の列の右端を左へ動かして返す。
 * 印は、ないときも間隔（gap）だけは残る（幅の見積もりと同じ）
 */
function renderTrailingIndicators(
  n: PositionedNode,
  colors: NodeColorSet,
  startRight: number,
  centerY: number
): { indicators: string[]; right: number } {
  const indicators: string[] = [];
  let right = startRight - NODE_ROW.gap;
  if (n.link) {
    right -= NODE_ROW.linkWidth;
    const inset = (NODE_ROW.linkWidth - INDICATOR_ICON_SIZE) / 2;
    indicators.push(
      `<g opacity="0.6">${renderIconSvg(LINK_ICON, right + inset, centerY - INDICATOR_ICON_SIZE / 2, INDICATOR_ICON_SIZE, colors.text)}</g>`
    );
    if (n.note) right -= NODE_ROW.indicatorGap;
  }
  if (n.note) {
    right -= NODE_ROW.noteWidth;
    indicators.push(
      `<g opacity="0.6">${renderIconSvg(NOTE_ICON, right, centerY - INDICATOR_ICON_SIZE / 2, INDICATOR_ICON_SIZE, colors.text)}</g>`
    );
  }
  return { indicators, right };
}

/** ノードの文字。ルート以外は左寄せ、ルートは文字の列（left〜right）の中央 */
function renderTextSvg(
  n: PositionedNode,
  isRoot: boolean,
  colors: NodeColorSet,
  font: NodeFontSpec,
  svgFontFamily: string,
  left: number,
  right: number,
  centerY: number
): string {
  const fontAttrs = `font-family="${svgFontFamily}" font-size="${font.px}px" font-weight="${
    font.bold ? 'bold' : '500'
  }"${font.italic ? ' font-style="italic"' : ''}${font.underline ? ' text-decoration="underline"' : ''}`;
  const textX = isRoot ? (left + right) / 2 : left;
  const textAnchor = isRoot ? 'middle' : 'start';

  // 1 行目の位置は、行の中央から文字の高さの分だけ下げる（行数によらず同じ式）
  const lines = (n.text || '').split('\n');
  const startY = centerY - ((lines.length - 1) * font.lineHeight) / 2 + font.px * 0.35;
  const tspans = lines
    .map((line, idx) => `<tspan x="${round(textX)}" y="${round(startY + idx * font.lineHeight)}">${escapeXml(line)}</tspan>`)
    .join('\n        ');
  return `<text text-anchor="${textAnchor}" fill="${colors.text}" ${fontAttrs}>
        ${tspans}
      </text>`;
}

/**
 * ノードの面。枠は、画面と同じく 1px を矩形の内側に収めて描く（塗りの矩形の上に、塗りなしの矩形を重ねる）。
 * 塗りのない形は、下線だけか、何も描かない
 */
function renderBodySvg(n: PositionedNode, shape: NodeShapeSpec, colors: NodeColorSet, borderWidth: number): string {
  if (!shape.filled) {
    return shape.bottomLine
      ? `<line x1="0" y1="${n.height - 1}" x2="${n.width}" y2="${n.height - 1}" stroke="${colors.line}" stroke-width="2" />`
      : '';
  }
  const borderSvg =
    borderWidth > 0
      ? `
      <rect x="${borderWidth / 2}" y="${borderWidth / 2}" width="${n.width - borderWidth}" height="${
          n.height - borderWidth
        }" rx="${Math.max(0, shape.radius - borderWidth / 2)}" fill="none" stroke="${colors.border}"${
          colors.borderOpacity < 1 ? ` stroke-opacity="${round(colors.borderOpacity)}"` : ''
        } stroke-width="${borderWidth}" />`
      : '';
  return `<rect width="${n.width}" height="${n.height}" rx="${shape.radius}" fill="${colors.fill}"${
    colors.fillOpacity < 1 ? ` fill-opacity="${round(colors.fillOpacity)}"` : ''
  } />${borderSvg}`;
}

/**
 * ノード 1 つの SVG。画面（MindNodeComponent）と同じく、形ごとの余白の内側に
 * 「アイコン・進捗バッジ・文字・メモ・リンクの印」を横に並べる。寸法は幅の見積もり（nodeDimensions.ts）と同じ値を使う
 */
function renderNodeSvg(
  n: PositionedNode,
  isRoot: boolean,
  theme: ThemeConfig,
  svgFontFamily: string,
  layoutType: LayoutType
): string {
  const shape = getNodeShapeSpec(n.shape, isRoot, n.height);
  const colors = getNodeColors(n, isRoot, theme);
  const font = getNodeFontSpec(n, isRoot);

  const imageRect = getImageRect(n, isRoot, n.width);
  // 文字の行の中央は、画像がなければノード全体、あれば画像の下の領域の中央
  const textArea = imageRect ? getTextAreaSpan(n, isRoot, n.width, n.height) : { top: 0, bottom: n.height };
  const centerY = (textArea.top + textArea.bottom) / 2;

  // 行の中の並び。左端から「アイコン・バッジ」、右端から「リンク・メモ」を置き、残りが文字の列になる
  const padding = getShapePadding(n.shape, isRoot);
  const borderWidth = getShapeBorderWidth(n.shape, isRoot);
  const leading = renderLeadingParts(n, isRoot, theme, colors, svgFontFamily, padding.left + borderWidth, centerY);
  const trailing = renderTrailingIndicators(n, colors, n.width - padding.right - borderWidth, centerY);

  // 閉じているノードの数の印。画面（NodeActionButtons）と同じく、線の出口の外に枝色で置く
  const foldMarker = getFoldMarker(n, { isEditing: false, isHovered: false, isSelected: false });
  const foldSvg =
    foldMarker?.kind === 'count' ? renderFoldCountSvg(n, isRoot, layoutType, foldMarker.count, svgFontFamily) : '';

  const bodySvg = renderBodySvg(n, shape, colors, borderWidth);
  const imageSvg = renderImageSvg(n, imageRect);
  const textSvg = renderTextSvg(n, isRoot, colors, font, svgFontFamily, leading.left, trailing.right, centerY);
  const partsSvg = leading.parts.map((p) => `\n      ${p}`).join('');
  const indicatorsSvg = trailing.indicators.map((p) => `\n      ${p}`).join('');

  return `
    <g transform="translate(${n.x}, ${n.y})">
      ${bodySvg}${imageSvg}${partsSvg}
      ${textSvg}${indicatorsSvg}${foldSvg}
    </g>`;
}

/** 折りたたみの数の印（ノードの座標系）。辺から 4px 離れた、線の出口の高さに置く */
function renderFoldCountSvg(
  n: PositionedNode,
  isRoot: boolean,
  layoutType: LayoutType,
  count: number,
  svgFontFamily: string
): string {
  const width = getFoldCountWidth(count);
  const side = getFoldSide(isRoot, layoutType, n.effectiveSide);
  const x = side === 'right' ? n.width + FOLD_MARKER_GAP : -FOLD_MARKER_GAP - width;
  const centerY = getAnchorY(n) - n.y;
  return `
      <rect x="${round(x)}" y="${round(centerY - FOLD_COUNT_HEIGHT / 2)}" width="${width}" height="${FOLD_COUNT_HEIGHT}" rx="${
    FOLD_COUNT_HEIGHT / 2
  }" fill="${n.branchColor}" />
      <text x="${round(x + width / 2)}" y="${round(centerY + 4)}" text-anchor="middle" font-family="${svgFontFamily}" font-size="11px" font-weight="bold" fill="#ffffff">${count}</text>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}
