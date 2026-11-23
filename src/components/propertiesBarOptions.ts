import { NodeFontSize, NodeShape, ThemeConfig } from '../types';
import { MessageKey, t } from '../i18n';

/** ノードの色・関連線の色の選択肢。テーマの枝の色から作るので、テーマを替えると選択肢も替わる */
export function getColorPresets(theme: ThemeConfig): { name: string; value: string }[] {
  return theme.branchColors.map((value, i) => ({ name: t('color.branch', { n: i + 1 }), value }));
}

/** 文字色。value が空ならテーマの文字色 */
export function getTextColorPresets(): { name: string; value: string }[] {
  return [
    { name: t('color.theme'), value: '' },
    { name: t('color.black'), value: '#0f172a' },
    { name: t('color.white'), value: '#ffffff' },
    { name: t('color.blue'), value: '#2563eb' },
    { name: t('color.red'), value: '#dc2626' },
    { name: t('color.emerald'), value: '#059669' },
    { name: t('color.amber'), value: '#d97706' },
    { name: t('color.violet'), value: '#7c3aed' },
  ];
}

export const FONT_SIZE_OPTIONS: { id: NodeFontSize; labelKey: MessageKey; titleKey: MessageKey }[] = [
  { id: 'sm', labelKey: 'fontSize.sm.label', titleKey: 'fontSize.sm.title' },
  { id: 'base', labelKey: 'fontSize.base.label', titleKey: 'fontSize.base.title' },
  { id: 'lg', labelKey: 'fontSize.lg.label', titleKey: 'fontSize.lg.title' },
  { id: 'xl', labelKey: 'fontSize.xl.label', titleKey: 'fontSize.xl.title' },
];

export const SHAPE_OPTIONS: { id: NodeShape; labelKey: MessageKey }[] = [
  { id: 'rounded', labelKey: 'shape.rounded' },
  { id: 'pill', labelKey: 'shape.pill' },
  { id: 'underline', labelKey: 'shape.underline' },
  { id: 'borderless', labelKey: 'shape.borderless' },
];

/** 進捗。val が undefined なら解除 */
export const PROGRESS_OPTIONS: { val: number | undefined }[] = [
  { val: undefined },
  { val: 25 },
  { val: 50 },
  { val: 75 },
  { val: 100 },
];

/** 進捗の選択肢の表示（なし / 25% など） */
export function getProgressLabel(val: number | undefined): string {
  return val === undefined ? t('props.progressNone') : `${val}%`;
}
