import { MessageKey, t } from '../i18n';
import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, ArrowRight, Check, Minus, Palette, Trash2 } from 'lucide-react';
import { MindRelationship, ThemeConfig } from '../types';
import { useDraftValue } from '../hooks/useDraftValue';
import { getColorPresets } from './propertiesBarOptions';
import {
  BarShell,
  ChoiceButton,
  CloseButton,
  Divider,
  PanelShell,
  PanelToggleButton,
  SEGMENT_INACTIVE,
  SegmentButton,
  SegmentGroup,
  Swatch,
} from './PropertiesBarParts';

interface RelationshipPropertiesBarProps {
  relationship: MindRelationship;
  theme: ThemeConfig;
  onUpdateRelationship?: (relId: string, partial: Partial<MindRelationship>) => void;
  onDeleteRelationship?: (relId: string) => void;
  onClose: () => void;
}

const ARROW_OPTIONS: { id: 'forward' | 'both' | 'none'; titleKey: MessageKey; icon: React.ReactNode }[] = [
  { id: 'forward', titleKey: 'relation.arrowForward', icon: <ArrowRight className="w-3.5 h-3.5" /> },
  { id: 'both', titleKey: 'relation.arrowBoth', icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
  { id: 'none', titleKey: 'relation.arrowNone', icon: <Minus className="w-3.5 h-3.5" /> },
];

/** 関連線を選択しているときのバー */
export const RelationshipPropertiesBar: React.FC<RelationshipPropertiesBarProps> = ({
  relationship,
  theme,
  onUpdateRelationship,
  onDeleteRelationship,
  onClose,
}) => {
  const [labelDraft, setLabelDraft] = useDraftValue(relationship.label || '', relationship.id);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [isColorPanelOpen, setIsColorPanelOpen] = useState(false);

  // 編集中のラベルは、別の関連線に引き継がず閉じる
  useEffect(() => {
    setIsEditingLabel(false);
  }, [relationship.id]);

  const update = (partial: Partial<MindRelationship>) => onUpdateRelationship?.(relationship.id, partial);
  const saveLabel = () => {
    update({ label: labelDraft.trim() || undefined });
    setIsEditingLabel(false);
  };
  const style = relationship.style || 'dashed';
  const arrow = relationship.arrow || 'forward';

  return (
    <BarShell id="relationship-properties-bar">
      <div className="flex items-center gap-2 px-1 py-0.5 overflow-x-auto max-w-full scrollbar-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-muted border border-line rounded-control text-ui-body text-ink shrink-0">
          <ArrowLeftRight className="w-3.5 h-3.5 text-ink-muted" />
          <span>{t('relation.title')}</span>
        </div>

        <Divider />

        {isEditingLabel ? (
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="text"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={(e) => {
                // IME の変換を確定する Enter では保存しない
                if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                if (e.key === 'Enter') {
                  saveLabel();
                } else if (e.key === 'Escape') {
                  setIsEditingLabel(false);
                }
              }}
              placeholder={t('relation.labelPlaceholder')}
              className="px-2 py-0.5 text-ui-body bg-surface-muted border border-line-strong rounded-control focus:outline-none focus:ring-1 focus:ring-accent text-ink w-28 sm:w-36"
              autoFocus
            />
            <button
              onClick={saveLabel}
              className="p-1 text-ink hover:bg-surface-muted rounded-control"
              title={t('relation.labelSave')}
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setLabelDraft(relationship.label || '');
              setIsEditingLabel(true);
            }}
            className="px-2.5 py-1 text-ui-body text-ink bg-surface-muted hover:bg-surface-strong rounded-control transition-colors shrink-0 max-w-[140px] truncate"
            title={t('relation.labelEdit')}
          >
            {relationship.label ? t('relation.labelValue', { label: relationship.label }) : t('relation.labelAdd')}
          </button>
        )}

        <Divider />

        <SegmentGroup>
          {(['dashed', 'solid'] as const).map((s) => (
            <SegmentButton
              key={s}
              active={style === s}
              onClick={() => update({ style: s })}
              title={s === 'dashed' ? t('relation.dashed') : t('relation.solid')}
              sizeClass="px-2 py-0.5 rounded-control"
              inactiveClass={SEGMENT_INACTIVE.noDarkHover}
            >
              {s === 'dashed' ? t('relation.dashed') : t('relation.solid')}
            </SegmentButton>
          ))}
        </SegmentGroup>

        <SegmentGroup>
          {ARROW_OPTIONS.map((a) => (
            <SegmentButton
              key={a.id}
              active={arrow === a.id}
              onClick={() => update({ arrow: a.id })}
              title={t(a.titleKey)}
              sizeClass="p-1 rounded-control"
              inactiveClass={SEGMENT_INACTIVE.noDarkHover}
            >
              {a.icon}
            </SegmentButton>
          ))}
        </SegmentGroup>

        <Divider />

        <PanelToggleButton
          open={isColorPanelOpen}
          showDot={!!relationship.color}
          onClick={() => setIsColorPanelOpen((open) => !open)}
          title={t('relation.lineColor')}
        >
          <Palette className="w-3.5 h-3.5" />
        </PanelToggleButton>

        <button
          onClick={() => onDeleteRelationship?.(relationship.id)}
          className="w-7 h-7 flex items-center justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-control transition-colors shrink-0"
          title={t('relation.delete')}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <CloseButton title={t('common.closeWithKey')} onClick={onClose} />
      </div>

      {isColorPanelOpen && (
        <PanelShell layoutClass="flex items-center gap-1.5 flex-wrap">
          <span className="text-ui-body text-ink-muted">{t('relation.lineColor')}</span>
          <ChoiceButton selected={!relationship.color} onClick={() => update({ color: undefined })} sizeClass="px-2 py-0.5 text-ui-body">
            {t('relation.colorDefault')}
          </ChoiceButton>
          {getColorPresets(theme).map((cp) => (
            <Swatch key={cp.name} color={cp.value} selected={relationship.color === cp.value} onClick={() => update({ color: cp.value })} title={cp.name} sizeClass="w-5 h-5" />
          ))}
        </PanelShell>
      )}
    </BarShell>
  );
};
