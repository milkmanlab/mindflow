import { t } from '../i18n';
import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { LayoutType, PositionedNode } from '../types';
import { getAnchorY } from '../utils/connectionPath';
import { getShapeBorderWidth } from '../utils/nodeDimensions';
import {
  ChildAddButtonSpec,
  FOLD_COUNT_HEIGHT,
  FoldMarker,
  getChildAddSides,
  getFoldCountWidth,
  getFoldMarker,
  getFoldSide,
} from '../utils/nodeStyle';

interface NodeActionButtonsProps {
  node: PositionedNode;
  isRoot: boolean;
  isSelected: boolean;
  isHovered: boolean;
  isEditing: boolean;
  layoutType: LayoutType;
  onAddChild: (parentId: string, sideHint?: 'left' | 'right') => void;
  onAddSibling: (nodeId: string, position?: 'before' | 'after') => void;
  onToggleFold: (nodeId: string) => void;
}

const ADD_BUTTON_CLASS =
  'w-6 h-6 rounded-full bg-accent text-on-accent flex items-center justify-center hover:brightness-90';

/**
 * 辺の外に、折りたたみの印と子の追加ボタンを横に並べる入れ物。
 * 内側の余白（pl-1 / pr-1）は、ノードから印へマウスを動かしてもホバーが切れないための橋になる。
 * 左側は並びを逆にして、印がいつも辺に近い側に来る
 */
const CLUSTER_CLASS = {
  right: 'absolute z-30 flex items-center gap-1 pl-1',
  left: 'absolute z-30 flex flex-row-reverse items-center gap-1 pr-1',
} as const;

const AddIcon: React.FC = () => <Plus className="w-3.5 h-3.5 stroke-[2.5]" />;

const ChildAddButton: React.FC<{ spec: ChildAddButtonSpec; nodeId: string; onAddChild: NodeActionButtonsProps['onAddChild'] }> = ({
  spec,
  nodeId,
  onAddChild,
}) => (
  <button
    id={`${spec.idPrefix}${nodeId}`}
    onClick={(e) => {
      e.stopPropagation();
      onAddChild(nodeId, spec.side);
    }}
    title={spec.title}
    className={ADD_BUTTON_CLASS}
  >
    <AddIcon />
  </button>
);

/** 折りたたみの印。閉じているときは隠れている子の数、開いているときは小さな「−」 */
const FoldButton: React.FC<{
  node: PositionedNode;
  marker: FoldMarker;
  onToggleFold: NodeActionButtonsProps['onToggleFold'];
}> = ({ node, marker, onToggleFold }) => {
  const common = {
    id: `btn-fold-${node.id}`,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleFold(node.id);
    },
    title: node.isFolded ? t('node.unfold') : t('node.fold'),
  };

  if (marker.kind === 'count') {
    return (
      <button
        {...common}
        style={{ backgroundColor: node.branchColor, minWidth: getFoldCountWidth(marker.count), height: FOLD_COUNT_HEIGHT }}
        className="rounded-full px-1 text-[11px] font-bold leading-none text-white flex items-center justify-center hover:brightness-90"
      >
        {marker.count}
      </button>
    );
  }
  return (
    <button
      {...common}
      style={{ borderColor: node.branchColor, color: node.branchColor }}
      className="w-3.5 h-3.5 rounded-full border-[1.5px] bg-node flex items-center justify-center hover:brightness-90"
    >
      <Minus className="w-2.5 h-2.5 stroke-[3]" />
    </button>
  );
};

/** 選択中に出す子ノード・兄弟ノードの追加ボタンと、子があるときの折りたたみの印 */
export const NodeActionButtons: React.FC<NodeActionButtonsProps> = ({
  node,
  isRoot,
  isSelected,
  isHovered,
  isEditing,
  layoutType,
  onAddChild,
  onAddSibling,
  onToggleFold,
}) => {
  const showAddButtons = isSelected && !isEditing;
  const addSpecs = showAddButtons ? getChildAddSides(isRoot, layoutType, node.effectiveSide) : [];
  const marker = getFoldMarker(node, { isEditing, isHovered, isSelected });
  const foldSide = getFoldSide(isRoot, layoutType, node.effectiveSide);

  // 入れ物は、本体の枠の内側（padding box）を基準に置くので、枠の幅の分だけずらす。
  // 高さは、接続線がつながる高さ（辺の中央、「下線のみ」は下線の高さ）にそろえる
  const border = getShapeBorderWidth(node.shape, isRoot);
  const clusterStyle = (side: 'left' | 'right'): React.CSSProperties => ({
    [side === 'right' ? 'left' : 'right']: `calc(100% + ${border}px)`,
    top: getAnchorY(node) - node.y - border,
    transform: 'translateY(-50%)',
  });

  const sides = (['right', 'left'] as const).filter(
    (side) => addSpecs.some((spec) => spec.side === side) || (marker !== null && foldSide === side)
  );

  return (
    <>
      {sides.map((side) => (
        <div key={side} className={CLUSTER_CLASS[side]} style={clusterStyle(side)}>
          {marker && foldSide === side && <FoldButton node={node} marker={marker} onToggleFold={onToggleFold} />}
          {addSpecs
            .filter((spec) => spec.side === side)
            .map((spec) => (
              <ChildAddButton key={spec.side} spec={spec} nodeId={node.id} onAddChild={onAddChild} />
            ))}
        </div>
      ))}

      {showAddButtons && !isRoot && (
        <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
          <button
            id={`btn-add-sibling-${node.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onAddSibling(node.id);
            }}
            title={t('node.addSibling')}
            className={ADD_BUTTON_CLASS}
          >
            <AddIcon />
          </button>
        </div>
      )}
    </>
  );
};
