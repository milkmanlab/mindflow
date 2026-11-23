import { t } from '../i18n';
import React, { useEffect, useState } from 'react';
import { SaveStatus } from '../types';
import { formatElapsedTime, getElapsedSeconds } from '../utils/relativeTime';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

/** 経過時間の表示を更新する間隔（ミリ秒） */
const ELAPSED_UPDATE_INTERVAL_MS = 5000;

interface SaveStatusBadgeProps {
  saveStatus: SaveStatus;
  /** この画面でまだ一度も保存していないときは null・undefined */
  lastSavedAt?: number | null;
  onManualSave?: () => void;
}

function getSaveStatusTitle(saveStatus: SaveStatus, savedRelativeText: string | null): string {
  if (saveStatus === 'saving') return t('save.saving');
  if (saveStatus === 'error') return t('save.errorRetry');
  return savedRelativeText
    ? t('save.manualWithTime', { time: savedRelativeText })
    : t('save.manual');
}

/** ツールバーの保存状態。アイコンで示し、エラーのときだけ文字も出す。クリックで手動保存する */
export const SaveStatusBadge: React.FC<SaveStatusBadgeProps> = ({ saveStatus, lastSavedAt, onManualSave }) => {
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  // 最後の保存からの経過秒数を、一定の間隔で更新する
  useEffect(() => {
    if (!lastSavedAt) return;
    const updateElapsed = () => setElapsedSec(getElapsedSeconds(lastSavedAt, Date.now()));
    updateElapsed();
    const timer = setInterval(updateElapsed, ELAPSED_UPDATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [lastSavedAt]);

  // まだ一度も保存していないときは、経過時間を出さない
  const savedRelativeText = lastSavedAt ? formatElapsedTime(elapsedSec) : null;

  const isError = saveStatus === 'error';

  return (
    <button
      id="btn-save-status"
      onClick={onManualSave}
      title={getSaveStatusTitle(saveStatus, savedRelativeText)}
      aria-label={getSaveStatusTitle(saveStatus, savedRelativeText)}
      className={`h-8 flex items-center justify-center gap-1.5 rounded-control text-ui-body transition-colors shrink-0 ${
        isError
          ? 'px-2 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
          : 'w-8 text-ink-muted hover:text-ink hover:bg-surface-muted'
      }`}
    >
      {saveStatus === 'saving' ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : isError ? (
        <>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">{t('save.errorShort')}</span>
        </>
      ) : (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      )}
    </button>
  );
};
