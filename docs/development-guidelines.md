# 開発ガイドライン

> 本書は既存コードとコミット履歴の傾向から起こしたものです。ファイルの置き場所は [repository-structure.md](repository-structure.md) を参照してください。

## 1. コーディング規約

### 1.1 共通
- TypeScript で書きます。`any` は、外部 API の境界（VS Code API、メッセージのデータなど）以外では使いません
- コメントと UI の文言は日本語で書きます。コメントには「何をしているか」より「なぜそうしているか」を書きます
- 変更後は `npm run lint`、`npm run test`、`npm run build` をすべて通します（CI と同じ内容です）

### 1.2 状態とデータ
- `MindMap` は書き換えません。変更するときは、必ず新しいオブジェクトを作って返します
- ツリーの構造を変える操作は、`treeOperations.ts` の純粋関数として書きます（`treeOperations.ts` は入口で、実装は役割ごとに `utils/tree/` に置きます）。コンポーネントや `App` の中で `nodes` を直接いじりません
- 変更がない場合は、受け取った `MindMap` をそのまま返します。呼び出し側は `updated !== mindMap` で、変更があったかを判定できます
- `MindNode` / `MindMap` に項目を追加するときは、次の 3 つを同じ PR で行います
  1. `types.ts` に型を追加する
  2. `markdownSync.ts` の書き出しと読み込みの両方に対応させる（`NodeMetadata`、`getNodeMeta`、パーサー）
  3. `markdownSync.test.ts` に、往復変換のテストを追加する
- Undo/Redo は Webview 側の `useUndoableMap`（`utils/history.ts`）で、マップ全体のスナップショットとして管理します。履歴はメモリ上だけに持ち、外部からの `update` や初期ロードでリセットします
  - 履歴に積む変更は `commit`、直前のステップにまとめる変更（新しいノードへの最初の入力など）は `amend` を使います
  - Cmd/Ctrl+Z・Y は `document` の keydown で伝播を止めます。`window` まで届くと VS Code 側の TextDocument の Undo が動いてしまうためです（`App.tsx` を参照）

### 1.3 層の依存ルール
- **コンポーネント**（`components/`）は、表示とユーザー操作の受け付けだけを受け持ちます。保存やリンクを開くなど外部とのやりとりは、コールバックで `App` に任せ、`services` を直接呼びません
- **ユーティリティ**（`utils/`）は、React、DOM、`services` に依存しない純粋関数にします。データを作るところまでを受け持ち、保存や表示は呼び出し側で行います
- **サービス**（`services/`）は、VS Code とブラウザの違いを吸収する唯一の場所です。`acquireVsCodeApi` や `localStorage` のマップ本体の読み書きは、ここ以外で行いません

### 1.4 React
- 関数コンポーネントで書き、`export const 名前: React.FC<名前Props> = (...) => {...}` の形にそろえます
- props の型は、同じファイルの `interface 名前Props` に書きます
- 子に渡すイベントハンドラーは `useCallback`、重い計算（レイアウトなど）は `useMemo` で包みます
- 状態は、なるべく `App` かカスタムフックに集めます。似たような状態を複数のコンポーネントに持たせません
- キーボード操作では、入力欄にフォーカスがあるときに、ショートカットが誤って動かないようにします（`App.tsx` の `isExternalInput` 判定を参照）
- `useEffect` / `useCallback` / `useMemo` の依存配列には、中で使う値をすべて入れます。漏れがあると、古い state や props を参照したまま動きます。わざと外す場合は、その理由をコメントに書きます
- `window` や `document` にイベントリスナーを登録したら、必ずクリーンアップ関数で解除します
- 同じキーを複数のコンポーネントで処理しないようにします。グローバルなショートカットは、担当する場所を 1 つに決めます

### 1.5 ユーザーへの通知
- トーストで知らせるのは、エラーと警告（「ルートノードは削除できません」など）だけにします。画面を見れば結果がわかる通常の操作では、トーストを出しません

