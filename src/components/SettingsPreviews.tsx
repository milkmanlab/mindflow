import React from 'react';
import { ConnectorStyle, NodeShape, ThemeConfig } from '../types';
import { buildPath } from '../utils/connectionPath';
import { getNodeShapeClass } from '../utils/nodeStyle';

// 設定メニューとプロパティバーの選択肢に添える、小さな見本の絵。
// クラス文字列は Tailwind が拾えるよう、すべて完全な形で書く

/** テーマの見本：背景の上に、ルート・子ノード 2 つ・枝の線（今選んでいる接続線の形）を置く */
export const ThemePreview: React.FC<{ theme: ThemeConfig; connectorStyle: ConnectorStyle }> = ({ theme, connectorStyle }) => {
  const [c1, c2] = [theme.branchColors[0], theme.branchColors[1] ?? theme.branchColors[0]];
  return (
    <span
      className={`relative block w-14 h-7 rounded-control border border-line overflow-hidden shrink-0 ${theme.bgClass}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 56 28" className="absolute inset-0 w-full h-full" fill="none" strokeWidth="1.5">
        <path d={buildPath({ x: 19, y: 14 }, { x: 32, y: 8 }, 'right', connectorStyle)} stroke={c1} />
        <path d={buildPath({ x: 19, y: 14 }, { x: 32, y: 20 }, 'right', connectorStyle)} stroke={c2} />
        <rect x="5" y="9.5" width="14" height="9" rx="2.5" fill={theme.root.bg} stroke={theme.root.border} />
        <rect x="32" y="5" width="17" height="6" rx="2" fill={theme.node.bg} stroke={theme.node.border} />
        <rect x="32" y="17" width="17" height="6" rx="2" fill={theme.node.bg} stroke={theme.node.border} />
      </svg>
    </span>
  );
};

/** 接続線の見本：実際の接続線と同じパスで、1 つの親から 2 つの子へ引く */
export const ConnectorPreview: React.FC<{ style: ConnectorStyle }> = ({ style }) => {
  const start = { x: 3, y: 10 };
  return (
    <svg viewBox="0 0 28 20" className="w-7 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d={buildPath(start, { x: 25, y: 3 }, 'right', style)} />
      <path d={buildPath(start, { x: 25, y: 17 }, 'right', style)} />
    </svg>
  );
};

/** ノードの形の見本。角丸・枠は実際のノードと同じクラス（nodeStyle.ts）を使う */
export const ShapePreview: React.FC<{ shape: NodeShape }> = ({ shape }) => (
  <span
    className={`block w-7 h-4 shrink-0 border-ink-muted ${getNodeShapeClass(shape, false)}`}
    // 枠のない形は、面で形を示す
    style={shape === 'borderless' ? { backgroundColor: 'color-mix(in srgb, currentColor 15%, transparent)' } : undefined}
    aria-hidden="true"
  />
);
