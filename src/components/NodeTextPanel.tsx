import { t } from '../i18n';
import React from 'react';
import { Bold, Italic, Underline } from 'lucide-react';
import { MindNode } from '../types';
import { resolveIsBold } from '../utils/nodeDimensions';
import { FONT_SIZE_OPTIONS } from './propertiesBarOptions';
import { PanelShell, SegmentButton, SegmentGroup } from './PropertiesBarParts';
import { TextColorChoices } from './NodeStylePanels';

interface NodeTextPanelProps {
  node: MindNode;
  isRoot: boolean;
  onUpdateProps: (partial: Partial<MindNode>) => void;
}

const STYLE_BUTTON_SIZE = 'w-6 h-6 flex items-center justify-center rounded-control';

/** 「文字」のパネル。文字サイズ・太字・斜体・下線・文字色をまとめる（複数選択中は、選択中のノードすべてに反映される） */
export const NodeTextPanel: React.FC<NodeTextPanelProps> = ({ node, isRoot, onUpdateProps }) => {
  const currentFontSize = node.fontSize || 'base';
  const isBold = resolveIsBold(node, isRoot);
  const isItalic = !!node.italic;
  const isUnderline = !!node.underline;

  return (
    <PanelShell layoutClass="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <SegmentGroup id="prop-font-size-group" title={t('text.size')} small>
          {FONT_SIZE_OPTIONS.map((f) => (
            <SegmentButton
              key={f.id}
              active={currentFontSize === f.id}
              onClick={() => onUpdateProps({ fontSize: f.id })}
              title={t(f.titleKey)}
              sizeClass="px-1.5 py-0.5 rounded-control"
            >
              {t(f.labelKey)}
            </SegmentButton>
          ))}
        </SegmentGroup>

        <SegmentGroup id="prop-font-style-group">
          <SegmentButton id="prop-btn-bold" active={isBold} activeExtraClass="font-bold" onClick={() => onUpdateProps({ bold: !isBold })} title={t('text.bold')} sizeClass={STYLE_BUTTON_SIZE}>
            <Bold className="w-3.5 h-3.5" />
          </SegmentButton>
          <SegmentButton id="prop-btn-italic" active={isItalic} onClick={() => onUpdateProps({ italic: !isItalic })} title={t('text.italic')} sizeClass={STYLE_BUTTON_SIZE}>
            <Italic className="w-3.5 h-3.5" />
          </SegmentButton>
          <SegmentButton id="prop-btn-underline" active={isUnderline} onClick={() => onUpdateProps({ underline: !isUnderline })} title={t('text.underline')} sizeClass={STYLE_BUTTON_SIZE}>
            <Underline className="w-3.5 h-3.5" />
          </SegmentButton>
        </SegmentGroup>
      </div>

      <TextColorChoices node={node} onUpdateProps={onUpdateProps} />
    </PanelShell>
  );
};