### 1.5.1 画面の文字列
- 画面に出る文字（ラベル・`title`・`aria-label`・`placeholder`・トースト・保存状態など）は、コンポーネントやフックに直書きせず、`src/i18n/ja.ts` に書いて `t('キー')` で引きます。`{n}` のような差し込みは `t('time.minutesAgo', { n: 3 })` の形で渡します
- 選択肢の配列（`LAYOUT_OPTIONS` など）には、文字列ではなくキー（`labelKey`）を持たせ、描画のときに `t()` を呼びます
- 新規ノードの既定テキストなど、Markdown に書き込まれる文字は `content.*` に置きます。表示だけの文字と区別するためです
- 辞書は `ja.ts`（日本語）と `en.ts`（英語）の 2 つを同時に更新します。`en.ts` は `Record<MessageKey, string>` なので、キーが足りないと型エラーになります。差し込み（`{n}`）の名前は両方で揃えます。訳語は `docs/glossary.md` の英日対応表に合わせます
- 直書きは `src/i18n/noHardcodedJapanese.test.ts` が検出します（コメントと正規表現は対象外）。テストの言語は `src/testSetup.ts` で日本語に固定されています

### 1.6 ファイルと関数の大きさ

| 対象 | 目安 | 分割を検討する |
|---|---|---|
| コンポーネント（`.tsx`） | 200 行以内 | 300 行を超えたら |
| カスタムフック | 150 行以内 | 200 行を超えたら |
| `utils/` の純粋関数のファイル | 300 行以内 | 500 行を超えたら |
| 1 つの関数・ハンドラー | 50 行以内 | 80 行を超えたら |

- 上の数字は絶対の上限ではありません。超えたときは、そのファイルや関数の役割が 1 つになっているかを確認します
- 分けるときは、次のように振り分けます
  - 状態とイベント処理 → カスタムフック（`hooks/`）
  - 純粋な計算や判定 → `utils/`（テストも付ける）
  - 表示のまとまり → サブコンポーネント
- props が 15 個を超えたら、関連するもの（ドラッグ＆ドロップ、編集など）ごとに、オブジェクトやフックにまとめることを検討します
- テストファイルは対象外です

### 1.7 読みやすさと保守性
- 意味のある数値（ズームの上限・下限、余白、しきい値など）は、直接書かずに UPPER_SNAKE_CASE の定数にします。複数の場所で使う値は、1 か所で定義します
- ほとんど同じ処理が 2 回出てきたら、違う部分を引数にした共通の関数にします
- 条件に合わないときは先に return して、ネストを浅くします（目安は 3 段まで）
- 使っていない import や変数、実行されることのないコード、コメントアウトしたコードは残しません。過去のコードは Git の履歴で確認できます
- 「判定する処理」（純粋な計算）と「state の更新や副作用」を、同じ関数に混ぜません。判定する処理は純粋関数として切り出し、テストを付けます

### 1.8 セキュリティ
- `dangerouslySetInnerHTML` は使いません。ノードの本文、メモ、リンクなどユーザーが入力した内容は、React のテキストとして表示します
- 外部リンクは `storageAdapter.openExternal` だけを通して開きます。許可するスキームは `http:`、`https:`、`mailto:` だけで、それ以外の文字列には `https://` を付けて扱います（`javascript:` などを実行させないため）
- Webview と拡張機能の間のメッセージは、受け取った側で `type` と中身の型を確認してから使います
- Markdown の HTML コメント（`<!-- mindflow:{json} -->` など）の JSON は、読み込みに失敗しても例外で止めず、既定値に戻して処理を続けます

### 1.9 型チェックと静的解析
- `tsconfig.json` で `strict`、`noUnusedLocals`、`noUnusedParameters` を有効にしています
- ESLint（`eslint.config.js`）は、`@typescript-eslint` の推奨ルールに加えて、`react-hooks/rules-of-hooks` と `react-hooks/exhaustive-deps` を有効にしています。依存配列をわざと絞る場合は、`// eslint-disable-next-line react-hooks/exhaustive-deps` と理由のコメントを書きます
- `npm run lint`（`tsc --noEmit && eslint src vscode-extension/src`）と CI で確認します。`any` は使わず、型が決まらない値は `unknown` で受けて絞ります

## 2. 命名規則

