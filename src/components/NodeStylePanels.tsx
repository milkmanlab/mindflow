import { t } from '../i18n';
import React from 'react';
import { MindNode, ThemeConfig } from '../types';
import { AVAILABLE_ICONS, IconRenderer } from './IconRenderer';
import { getColorPresets, getProgressLabel, getTextColorPresets, PROGRESS_OPTIONS, SHAPE_OPTIONS } from './propertiesBarOptions';
import { ChoiceButton, ClearButton, PanelShell, Swatch } from './PropertiesBarParts';
import { ShapePreview } from './SettingsPreviews';

interface StylePanelProps {
  node: MindNode;
  onUpdateProps: (partial: Partial<MindNode>) => void;
}

/** 文字色の選択肢。「文字」のパネルの中に置く */
export const TextColorChoices: React.FC<StylePanelProps> = ({ node, onUpdateProps }) => (
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-ui-body text-ink-muted">{t('style.textColor')}</span>
    {getTextColorPresets().map((tc) => (
      <ChoiceButton
        key={tc.name}
        selected={(!tc.value && !node.textColor) || (!!tc.value && node.textColor === tc.value)}
        onClick={() => onUpdateProps({ textColor: tc.value || undefined })}
        title={tc.name}
        sizeClass="px-2.5 py-1 text-ui-body flex items-center gap-1.5"
      >
        <span
          className="w-3 h-3 rounded-full border border-line-strong inline-block"
          style={{ backgroundColor: tc.value || '#64748b' }}
        />
        <span>{tc.name}</span>
      </ChoiceButton>
    ))}
    {node.textColor && <ClearButton onClick={() => onUpdateProps({ textColor: undefined })}>{t('style.textColorClear')}</ClearButton>}
  </div>
);

export const AccentColorPanel: React.FC<StylePanelProps & { theme: ThemeConfig }> = ({ node, onUpdateProps, theme }) => (
  <PanelShell layoutClass="flex items-center gap-2 flex-wrap">
    <span className="text-ui-body text-ink-muted">{t('props.color')}</span>
    {getColorPresets(theme).map((c) => (
      <Swatch key={c.value} color={c.value} selected={node.color === c.value} onClick={() => onUpdateProps({ color: c.value })} title={c.name} />
    ))}
    {node.color && <ClearButton onClick={() => onUpdateProps({ color: undefined })}>{t('style.colorClear')}</ClearButton>}
  </PanelShell>
);

export const IconPanel: React.FC<StylePanelProps> = ({ node, onUpdateProps }) => (
  <PanelShell layoutClass="flex flex-col gap-1.5">
    <div className="grid grid-cols-10 gap-1.5 max-h-40 overflow-y-auto">
      {AVAILABLE_ICONS.map((item) => (
        <ChoiceButton
          key={item.name}
          selected={node.icon === item.name}
          onClick={() => onUpdateProps({ icon: item.name })}
          title={t(item.labelKey)}
          sizeClass="p-2 flex items-center justify-center"
        >
          <IconRenderer name={item.name} className="w-4 h-4" />
        </ChoiceButton>
      ))}
    </div>
    {node.icon && (
      <div className="flex justify-end">
        <ClearButton onClick={() => onUpdateProps({ icon: undefined })}>{t('style.iconClear')}</ClearButton>
      </div>
    )}
  </PanelShell>
);

export const ShapePanel: React.FC<StylePanelProps> = ({ node, onUpdateProps }) => (
  <PanelShell layoutClass="flex items-center gap-2">
    {SHAPE_OPTIONS.map((s) => (
      <ChoiceButton key={s.id} title={t(s.labelKey)} selected={(node.shape || 'rounded') === s.id} onClick={() => onUpdateProps({ shape: s.id })} sizeClass="px-3 py-1.5 text-ui-body flex items-center gap-2">
        <ShapePreview shape={s.id} />
        <span>{t(s.labelKey)}</span>
      </ChoiceButton>
    ))}
  </PanelShell>
);

export const ProgressPanel: React.FC<StylePanelProps> = ({ node, onUpdateProps }) => (
  <PanelShell layoutClass="flex items-center gap-2 flex-wrap">
    <span className="text-ui-body text-ink-muted">{t('style.progress')}</span>
    <div className="flex items-center gap-1.5 flex-wrap">
      {PROGRESS_OPTIONS.map((p) => (
        <ChoiceButton key={p.val ?? 'none'} title={t('style.progressTitle', { value: getProgressLabel(p.val) })} selected={node.progress === p.val} onClick={() => onUpdateProps({ progress: p.val })} sizeClass="px-2.5 py-1 text-ui-body">
          {getProgressLabel(p.val)}
        </ChoiceButton>
      ))}
    </div>
  </PanelShell>
);
