import { t } from '../i18n';
import { MindMap } from '../types';
import { mindMapToMarkdown, markdownToMindMap } from '../utils/markdownSync';

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi;
  }
}

/** `acquireVsCodeApi()` が返すオブジェクトのうち、使うもの */
interface VsCodeApi {
  postMessage: (message: unknown) => void;
  setState: (state: unknown) => void;
  getState: () => unknown;
}

export type StorageMode = 'vscode' | 'browser';

export interface StorageAdapterEvents {
  onDocUpdate: (newMap: MindMap, rawMarkdown: string) => void;
  onStatusChange?: (mode: StorageMode, statusText: string) => void;
}

export interface StorageAdapter {
  readonly mode: StorageMode;
  readonly isVsCode: boolean;
  init(events: StorageAdapterEvents): Promise<MindMap | null>;
  save(map: MindMap): Promise<{ markdown: string; bytes: number }>;
  sendSaveCommand(): void;
  exportMarkdown(map: MindMap): string;
  getInitialMap(): MindMap | null;
  exportFile(defaultName: string, data: string, format: 'svg' | 'png'): void;
  openExternal(url: string): void;
}

const STORAGE_MD_DOC_KEY = 'mindflow_current_doc_md_v1';

class UnifiedStorageAdapter implements StorageAdapter {
  private vscodeApi: VsCodeApi | null = null;
  private _mode: StorageMode = 'browser';
  private events: StorageAdapterEvents | null = null;
  private lastSavedMarkdown: string = '';

  constructor() {
    if (typeof window !== 'undefined' && typeof window.acquireVsCodeApi === 'function') {
      try {
        this.vscodeApi = window.acquireVsCodeApi();
        this._mode = 'vscode';
      } catch (e) {
        console.warn('VS Code API acquisition failed, falling back to browser storage:', e);
        this._mode = 'browser';
      }
    } else {
      this._mode = 'browser';
    }
  }

  get mode(): StorageMode {
    return this._mode;
  }

  get isVsCode(): boolean {
    return this._mode === 'vscode';
  }

  async init(events: StorageAdapterEvents): Promise<MindMap | null> {
    this.events = events;

    // VS Code Extension Host からのメッセージを受信
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (!message || typeof message !== 'object') return;

      switch (message.type) {
        case 'init':
        case 'update': {
          if (typeof message.text === 'string') {
            // 自ら保存した内容のエコーによる再レンダリング・ループを抑止
            if (message.type === 'update' && message.text === this.lastSavedMarkdown) {
              break;
            }
            try {
              const updatedMap = markdownToMindMap(message.text);
              const normalized = mindMapToMarkdown(updatedMap);
              // 自動整形など、意味が変わらない外部変更では状態（選択・編集中）を壊さない
              if (message.type === 'update' && normalized === this.lastSavedMarkdown) {
                break;
              }
              // 受信直後の自動保存が同内容の再書き込み（→ 保存ループ）にならないよう、
              // 再シリアライズ結果を保存済みとして扱う
              this.lastSavedMarkdown = normalized;
              this.events?.onDocUpdate(updatedMap, message.text);
              this.events?.onStatusChange?.(this._mode, t('sync.done'));
            } catch (err) {
              console.error('Failed to parse markdown from VS Code:', err);
            }
          }
          break;
        }
      }
    });

    if (this.isVsCode) {
      // VS Code に Webview の準備完了を通知
      this.vscodeApi?.postMessage({ type: 'ready' });
      this.events?.onStatusChange?.('vscode', t('sync.connecting'));
      return null;
    }

    // ブラウザ単体プレビューモード: localStorage から最後の Markdown を復元
    return this.getInitialMap();
  }

  getInitialMap(): MindMap | null {
    if (this.isVsCode) return null;
    try {
      const lastMd = localStorage.getItem(STORAGE_MD_DOC_KEY);
      if (lastMd && lastMd.trim().length > 0) {
        const parsed = markdownToMindMap(lastMd);
        this.lastSavedMarkdown = lastMd;
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load initial data in browser mode:', e);
    }
    return null;
  }

  async save(map: MindMap): Promise<{ markdown: string; bytes: number }> {
    const markdown = mindMapToMarkdown(map);
    const bytes = new Blob([markdown]).size;

    if (markdown === this.lastSavedMarkdown) {
      return { markdown, bytes };
    }
    this.lastSavedMarkdown = markdown;

    if (this.isVsCode) {
      // VS Code ドキュメントへ Markdown を反映
      this.vscodeApi?.postMessage({
        type: 'edit',
        text: markdown,
      });
      this.events?.onStatusChange?.('vscode', t('sync.synced'));
    } else {
      // ブラウザモード: localStorage に保存
      try {
        localStorage.setItem(STORAGE_MD_DOC_KEY, markdown);
        this.events?.onStatusChange?.('browser', t('sync.localSaved'));
      } catch (e) {
        console.error('Failed to save to localStorage:', e);
        throw e;
      }
    }

    return { markdown, bytes };
  }

  sendSaveCommand(): void {
    if (this.isVsCode) {
      this.vscodeApi?.postMessage({ type: 'save' });
    }
  }

  exportMarkdown(map: MindMap): string {
    return mindMapToMarkdown(map);
  }

  exportFile(defaultName: string, data: string, format: 'svg' | 'png'): void {
    if (this.isVsCode) {
      this.vscodeApi?.postMessage({
        type: 'exportFile',
        defaultName,
        data,
        format,
      });
      return;
    }

    // ブラウザ用フォールバック
    if (format === 'png') {
      const a = document.createElement('a');
      a.href = data;
      a.download = defaultName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  openExternal(url: string): void {
    if (!url || !url.trim()) return;
    const trimmed = url.trim();
    const formattedUrl =
      trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('mailto:')
        ? trimmed
        : `https://${trimmed}`;

    if (this.isVsCode) {
      this.vscodeApi?.postMessage({
        type: 'openUrl',
        url: formattedUrl,
      });
    } else {
      window.open(formattedUrl, '_blank', 'noopener,noreferrer');
    }
  }
}

export const storageAdapter = new UnifiedStorageAdapter();