| 対象 | 形式 | 例 |
|---|---|---|
| コンポーネント | PascalCase | `NodePropertiesBar` |
| props の型 | コンポーネント名 + `Props` | `NodePropertiesBarProps` |
| フック | `use` + PascalCase | `useMindMapSelection` |
| 関数・変数 | camelCase | `addChildNode`、`selectedNodeId` |
| イベントハンドラー（受け取る側の props） | `on` + 動詞 | `onSelectNode`、`onExportPNG` |
| イベントハンドラー（実装する側） | `handle` + 動詞 | `handleAddChild` |
| 真偽値 | `is` / `has` / `enable` で始める | `isFolded`、`hasChildren`、`enableRightClickPan` |
| 定数 | UPPER_SNAKE_CASE | `HORIZONTAL_LEVEL_GAP`、`THEMES` |
| 型・インターフェース | PascalCase | `MindNode`、`LayoutResult` |
| ID の文字列 | 種類を表す接頭辞 + ランダムな文字列 | `node_xxxxxxx_yyyy` |
| DOM の `id` 属性 | ケバブケース。ボタンは `btn-` で始める | `mind-canvas-container`、`btn-zoom-out` |
| localStorage のキー | `mindflow_` + 内容 + `_v番号` | `mindflow_input_mode_v1` |
| Markdown のコメント | `mindflow` または `mindflow-種類` | `<!-- mindflow:{...} -->`、`<!-- mindflow-relations:[...] -->` |

用語の意味と英語・日本語の対応は [glossary.md](glossary.md) を参照してください。

## 3. スタイリング規約

