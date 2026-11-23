import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DocumentSyncState } from './documentSyncState';
import { Locale, resolveLocale } from './locale';
import { hostMessage } from './messages';
import { buildWebviewCsp } from './webviewCsp';
import { errorMessage } from './errorMessage';

/** 今使う言語（設定 mindflow.language と、VS Code の表示言語から決める） */
export function currentLocale(): Locale {
  const setting = vscode.workspace.getConfiguration('mindflow').get<string>('language');
  return resolveLocale(setting, vscode.env.language);
}

/**
 * Provider for MindFlow Custom Text Editor for Markdown (.md) documents.
 * Enables local two-way synchronization between standard Markdown text files
 * and the MindFlow React Webview canvas.
 */
export class MindFlowEditorProvider implements vscode.CustomTextEditorProvider {
  /**
   * *.md / *.markdown 用（priority: option）。Open With と「マインドマップとして開く」で開く。
   * 専用拡張子 *.mindflow.md は、package.json の configurationDefaults（workbench.editorAssociations）で、
   * このエディタを既定にしている
   */
  public static readonly viewType = 'mindflow.markdownEditor';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MindFlowEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(
      MindFlowEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      }
    );
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    // Setup webview options
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
        vscode.Uri.joinPath(this.context.extensionUri, 'media'),
      ],
    };

    // Render Webview HTML
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // 言語の設定が変わったら、Webview を読み込み直す。内容はドキュメントにあり、読み込み後の ready → init で届く
    const configSubscription = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('mindflow.language')) {
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
      }
    });

    const syncState = new DocumentSyncState(document.getText());
    let editQueue: Promise<void> = Promise.resolve();
    const fileNameOf = () => path.basename(document.fileName || document.uri.fsPath);

    const applyWebviewEdit = async (text: string): Promise<void> => {
      const currentText = document.getText();
      if (!syncState.beginWebviewEdit(text, currentText)) {
        return;
      }
      let ok = false;
      try {
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(currentText.length)
        );
        edit.replace(document.uri, fullRange, text);
        ok = await vscode.workspace.applyEdit(edit);
      } catch (err) {
        console.warn('Failed to apply edit from webview:', err);
      } finally {
        syncState.endWebviewEdit(document.getText());
      }
      if (!ok) {
        // Webview とドキュメントがずれたので、現在の内容を送り直す
        webviewPanel.webview.postMessage({
          type: 'update',
          text: document.getText(),
          fileName: fileNameOf(),
        });
      }
    };

    // Handle messages sent from React Webview (via acquireVsCodeApi().postMessage)
    const messageListener = webviewPanel.webview.onDidReceiveMessage(async (e) => {
      switch (e.type) {
        case 'ready': {
          // Send initial document text to webview
          const isDark = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ||
            vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast;
          const fileName = path.basename(document.fileName || document.uri.fsPath);
          webviewPanel.webview.postMessage({
            type: 'init',
            text: document.getText(),
            uri: document.uri.toString(),
            fileName,
            isDark,
          });
          break;
        }

        case 'edit': {
          // Receive updated Markdown string from MindFlow canvas
          if (typeof e.text === 'string') {
            const text: string = e.text;
            // Serialize edits so two applyEdit calls never run concurrently
            editQueue = editQueue.then(() => applyWebviewEdit(text));
            await editQueue;
          }
          break;
        }

        case 'save': {
          // Explicit save triggered from Webview (e.g. Ctrl+S or manual save button).
          // Unchanged-content notifications are ignored by syncState; auto-formatting on save is sent as an update.
          await editQueue;
          await document.save();
          break;
        }

        case 'openUrl': {
          // Open external URL in user's default browser from VS Code Webview
          if (typeof e.url === 'string' && e.url.trim()) {
            try {
              await vscode.env.openExternal(vscode.Uri.parse(e.url.trim()));
            } catch (err) {
              vscode.window.showErrorMessage(hostMessage(currentLocale(), 'error.openUrl', { message: errorMessage(err) }));
            }
          }
          break;
        }

        case 'exportFile': {
          // Export image (SVG / PNG) or text file via VS Code save dialog
          try {
            const format = e.format || 'png';
            const defaultName = e.defaultName || `mindmap.${format}`;
            const filters: Record<string, string[]> = format === 'svg'
              ? { 'SVG Image': ['svg'] }
              : { 'PNG Image': ['png'] };

            const docDir = path.dirname(document.uri.fsPath);
            const defaultUri = vscode.Uri.file(path.join(docDir, defaultName));

            const saveUri = await vscode.window.showSaveDialog({
              defaultUri,
              filters,
              saveLabel: hostMessage(currentLocale(), 'dialog.save'),
            });

            if (saveUri) {
              let buffer: Uint8Array;
              if (format === 'png') {
                const base64Data = (e.data as string).replace(/^data:image\/\w+;base64,/, '');
                buffer = Buffer.from(base64Data, 'base64');
              } else {
                buffer = Buffer.from(e.data as string, 'utf8');
              }

              await vscode.workspace.fs.writeFile(saveUri, buffer);
              vscode.window.showInformationMessage(hostMessage(currentLocale(), 'info.imageSaved', { name: path.basename(saveUri.fsPath) }));
            }
          } catch (err) {
            vscode.window.showErrorMessage(hostMessage(currentLocale(), 'error.saveFailed', { message: errorMessage(err) }));
          }
          break;
        }

        case 'alert': {
          vscode.window.showInformationMessage(e.message || '');
          break;
        }
      }
    });

    // Listen for external file changes (e.g. user edited in standard text editor, git pull, undo/redo)
    const changeDocSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        const textToSend = syncState.onDocumentChanged(document.getText());
        if (textToSend !== null) {
          webviewPanel.webview.postMessage({
            type: 'update',
            text: textToSend,
            fileName: fileNameOf(),
          });
        }
      }
    });

    // Clean up when webview is closed
    webviewPanel.onDidDispose(() => {
      messageListener.dispose();
      configSubscription.dispose();
      changeDocSubscription.dispose();
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const distPath = vscode.Uri.joinPath(this.context.extensionUri, 'dist');
    const distUri = webview.asWebviewUri(distPath);
    const indexPath = vscode.Uri.joinPath(distPath, 'index.html');

    const locale = currentLocale();
    const csp = buildWebviewCsp(webview.cspSource);

    try {
      if (fs.existsSync(indexPath.fsPath)) {
        let html = fs.readFileSync(indexPath.fsPath, 'utf8');

        // Replace asset references with Webview URIs
        html = html.replace(/(href|src)="\.\/assets\//g, `$1="${distUri}/assets/`);
        html = html.replace(/(href|src)="\/assets\//g, `$1="${distUri}/assets/`);
        html = html.replace(/(href|src)="assets\//g, `$1="${distUri}/assets/`);

        // 画面の言語を、<html> に入れて Webview に伝える（Webview 側の getLocale() が読む）
        html = html.replace(/<html[^>]*>/, `<html lang="${locale}" data-mindflow-locale="${locale}">`);

        // Inject CSP if not present
        if (!html.includes('http-equiv="Content-Security-Policy"')) {
          html = html.replace(
            '<head>',
            `<head>\n  <meta http-equiv="Content-Security-Policy" content="${csp}">`
          );
        }
        return html;
      }
    } catch (e) {
      console.warn('Failed to read dist/index.html, using fallback HTML:', e);
    }

    // Fallback HTML if dist/index.html cannot be read
    return `<!DOCTYPE html>
<html lang="${locale}" data-mindflow-locale="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <title>MindFlow</title>
  <link rel="stylesheet" href="${distUri}/assets/index.css">
</head>
<body class="overflow-hidden select-none bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
  <div id="root"></div>
  <script type="module" src="${distUri}/assets/index.js"></script>
</body>
</html>`;
  }
}
