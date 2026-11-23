import { t } from '../i18n';
import React from 'react';
import { ArrowLeftRight, Trash2 } from 'lucide-react';

interface SelectionSummaryProps {
  selectedCount: number;
  canCreateRelationship?: boolean;
  onCreateRelationship?: () => void;
  onDeleteSelected?: () => void;
}

/** 複数選択時の件数と、関連線の作成・一括削除のボタン。1 ノード選択のときは何も出さない */
export const SelectionSummary: React.FC<SelectionSummaryProps> = ({ selectedCount, canCreateRelationship, onCreateRelationship, onDeleteSelected }) => {
  // 1 ノード選択のときは、何も出さない
  if (selectedCount <= 1) return null;
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div
        id="multi-selection-badge"
        className="flex items-center gap-1.5 px-2 py-1 bg-surface-muted border border-line rounded-control text-ui-body text-ink"
      >
        <span className="whitespace-nowrap">{t('selection.count', { n: selectedCount })}</span>
      </div>

      {/* 2 ノード選択時：関連線の作成 */}
      {canCreateRelationship && onCreateRelationship && (
        <button
          id="prop-btn-create-relation"
          onClick={onCreateRelationship}
          className="flex items-center gap-1 px-2 py-1 bg-surface hover:bg-surface-muted border border-line-strong rounded-control text-ui-body text-ink transition-colors"
          title={t('selection.connect')}
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-ink-muted" />
          <span className="whitespace-nowrap">{t('selection.createRelation')}</span>
        </button>
      )}

      {onDeleteSelected && (
        <button
          id="prop-btn-delete-selected"
          onClick={onDeleteSelected}
          className="flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-control text-ui-body text-rose-600 dark:text-rose-400 transition-colors"
          title={t('selection.deleteTitle')}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap hidden sm:inline">{t('common.delete')}</span>
        </button>
      )}
    </div>
  );
};