- スタイルは Tailwind CSS のユーティリティクラスで書きます。独自の CSS は `src/index.css` に置き、スクロールバーやグリッド背景など、Tailwind で書きにくいものに限ります
- ダークモードには `dark:` を使います。`dark:` はマップのテーマ（`THEMES[themeId].isDark`）に追従し、`App` がルート要素（`#mindflow-app-root`）に `dark` クラスを付け外しします。OS の設定や VS Code のカラーテーマには従いません
- マップの見た目（背景、ノード、線、枝の色）は、`themes.ts` の `ThemeConfig` から取ります。コンポーネントの中にテーマ用の色を直接書きません
- インラインの `style` は、座標、大きさ、ユーザーが選んだ色など、実行中に決まる値だけに使います
- UI（ツールバー、メニュー、プロパティバー、モーダルなど）のスタイルは、次の決まりに従います。`src/styleRules.test.ts` が、守られているかを確かめます
  - **状態色**（選択、フォーカス、ドロップ位置、決定ボタン）は、テーマの `accent` / `onAccent` を使います。`bg-accent`、`text-on-accent`、`ring-accent`、`outline-accent` などと書き、`blue-*` や `indigo-*` を直接書きません。値は `App` がルート要素の CSS 変数（`--mf-accent`、`--mf-on-accent`）で渡します。SVG の属性など CSS 変数が使えない所では `theme.accent` を使います。完了（進捗 100%）は `theme.done`（`text-done`・`bg-done/15`）で、緑・琥珀・黄（`emerald-*`・`amber-*` など）は直接書きません。メモの印は意味の色を使わず、文字色の薄い版にします。ノードの色・関連線の色の選択肢は、テーマの `branchColors` から作ります（`getColorPresets`）
  - **「選択中」の表し方**は、設定やプロパティでは色を使わず、`bg-surface-muted` の面と濃い文字（`text-ink-strong`）で表します（一覧の行にはチェックマークも付けます）。設定メニューでは、「1 つを選ぶ」項目は `SettingsOptionRow`、「オン・オフ」の項目は `SettingsSwitchRow`（スイッチ。これも色は使わず灰色のトークンの濃淡で表します）を使います。選択肢に添える見本の絵は `SettingsPreviews` の部品（`ThemePreview`・`ConnectorPreview`・`ShapePreview`）を使い、色や形を別に持ちません
  - **プロパティバーのパネル**は、選択中の表し方を 2 種類に絞ります（色の見本は輪の `Swatch`、文字の選択肢は枠と灰色の面の `ChoiceButton`）。確定用のボタンは置かず、選ぶものはすぐ反映してパネルを開いたままにし、文字を打つものは入力欄から離れたときと Enter（複数行は Ctrl+Enter）で反映します（`useCommittedText`）。消す操作は `ClearButton`、「開いている」は `PanelToggleButton` の背景、「設定済み」は右上の点で示します
  - **動き**は、操作への応答だけに付けます。`transition-colors` や `transition-opacity` のように、変わるものだけを対象にし、`transition-all`、開閉のアニメーション（`animate-in` など）、hover や押下での拡大縮小、点滅は使いません。回転（`animate-spin`）は「読み込み中」「保存中」だけです。動きを減らす設定（`prefers-reduced-motion`）のときの対応は `src/index.css` の 1 か所で行うので、各部品には書きません
  - **角丸**は、小（`rounded-control`、6px：ボタン、入力欄、バッジ、一覧の行）と中（`rounded-panel`、10px：メニュー、パネル、モーダル、浮いているバー）の 2 段階です。`rounded-full` は、丸であることに意味があるもの（色見本、ノードの追加・折りたたみボタン、点、スイッチ）だけに使います。ノードの角丸は `nodeStyle.ts` が決めます
  - **影**は、キャンバスの上に浮く要素（メニュー、モーダル、検索バー、プロパティバー、表示操作、ミニマップ、トースト）だけに `shadow-float` を付けます。ノードと面の区切りには付けず、`border` で表します
  - **すりガラス**（`backdrop-blur-*`）と、グラデーションは使いません（ルートノードも単色で、色は `bg-root` / `text-on-root` / `border-root-line` で取ります。テーマの `root` の値を `App` が CSS 変数 `--mf-root` などで渡します）
  - **UI の灰色**は、テーマの `ui`（`UiPalette`）から取ります。面は `bg-surface`（メニュー・パネル・バー）・`surface-sunken`（沈んだ面）・`surface-muted`（hover・選択中・灰色の枠）・`surface-strong`（一段濃い面）、枠は `border-line-subtle`（区切り）・`line`（外枠・入力欄）・`line-strong`（濃い枠・スイッチのオフ）、文字は `text-ink-strong`（見出し）・`ink`（本文）・`ink-muted`（補助文字）で書きます。値は `App` が `themeCssVariables(theme)` でルート要素の CSS 変数（`--mf-surface` など）に渡すので、灰色のために `dark:` の対は書きません（`slate-*`・`white`・`black` の直書きも禁止。覆いの `bg-black/50` とノードの中は除く）。ナチュラルは stone、オーシャンとダークは slate、モノクロは neutral の灰色です。補助文字（`ink-muted`）は、面・沈んだ面・hover の面の上で 4.5:1 以上、本文・見出しは 7:1 以上になるよう、`themes.test.ts` が確かめます。アイコンだけのボタンは、`title` を `aria-label` にも渡します（共通部品が行います）。キーボードでフォーカスしたときの枠は、`index.css` の `:focus-visible` で 1 か所だけ決めます
  - **画面の言葉**は、同じものを同じ名前で書きます（「ノードの色」「進捗」「形」）。消す操作は、ノード・関連線そのものは「削除」、付けた設定を外すのは「解除」です。キーは `Ctrl/Cmd+キー`、矢印はアイコンで示し、項目名の末尾にコロンを付けません
  - **ボタンの大きさ**は 2 系統です（`IconButton` の `ICON_BUTTON_SIZE`）。通常は 32px・アイコン 16px（上のバー・右下のバーなど、浮くバー）、小は 28px・アイコン 14px（プロパティバー・パネル・メニューの中）。灰色の枠（`SegmentGroup`）の中のボタンは、枠の余白を引いた 24px で、3 つ目の系統ではありません。アイコンだけのボタンは `IconButton` を使い、開いている間の表し方は灰色の面（`text-accent` は使わない）にします
  - **浮くバー**（上のバー・右下のバー）の外枠は `FloatingBar` を使い、面・境界・影・角丸をそろえます。上のバーは `top-6 right-6`、右下のバーは `bottom-6 right-6` に置きます
  - **文字**は「見出し・本文・補助」の 3 役で、`src/index.css` の `text-ui-heading`（12px・600）、`text-ui-body`（12px・500）、`text-ui-caption`（11px・400）で書きます。`text-xs`・`text-[11px]`・`font-medium` などを直接書きません（ノードの中の文字と太字ボタンの `font-bold` だけ除く。`styleRules.test.ts` の許可リスト）。`uppercase`、`tracking-*`、`font-black` は使いません。画面の文言は機能を表す短い日本語にし、「(推奨)」、英語の併記、【】、絵文字は書きません。数値を揃えるときは `font-mono` ではなく `tabular-nums` を使います（`<kbd>` は等幅のままにします）
