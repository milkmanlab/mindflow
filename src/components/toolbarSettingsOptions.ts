import { ArrowLeft, ArrowRight, GitBranch, LucideIcon } from 'lucide-react';
import { MessageKey } from '../i18n';
import { ConnectorStyle, LayoutType } from '../types';

// 設定メニューの選択肢。クラス文字列は Tailwind が拾えるよう、すべて完全な形で書く

/** レイアウト */
export const LAYOUT_OPTIONS: { id: LayoutType; labelKey: MessageKey; icon: LucideIcon }[] = [
  { id: 'tree-right', labelKey: 'layout.treeRight', icon: ArrowRight },
  { id: 'tree-left', labelKey: 'layout.treeLeft', icon: ArrowLeft },
  { id: 'mindmap', labelKey: 'layout.mindmap', icon: GitBranch },
];

export const CONNECTOR_OPTIONS: { id: ConnectorStyle; labelKey: MessageKey }[] = [
  { id: 'curved', labelKey: 'connector.curved' },
  { id: 'rounded', labelKey: 'connector.rounded' },
  { id: 'straight', labelKey: 'connector.straight' },
  { id: 'arc', labelKey: 'connector.arc' },
];
