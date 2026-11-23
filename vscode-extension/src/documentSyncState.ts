/**
 * Webview とテキストドキュメントの間の同期状態。
 * 変更通知が「Webview 自身の書き込みのエコー」か「外部の変更」かを、時間ではなく内容で判定する。
 * VS Code API に依存しない（単体テストのため）。
 */
export class DocumentSyncState {
  private known: string;
  private pendingWebviewText: string | null = null;

  constructor(initialText: string) {
    this.known = initialText;
  }

  /** Webview と一致していると分かっている最新の内容 */
  get lastKnownText(): string {
    return this.known;
  }

  /** Webview から edit を受けたとき。ドキュメントへの書き込みが必要なら true */
  beginWebviewEdit(text: string, documentText: string): boolean {
    if (text === documentText) {
      this.known = text;
      return false;
    }
    this.pendingWebviewText = text;
    return true;
  }

  /** applyEdit が終わったとき（成否にかかわらず） */
  endWebviewEdit(documentText: string): void {
    this.pendingWebviewText = null;
    this.known = documentText;
  }

  /** ドキュメントの変更通知。Webview に送るべき内容を返す。送らないなら null */
  onDocumentChanged(newText: string): string | null {
    if (newText === this.pendingWebviewText || newText === this.known) {
      this.known = newText;
      return null;
    }
    this.known = newText;
    return newText;
  }
}