- ノードの余白、フォント、画像の大きさを変えたときは、`nodeDimensions.ts` の `estimateNodeDimensions` も合わせて直します。欧文の字幅は、同梱フォントから作った `src/utils/fontMetrics.generated.json` を引きます。Fontsource の版を上げたら `npm run fonts:metrics` で作り直してコミットします（作り忘れは `fontMetrics.test.ts` が落とします）。見た目の大きさと計算上の大きさがずれると、ノードが重なります
- テスト用や操作対象を特定するための目印として、主要な要素には `id` 属性を付けます

## 4. テスト規約

- テストは Vitest で書き、対象ファイルと同じ場所に `対象.test.ts` として置きます
- 主な対象は `utils/` の純粋関数です。特に、次の変更にはテストを付けます
  - `markdownSync.ts`：Markdown → マップ → Markdown の往復で、データが変わらないこと
  - `treeOperations.ts`（`utils/tree/`）：構造の変更（追加、削除、移動など）と、元のマップが書き換わっていないこと。テストは `utils/tree/` の対象ファイルの隣に置き、`testHelpers.ts` の `basicMap`・`dump` で操作のあとの `parentId`・`side`・`order` を比べます
  - `layout.ts`：ノードの位置と重なり（配置の結果はスナップショットで固定しています。配置のしかたを意図して変えたときだけ更新します）
  - `nodeDimensions.ts`：ノードの大きさの見積もり
- テスト名は日本語で、「〜こと」で終わる文にします

  ```ts
  it('ルートノードは削除できないこと', () => { ... });
  ```

- 画面を実際に動かす E2E テストは Playwright（Chromium）で書き、`e2e/` に `〜.e2e.ts` として置きます。`npm run dev` のブラウザ単体モードを操作し、`npm run e2e` で実行します。CI でも動きます
  - 対象は、状態・キー・フォーカスの組み合わせで壊れやすい流れ（ノードの追加、Undo/Redo、日本語入力、ドラッグ&ドロップ、保存と復元、文字のはみ出し、PNG 書き出し）です。過去に直した不具合は、再現するテストを足します
  - Playwright は、版ごとに使う Chromium の版が決まっています（CI は毎回入れ直すので、いつも合います）。ブラウザを先に入れてある環境（クラウドのセッションなど）で、入っている Chromium が合わないときは、環境変数 `E2E_CHROMIUM_PATH` に Chromium の実行ファイルを指定します（例：`E2E_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`）。文字幅の E2E（`font.e2e.ts`）は、字送りの丸め方（`--font-render-hinting` の `none` / `full`）を変えて 2 回流すため、フラグが効く headless shell を使います。先に入れてある環境では、`E2E_HEADLESS_SHELL_PATH` に headless shell の実行ファイルも指定します（例：`E2E_HEADLESS_SHELL_PATH=/opt/pw-browsers/chromium_headless_shell`）。Playwright 1.65 と Chromium 153 の組み合わせで、E2E が全部通ることを確かめています（2026-11-19）
  - 時間で待ちません（`waitForTimeout` は使わない）。`expect(...)` や `expect.poll(...)` の自動再試行で待ちます。ノードは、毎回変わる id ではなく文字で探します（`e2e/helpers.ts`）
  - 日本語入力は Chrome DevTools Protocol（`Input.imeSetComposition`）で再現します。Tab の連打のように「描画の前に操作が重なる」不具合は、`pressKeyBurst` でブラウザの中から続けて送ります。`keyboard.press` は 1 回ごとに描画を待つため、再現できません
  - 新しい E2E テストは、直した処理を一時的に戻して、落ちることを確かめてから入れます（通るだけのテストを作らないため）
  - `data-node-text` のような、テスト用の目印の属性は、見た目に影響しない範囲で `src/` に足してかまいません
