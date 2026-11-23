import React from 'react';
import { X } from 'lucide-react';
import { ICON_BUTTON_ACTIVE_CLASS, ICON_BUTTON_IDLE_CLASS, ICON_BUTTON_SIZE } from './IconButton';

// プロパティバー（ノード・関連線）で繰り返し使う見た目の部品。
// クラス文字列は Tailwind が拾えるよう、すべて完全な形で書く

/**
 * 関連線のバーの外枠。置く位置は NodeBarAnchor が決める
 */
const BAR_SURFACE_CLASS = 'bg-surface rounded-panel shadow-float border border-line p-2 flex flex-col gap-1.5 max-w-full w-auto select-none';

export const BarShell: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <div id={id} className={BAR_SURFACE_CLASS}>
    {children}
  </div>
);

/** 置く位置を持たないバーの外枠（ノードのバー）。置く位置は NodeBarAnchor が決める */
export const FloatingBarShell: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <div id={id} className={BAR_SURFACE_CLASS}>
    {children}
  </div>
);

export const Divider: React.FC = () => <span className="w-px h-4 bg-surface-strong shrink-0" />;

/** 灰色の背景にボタンを並べる枠 */
export const SegmentGroup: React.FC<{
  id?: string;
  title?: string;
  /** 文字サイズの枠と枝の左右だけ小さい文字 */
  small?: boolean;
  children: React.ReactNode;
}> = ({ id, title, small, children }) => (
  <div
    id={id}
    title={title}
    className={`flex items-center bg-surface-muted rounded-control p-0.5 ${small ? 'text-ui-caption' : 'text-ui-body'} shrink-0`}
  >
    {children}
  </div>
);

const SEGMENT_ACTIVE_CLASS = 'bg-surface text-ink-strong';

/** SegmentButton の、選択中でないときの見た目 */
export const SEGMENT_INACTIVE = {
  /** 文字サイズ、太字・斜体・下線、文字色 */
  standard: 'text-ink-muted hover:text-ink-strong',
  /** 関連線の線の種類・矢印（ダークでのホバー色の指定がない） */
  noDarkHover: 'text-ink-muted hover:text-ink-strong',
  /** 枝の左右 */
  muted: 'text-ink-muted hover:text-ink',
} as const;

/** 選択中は白背景・濃い文字になるボタン */
export const SegmentButton: React.FC<{
  id?: string;
  active: boolean;
  onClick: () => void;
  /** 設定メニューのタブのように、ツールチップを出さないボタンでは省略する */
  title?: string;
  /** 大きさと形のクラス（例：'px-1.5 py-0.5 rounded-control'） */
  sizeClass: string;
  /** 選択中だけに付けるクラス（例：太字ボタンの 'font-bold'） */
  activeExtraClass?: string;
  inactiveClass?: string;
  children: React.ReactNode;
}> = ({ id, active, onClick, title, sizeClass, activeExtraClass = '', inactiveClass = SEGMENT_INACTIVE.standard, children }) => (
  <button
    id={id}
    onClick={onClick}
    className={`${sizeClass} transition-colors ${active ? `${SEGMENT_ACTIVE_CLASS} ${activeExtraClass}` : inactiveClass}`}
    title={title}
    aria-label={title}
  >
    {children}
  </button>
);

/** パネルを開くボタン。パネルが開いているときは背景が付き、値が設定されているときは右上に点が出る */
export const PanelToggleButton: React.FC<{
  id?: string;
  /** パネルが開いている */
  open: boolean;
  /** 右上に小さな点を出す（値が設定されている印。ボタン自体に値が出るものは付けない） */
  showDot?: boolean;
  /** 大きさのクラス。既定は正方形（w-7） */
  sizeClass?: string;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ id, open, showDot = false, sizeClass = ICON_BUTTON_SIZE.sm, onClick, title, children }) => (
  <button
    id={id}
    onClick={onClick}
    className={`${sizeClass} flex items-center justify-center rounded-control transition-colors relative ${
      open ? ICON_BUTTON_ACTIVE_CLASS : ICON_BUTTON_IDLE_CLASS
    }`}
    title={title}
    aria-label={title}
  >
    {children}
    {showDot && <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent`} />}
  </button>
);

/** パネルの中の、文字や形の選択肢。選択中は枠と灰色の面で示す */
export const ChoiceButton: React.FC<{
  selected: boolean;
  onClick: () => void;
  title?: string;
  /** 大きさと形のクラス（例：'px-3 py-1.5 text-ui-body'） */
  sizeClass: string;
  children: React.ReactNode;
}> = ({ selected, onClick, title, sizeClass, children }) => (
  <button
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`${sizeClass} rounded-control border transition-colors ${
      selected
        ? 'border-ink-muted bg-surface-muted text-ink-strong'
        : 'border-line text-ink hover:bg-surface-muted'
    }`}
  >
    {children}
  </button>
);

/** パネルの中の丸い色見本。選択中は輪で示す（拡大はしない） */
export const Swatch: React.FC<{
  color: string;
  selected: boolean;
  onClick: () => void;
  title: string;
  /** 大きさのクラス。既定は w-6 h-6 */
  sizeClass?: string;
}> = ({ color, selected, onClick, title, sizeClass = 'w-6 h-6' }) => (
  <button
    onClick={onClick}
    style={{ backgroundColor: color }}
    title={title}
    aria-label={title}
    className={`${sizeClass} rounded-full border border-black/10 ${
      selected ? 'ring-2 ring-ink ring-offset-1 ring-offset-surface' : ''
    }`}
  />
);

/** 「〜を解除」。ノードに付けた設定を外す操作は、すべてこの見た目にする */
export const ClearButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button onClick={onClick} className="text-ui-body text-ink-muted hover:text-rose-500 dark:hover:text-rose-400 transition-colors shrink-0">
    {children}
  </button>
);

export const CloseButton: React.FC<{ id?: string; title: string; onClick: () => void }> = ({ id, title, onClick }) => (
  <button
    id={id}
    onClick={onClick}
    className="w-7 h-7 flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-muted rounded-control transition-colors shrink-0"
    title={title}
    aria-label={title}
  >
    <X className="w-3.5 h-3.5" />
  </button>
);

/** 下段のパネルの外枠 */
export const PanelShell: React.FC<{
  /** 中身の並べ方（例：'flex items-center gap-2 flex-wrap'） */
  layoutClass: string;
  children: React.ReactNode;
}> = ({ layoutClass, children }) => (
  <div className={`p-2 border-b border-line-subtle ${layoutClass}`}>
    {children}
  </div>
);

const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

/** 入力欄のキー入力と IME の変換を、キャンバスのショートカットに伝えない */
export const stopCanvasKeyProps = {
  onKeyDown: stopPropagation,
  onCompositionStart: stopPropagation,
  onCompositionEnd: stopPropagation,
};
