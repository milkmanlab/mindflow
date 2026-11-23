import { t } from '../i18n';
import React from 'react';
import { CheckCircle2, ExternalLink, FileText } from 'lucide-react';
import { PositionedNode } from '../types';
import { IconRenderer } from './IconRenderer';
import { NoteIndicator } from './NodeNotePopover';
import { getProgressBadgeSpec } from '../utils/nodeStyle';
import { ThemeConfig } from '../types';

interface NodeLeadingBadgesProps {
  node: PositionedNode;
  isRoot: boolean;
  theme: ThemeConfig;
}

/** テキストの前に出すアイコンと進捗バッジ（編集中は出さない） */
export const NodeLeadingBadges: React.FC<NodeLeadingBadgesProps> = ({ node, isRoot, theme }) => {
  const badge = node.progress !== undefined ? getProgressBadgeSpec(node.progress, isRoot, theme) : null;
  return (
  <>
    {node.icon && (
      <div style={{ color: isRoot ? node.textColor || 'var(--mf-on-root)' : node.branchColor }} className="shrink-0 flex items-center justify-center">
        <IconRenderer name={node.icon} className="w-4 h-4" />
      </div>
    )}

    {badge && (
      <div className={`shrink-0 text-xs px-1.5 py-0.5 rounded-control font-bold flex items-center gap-1 ${badge.className}`}>
        {node.progress === 100 ? <CheckCircle2 className={`w-3 h-3 ${badge.checkClassName}`} /> : <span>{node.progress}%</span>}
      </div>
    )}
  </>
  );
};

interface NodeTrailingIndicatorsProps {
  note?: string;
  link?: string;
  onOpenNote: () => void;
  onOpenLink: (url: string) => void;
}

/** テキストの後ろに出すメモとリンクの印。どちらもクリックで開く（メモは、乗せると全文を出し、クリックでプロパティバーのメモ欄、リンクは外部） */
export const NodeTrailingIndicators: React.FC<NodeTrailingIndicatorsProps> = ({ note, link, onOpenNote, onOpenLink }) => (
  <div className="flex items-center gap-1 shrink-0">
    {note && (
      <NoteIndicator note={note} onOpen={onOpenNote}>
        <FileText className="w-3.5 h-3.5" />
      </NoteIndicator>
    )}
    {link && (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenLink(link);
        }}
        className="text-current opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded-control hover:bg-slate-500/15 cursor-pointer"
        title={t('badge.openLink', { link })}
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);
