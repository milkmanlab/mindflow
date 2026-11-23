# リポジトリ構造定義書

> 本書は既存実装（v0.1.0）から起こしたものです。技術的な背景は [architecture.md](architecture.md) を参照してください。

## 1. フォルダ・ファイル構成

```
mindflow/
├── .github/
│   ├── dependabot.yml           # 依存パッケージの更新（月 1 回。方針は development-guidelines 5.5）
│   └── workflows/
│       └── ci.yml               # CI（lint → test → build と、E2E）
│   └── YYYYMMDD-開発タイトル/
│       ├── requirements.md
│       ├── design.md
│       └── tasklist.md
├── .vscode/
│   ├── launch.json              # F5 で拡張機能をデバッグ起動
│   └── tasks.json               # ビルドタスク build:all
├── docs/                        # 永続的ドキュメント
├── e2e/                         # E2E テスト（Playwright）。*.e2e.ts と helpers.ts
├── playwright.config.ts         # E2E の設定（Chromium、dev サーバーを自動で起動）
├── scripts/                     # 開発用のスクリプト（同梱フォントの字幅の表を作る generateFontMetrics.mjs、README 用のデモ GIF を作る recordDemoGif.mjs）
├── src/                         # Webview アプリ（React）
│   ├── main.tsx                 # エントリーポイント
│   ├── App.tsx                  # 状態管理とショートカットの中心
│   ├── index.css                # Tailwind の読み込みと共通スタイル
│   ├── types.ts                 # 型定義（MindMap, MindNode など）
│   ├── components/              # 画面部品
│   ├── hooks/                   # カスタムフック
│   ├── i18n/                    # 画面の文字列（辞書 ja.ts・en.ts と t()）
│   ├── services/                # 外部とのやりとり（VS Code / localStorage、画像のエクスポート）
│   └── utils/                   # 純粋関数（変換・ツリー操作・レイアウト・テーマ・エクスポート）
│       └── tree/                # ツリー操作の実装（入口は utils/treeOperations.ts）
├── vscode-extension/            # 拡張機能ホスト（別パッケージ）
│   ├── src/
│   │   ├── extension.ts         # activate、コマンド登録（新規作成コマンドを含む）
│   │   ├── newMapFile.ts        # 新規マインドマップのファイル名（`Untitled-N`）と初期内容（純粋関数）
│   │   ├── mindFlowEditorProvider.ts  # Custom Text Editor の本体
│   │   └── documentSyncState.ts       # Webview とドキュメントの同期状態（エコー判定）
│   ├── .vscodeignore            # .vsix に含めないファイル
│   ├── package.json             # 拡張機能のマニフェスト
│   ├── tsconfig.json
│   ├── dist/                    # Webview のビルド結果（Git 管理外）
│   └── out/                     # 拡張機能のビルド結果（Git 管理外）
├── README.md
├── index.html                   # Webview の HTML テンプレート
├── package.json                 # Webview 側のパッケージと全体のビルドスクリプト
├── tsconfig.json                # Webview 側の型チェック設定
└── vite.config.ts               # Webview のビルド設定
```

## 2. ディレクトリの役割

| ディレクトリ | 役割 | 依存してよい先 |
|---|---|---|
| `src/components/` | 画面部品。表示と、ユーザー操作をコールバックで親に伝えることを受け持つ | `types`、`utils`、`i18n`、他の `components`。`services` は使わず、外部とのやりとりはコールバックで `App` に任せる |
| `src/hooks/` | 状態管理や副作用。複数の部品で使うもの（選択状態、自動保存）と、大きなコンポーネントから役割ごとに切り出したもの（`useCanvas*` など）。フック専用の補助関数（`canvasKeyboardHandlers.ts` など）も置く | `types`、`utils`、`services`、`i18n` |
| `src/i18n/` | 画面の文字列の辞書と、`t()`。React や DOM に依存しない。直書きを検出するテストもここに置く | なし |
| `src/services/` | 外部環境とのやりとり。VS Code の API と localStorage の違いをここで吸収する | `types`、`utils` |
| `src/utils/` | React や DOM、`services` に依存しない純粋関数。単体テストの主な対象 | `types`、`i18n`、他の `utils` |
| `src/types.ts` | 型と定数の定義 | なし |
| `vscode-extension/src/` | VS Code API を使う処理。Webview とはメッセージだけでやりとりし、`src/` のコードは import しない | VS Code API、Node 標準モジュール |
| `docs/` | アプリ全体の基本設計（永続的ドキュメント） | — |

`src/` と `vscode-extension/src/` は、別々にビルドされます。互いのコードを import することはできません。

## 3. ファイル配置ルール

### 3.1 新しいファイルの置き場所

| 追加するもの | 置き場所 |
|---|---|
| 画面部品 | `src/components/` |
| 状態や副作用をまとめたロジック | `src/hooks/` |
| `MindMap` を受け取って新しい `MindMap` を返す操作 | `src/utils/tree/` の役割が合うファイルに書き、`src/utils/treeOperations.ts`（入口）から公開する |
| Markdown の書き出し・読み込みに関わる処理 | `src/utils/markdownSync.ts` に追加 |
| VS Code やブラウザ固有の処理（Webview 側） | `src/services/storageAdapter.ts` に追加 |
| VS Code API を使う処理 | `vscode-extension/src/` |
| 型 | `src/types.ts` |
| テーマ | `src/utils/themes.ts` の `THEMES` に追加（名前は `src/i18n/ja.ts` の `theme.*` に書く） |
| 書体 | `src/utils/fontStyles.ts` の `FONT_STYLES`。同梱フォントは `fontFaces.ts` と `scripts/fontMetricsCore.mjs` の両方に足し、`npm run fonts:metrics` で字幅の表を作り直す |
| 画面の文字列 | `src/i18n/ja.ts` と `en.ts` にキーを足し、`t()` で引く |
| 拡張ホストの通知・ダイアログの文字列 | `vscode-extension/src/messages.ts`（`ja` と `en`） |
| テスト | 対象ファイルと同じ場所に `*.test.ts` |
| 図に使う画像 | `docs/images/` |

### 3.2 ファイル名

| 種類 | 形式 | 例 |
|---|---|---|
| コンポーネント | PascalCase の `.tsx`。名前はコンポーネント名と同じにする | `MindNodeComponent.tsx` |
| フック | `use` で始まる camelCase の `.ts` | `useAutoSave.ts` |
| ユーティリティ・サービス | camelCase の `.ts` | `treeOperations.ts` |
| テスト | `対象ファイル名.test.ts` | `layout.test.ts` |

### 3.3 Webview と拡張機能の間で共有するもの
メッセージの形（`type` とデータ）は、`storageAdapter.ts` と `mindFlowEditorProvider.ts` の両方に書かれています。共有の型ファイルはありません。メッセージを追加・変更するときは、両方のファイルと、[functional-design.md](functional-design.md) の「7. メッセージ仕様」を合わせて更新します。
