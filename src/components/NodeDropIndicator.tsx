import { t } from '../i18n';
import React from 'react';
import { ArrowLeft, ArrowRight, FolderPlus } from 'lucide-react';
import { DropPosition } from '../utils/treeOperations';

interface NodeDropIndicatorProps {
  /** このノードがドロップ先のときの位置。ドロップ先でなければ null */
  position: DropPosition | null;
  /** ルートに落とすときに入る側（放射状のみ）。あれば「子ノードとして追加」の代わりに、入る側の縁に出す */
  side?: 'left' | 'right';
}

// 前後の挿入線は、上下の位置以外は同じ見た目
const INSERT_LINE_POSITION_CLASS = {
  before: '-top-3.5',
  after: '-bottom-3.5',
} as const;
const INSERT_LINE_LABEL = {
  before: t('drop.before'),
  after: t('drop.after'),
} as const;

const InsertLine: React.FC<{ position: 'before' | 'after' }> = ({ position }) => (
  <div
    className={`absolute ${INSERT_LINE_POSITION_CLASS[position]} left-0 right-0 h-1.5 bg-accent rounded-full z-50 pointer-events-none flex items-center justify-center`}
  >
    <span className="bg-accent text-on-accent text-[11px] font-medium px-2 py-0.5 rounded-control whitespace-nowrap flex items-center gap-1">
      {INSERT_LINE_LABEL[position]}
    </span>
  </div>
);

// ルートの左右の縁に出す縦線と札
const SIDE_LINE_CLASS = {
  left: '-left-2',
  right: '-right-2',
} as const;
const SIDE_LABEL_CLASS = {
  left: 'right-full mr-1',
  right: 'left-full ml-1',
} as const;

const SideLine: React.FC<{ side: 'left' | 'right' }> = ({ side }) => (
  <div
    className={`absolute ${SIDE_LINE_CLASS[side]} top-0 bottom-0 w-1.5 bg-accent rounded-full z-50 pointer-events-none`}
  >
    <span
      className={`absolute top-1/2 -translate-y-1/2 ${SIDE_LABEL_CLASS[side]} bg-accent text-on-accent text-[11px] font-medium px-2 py-0.5 rounded-control whitespace-nowrap flex items-center gap-1`}
    >
      {side === 'left' ? <ArrowLeft className="w-3 h-3" /> : null}
      <span>{side === 'left' ? t('drop.addLeft') : t('drop.addRight')}</span>
      {side === 'right' ? <ArrowRight className="w-3 h-3" /> : null}
    </span>
  </div>
);

/** ドラッグ中の「上に挿入」「下に挿入」「子ノードとして追加」「左側・右側に追加」の表示 */
export const NodeDropIndicator: React.FC<NodeDropIndicatorProps> = ({ position, side }) => {
  if (position === 'inside' && side) return <SideLine side={side} />;
  if (position === 'before' || position === 'after') return <InsertLine position={position} />;
  if (position === 'inside') {
    return (
      <div className="absolute -top-3.5 right-1 bg-accent text-on-accent text-[11px] font-medium px-2 py-0.5 rounded-control z-50 pointer-events-none whitespace-nowrap flex items-center gap-1">
        <FolderPlus className="w-3 h-3" />
        <span>{t('drop.asChild')}</span>
      </div>
    );
  }
  return null;
};
