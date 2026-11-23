import { t } from '../i18n';
import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { MindNode } from '../types';
import { useCommittedText } from '../hooks/useCommittedText';
import { measureImage } from '../services/imageService';
import { imageProps } from '../utils/imageBox';
import { ClearButton, PanelShell } from './PropertiesBarParts';

interface ContentPanelProps {
  node: MindNode;
  onUpdateProps: (partial: Partial<MindNode>) => void;
  /** 画像ファイルをノードに付ける（縮小は呼び出し側で行う） */
  onAttachImage?: (file: File) => Promise<void>;
}

const TEXT_INPUT_CLASS =
  'flex-1 text-ui-body px-2.5 py-1.5 rounded-control border border-line bg-surface-sunken text-ink outline-none';

export const NotePanel: React.FC<ContentPanelProps> = ({ node, onUpdateProps }) => {
  // 入力欄から離れたとき・Ctrl+Enter で反映する
  const { inputProps } = useCommittedText({
    value: node.note,
    resetKey: node.id,
    multiline: true,
    onCommit: (note) => onUpdateProps({ note }),
  });
  return (
    <PanelShell layoutClass="flex flex-col gap-1">
      <textarea
        {...inputProps}
        placeholder={t('panel.notePlaceholder')}
        rows={3}
        className="w-full text-ui-body p-2 rounded-control border border-line bg-surface-sunken text-ink outline-none focus:ring-1 focus:ring-accent resize-none"
      />
      <span className="text-ui-caption text-ink-muted">{t('panel.noteHint')}</span>
    </PanelShell>
  );
};

export const LinkPanel: React.FC<ContentPanelProps> = ({ node, onUpdateProps }) => {
  // 入力欄から離れたとき・Enter で反映する
  const { setDraft, inputProps } = useCommittedText({
    value: node.link,
    resetKey: node.id,
    onCommit: (link) => onUpdateProps({ link }),
  });
  return (
    <PanelShell layoutClass="flex items-center gap-2">
      <input type="text" {...inputProps} placeholder="https://example.com" className={`${TEXT_INPUT_CLASS} focus:ring-1 focus:ring-accent`} />
      {node.link && (
        <ClearButton
          onClick={() => {
            onUpdateProps({ link: undefined });
            setDraft('');
          }}
        >
          {t('panel.linkClear')}
        </ClearButton>
      )}
    </PanelShell>
  );
};

export const ImagePanel: React.FC<ContentPanelProps> = ({ node, onUpdateProps, onAttachImage }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 大きさを測っている間に別のノードを選んだら、その画像は設定しない（別のノードに付いてしまうため）
  const currentNodeIdRef = useRef(node.id);
  currentNodeIdRef.current = node.id;

  // URL は入力欄から離れたとき・Enter で反映する。空にして離れても、画像は消さない（消すのは「画像を解除」）
  const { setDraft, inputProps } = useCommittedText({
    value: node.image && !node.image.startsWith('data:') ? node.image : undefined,
    resetKey: node.id,
    onCommit: (url) => {
      if (!url) return;
      const targetId = node.id;
      // 大きさを測れたときは縦横比も保存する。読み込めない URL は、URL だけを設定する
      void measureImage(url).then((size) => {
        if (currentNodeIdRef.current === targetId) onUpdateProps(imageProps(url, size));
      });
    },
  });

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void onAttachImage?.(file);
    setDraft('');
    // 同じファイルを選び直しても onChange が動くように、選択を空にする
    e.target.value = '';
  };

  return (
    <PanelShell layoutClass="flex flex-col gap-2 max-w-sm">
      <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageFileChange} className="hidden" />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 bg-accent text-on-accent hover:brightness-90 text-ui-heading rounded-control flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          {t('panel.pickFile')}
        </button>
        <span className="text-ui-caption text-ink-muted">{t('panel.orUrl')}</span>
      </div>

      <input type="text" {...inputProps} placeholder={t('panel.imageUrl')} className={`${TEXT_INPUT_CLASS} focus:ring-1 focus:ring-accent`} />

      {node.image && (
        <div className="flex items-center justify-between pt-1 border-t border-line-subtle">
          <div className="flex items-center gap-2">
            <img src={node.image} alt={t('panel.thumbnail')} className="w-8 h-8 rounded-control object-cover border border-line" />
            <span className="text-ui-caption text-ink-muted">{t('panel.hasImage')}</span>
          </div>
          <ClearButton
            onClick={() => {
              onUpdateProps(imageProps(undefined));
              setDraft('');
            }}
          >
            {t('panel.imageClear')}
          </ClearButton>
        </div>
      )}

      <div className="text-ui-caption text-ink-muted">
        {t('panel.pasteHintBefore')}{' '}
        <kbd className="px-1 py-0.5 bg-surface-muted rounded-control font-mono border border-line">
          Ctrl/Cmd+V
        </kbd>{' '}
        {t('panel.pasteHintAfter')}
      </div>
    </PanelShell>
  );
};
