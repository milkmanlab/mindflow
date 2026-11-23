import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { MindFlowEditorProvider, currentLocale } from './mindFlowEditorProvider';
import { hostMessage } from './messages';
import { errorMessage } from './errorMessage';
import { MAP_FILE_EXTENSION, initialMapMarkdown, nextUntitledFileName, toMapFileName } from './newMapFile';

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch (err) {
    if (err instanceof vscode.FileSystemError && err.code === 'FileNotFound') return false;
    throw err;
  }
}

/** 作る場所を決める。エクスプローラーのフォルダ → 最初のワークスペースフォルダ。どちらもなければ undefined */
function targetFolder(uri?: vscode.Uri): vscode.Uri | undefined {
  return uri ?? vscode.workspace.workspaceFolders?.[0]?.uri;
}

/** 新しいマインドマップ（*.mindflow.md）を作って開く */
async function createNewMap(uri?: vscode.Uri): Promise<void> {
  const locale = currentLocale();
  const folder = targetFolder(uri);

  let fileUri: vscode.Uri;
  if (folder) {
    // 名前は尋ねない。フォルダの中身を見て、空いている最小の番号で決める
    let existing: string[];
    try {
      existing = (await vscode.workspace.fs.readDirectory(folder)).map(([name]) => name);
    } catch (err) {
      const message = errorMessage(err);
      vscode.window.showErrorMessage(hostMessage(locale, 'error.createFailed', { message }));
      return;
    }
    fileUri = vscode.Uri.joinPath(folder, nextUntitledFileName(existing));
  } else {
    // ワークスペースがないときは、保存ダイアログで場所と名前を決める（同名の上書き確認はダイアログが出す）
    const picked = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(path.join(os.homedir(), nextUntitledFileName([]))),
      saveLabel: hostMessage(locale, 'dialog.save'),
      filters: { MindFlow: [MAP_FILE_EXTENSION.slice(1)] },
    });
    if (!picked) return;
    fileUri = picked.with({ path: path.posix.join(path.posix.dirname(picked.path), toMapFileName(path.posix.basename(picked.path))) });
  }

  try {
    if (folder && (await fileExists(fileUri))) {
      vscode.window.showErrorMessage(hostMessage(locale, 'error.fileExists', { name: path.posix.basename(fileUri.path) }));
      return;
    }
    await vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(initialMapMarkdown(path.posix.basename(fileUri.path))));
    await vscode.commands.executeCommand('vscode.openWith', fileUri, MindFlowEditorProvider.viewType);
  } catch (err) {
    const message = errorMessage(err);
    vscode.window.showErrorMessage(hostMessage(locale, 'error.createFailed', { message }));
  }
}

export function activate(context: vscode.ExtensionContext) {
  // Register the Markdown Custom Text Editor Provider
  context.subscriptions.push(MindFlowEditorProvider.register(context));

  // Register command to open current active text editor in MindFlow
  const openCommand = vscode.commands.registerCommand('mindflow.openAsMindMap', async (uri?: vscode.Uri) => {
    let targetUri = uri;
    if (!targetUri && vscode.window.activeTextEditor) {
      targetUri = vscode.window.activeTextEditor.document.uri;
    }

    if (targetUri) {
      await vscode.commands.executeCommand(
        'vscode.openWith',
        targetUri,
        MindFlowEditorProvider.viewType
      );
    } else {
      vscode.window.showWarningMessage(hostMessage(currentLocale(), 'warn.selectFile'));
    }
  });

  context.subscriptions.push(openCommand);
  context.subscriptions.push(vscode.commands.registerCommand('mindflow.createNewMap', createNewMap));
}

export function deactivate() {}