- コンポーネントの単体テストは、必要なものだけ書いています。UI の変更は、E2E テストに加えて、`npm run dev` か F5 での拡張機能デバッグで動作を確認します

## 5. Git 規約

### 5.1 ブランチ運用（GitHub Flow）
- `main` に直接コミットや push はしません
- 作業ごとにブランチを作り、作ったらすぐ push します
- 作業が終わったら `gh pr create` で PR を作ります。CI が通っていることを確認してからマージします
- マージしたら、手元とリモートの両方のブランチを削除します
- 上の「`main` に直接 push しない」と「CI が通ってからマージする」は、運用で守ります。GitHub のブランチ保護（Rulesets）は、GitHub Free の非公開リポジトリでは強制されないため入れていません（2026-11-19 に見送り）。人が増える、リポジトリを公開する、有料プランに上げるときは、見直します

### 5.2 ブランチ名

| 接頭辞 | 用途 | 例 |
|---|---|---|
| `feature/` | 機能追加。`YYYYMMDD-タイトル` を付ける | `feature/20260917-tight-node-padding` |
| `fix/` | 不具合の修正、小さな UI 調整 | `fix/note-cursor-pointer` |
| `refactor/` | 動作を変えない構造の変更 | `refactor/export-utils-split` |
| `docs/` | ドキュメントだけの変更 | `docs/update-readme` |

### 5.3 コミットメッセージ
[Conventional Commits](https://www.conventionalcommits.org/) の形式で書きます。説明は日本語を基本とします。

```
型(対象範囲): 変更内容の要約

（必要なら本文で、理由や補足を書く）
```

| 型 | 用途 |
|---|---|
| `feat` | 機能追加 |
| `fix` | 不具合の修正 |
| `style` | 見た目の調整（余白、色、カーソルなど） |
| `refactor` | 動作を変えない構造の変更 |
| `docs` | ドキュメント |
| `test` | テストの追加・修正 |
| `chore` | ビルド設定や依存パッケージの更新 |

対象範囲は、`ui`、`dnd`、`layout`、`canvas`、`node`、`types`、`header` などの機能や部品の名前です。省略してもかまいません。

### 5.4 依存パッケージの更新（Dependabot）
- `.github/dependabot.yml` が、月 1 回（日本時間）、ルート・`vscode-extension/`・GitHub Actions の更新を PR にします。マイナー・パッチは 1 つの PR にまとめ、メジャーは 1 件ずつ PR になります（`react` と `react-dom`、`lucide` と `lucide-react` は、セットで 1 つの PR）。公開から 7 日たっていない版は提案されません
- PR は、CI（lint・test・build・E2E）が通っていることを確かめてからマージします。メジャー更新（`vite`・`typescript`・`@vitejs/plugin-react` など）は、CI に加えて、`npm run dev` で画面を見て、F5 で拡張機能を動かして確かめます。要らない更新は、PR に `@dependabot ignore this major version` とコメントして閉じます
- 自動では上げないもの：`@types/vscode`（`engines.vscode` より新しくすると `vsce package` が失敗するため、`engines.vscode` を上げるときに手で合わせる）と、`@types/node` のメジャー（CI の Node に合わせる）。`@playwright/test` は版を固定していて（版ごとに使う Chromium も変わるため）、更新は単独の PR で来る。クラウド環境のブラウザと版が合わないときは、4 章の `E2E_CHROMIUM_PATH` で回避する
- 拡張機能側（`vscode-extension/package.json`）の `overrides` で、`minimatch` を修正版（`^11.0.8`）に固定しています。`@vscode/vsce` が古い版（`^10.2.6`）を要求していて、Dependabot の更新だけでは直せないためです（ルートの `package.json` も同じ）。`@vscode/vsce` が修正版に対応したら、外してかまいません
- 脆弱性の通知（Dependabot alerts・security updates）は、コードでは設定できません。リポジトリの Settings → Code security で有効にします
