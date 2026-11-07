# Universal UI Design System — Specification v2.0

> **目的**：このファイルを別々のWebプロジェクトへ渡した際、同じ視覚言語・コンポーネント・モーションを再現する。
> **適用**：Webサイト、Webアプリ、ダッシュボード、ツール。プロジェクト固有の要件が明示された場合はそちらを優先。
> **基準テーマ**：落ち着いたブルー×グレー、端正で機能的、過剰な装飾なし。特定製品の既存UIをコピーするものではない。
> **重要**：同じMDだけでピクセル単位の完全一致は保証できない。完全一致にはフォント・アイコン・実装コード・画面幅・OS・ブラウザの固定と、共通コンポーネントの再利用が必要。

## 0. 絶対原則

1. 情報設計を先に決め、ボタンを増やして解決しない。
2. ナビゲーション、タブ、ボタン、トグル、メニュー、カード、モーダルを用途で使い分ける。
3. 既存プロジェクトへの導入では既存画面を勝手に全面改修しない。新規プロジェクトは本仕様を全面適用できる。
4. 操作の状態（通常・hover・focus・active・disabled・loading・error・success）を設計する。
5. 文字が折り返されて意味を失うUIを禁止。データ表示に必要な横幅を確保する。
6. 見た目だけの偽ボタン、機能しないコントロールを完成扱いしない。
7. UIとモーションは視覚的一貫性、可読性、アクセシビリティ、性能を両立する。

## 1. デザイントークン（唯一の正本）

以下の値をCSS変数として定義し、原則として各画面で直接色・角丸・影・時間をハードコードしない。

```css
:root {
  color-scheme: light;
  --ui-font: Inter, "Noto Sans JP", system-ui, -apple-system, "Segoe UI", sans-serif;
  --ui-bg: #f5f7fa;
  --ui-surface: #ffffff;
  --ui-surface-muted: #eef2f6;
  --ui-text: #182431;
  --ui-text-muted: #566576;
  --ui-border: #d9e1e9;
  --ui-primary: #245d8f;
  --ui-primary-hover: #1b4d78;
  --ui-primary-pressed: #153c5e;
  --ui-primary-soft: #e8f1f8;
  --ui-danger: #b42332;
  --ui-success: #21744a;
  --ui-focus: #3b82f6;
  --ui-shadow-sm: 0 1px 3px rgb(17 34 51 / 8%);
  --ui-shadow-md: 0 8px 24px rgb(17 34 51 / 10%);
  --ui-shadow-lg: 0 20px 48px rgb(17 34 51 / 16%);
  --ui-radius-xs: 4px;
  --ui-radius-sm: 8px;
  --ui-radius-md: 12px;
  --ui-radius-lg: 16px;
  --ui-radius-xl: 24px;
  --ui-radius-pill: 999px;
  --ui-space-1: 4px;
  --ui-space-2: 8px;
  --ui-space-3: 12px;
  --ui-space-4: 16px;
  --ui-space-5: 20px;
  --ui-space-6: 24px;
  --ui-space-8: 32px;
  --ui-space-10: 40px;
  --ui-space-12: 48px;
  --ui-content-max: 1200px;
  --ui-control-height: 40px;
  --ui-control-height-sm: 32px;
  --ui-control-height-lg: 48px;
  --ui-ease-standard: cubic-bezier(.2, 0, 0, 1);
  --ui-ease-enter: cubic-bezier(0, 0, .2, 1);
  --ui-ease-exit: cubic-bezier(.4, 0, 1, 1);
  --ui-duration-instant: 80ms;
  --ui-duration-fast: 140ms;
  --ui-duration-normal: 220ms;
  --ui-duration-slow: 320ms;
}
[data-theme="dark"] {
  color-scheme: dark;
  --ui-bg: #101820;
  --ui-surface: #1b2732;
  --ui-surface-muted: #253443;
  --ui-text: #edf3f8;
  --ui-text-muted: #b1bfcb;
  --ui-border: #3b4c5b;
  --ui-primary: #83b7e2;
  --ui-primary-hover: #a2cdf0;
  --ui-primary-pressed: #c4e0f7;
  --ui-primary-soft: #263f55;
  --ui-danger: #ff8894;
  --ui-success: #72d4a0;
  --ui-focus: #9bcaff;
}
```

暗色テーマのプライマリ色は文字・アイコンとして使い、塗りボタンには暗色の文字色を組み合わせてコントラストを確保する。色の意味はテーマ間で変えない。

## 2. タイポグラフィ

| 役割 | サイズ / 行高 | ウェイト |
|---|---|---|
| ページタイトル | 28px / 1.3 | 700 |
| セクション見出し | 20px / 1.4 | 700 |
| カード見出し | 16px / 1.5 | 600 |
| 本文 | 14px / 1.6 | 400 |
| 補足 | 12px / 1.5 | 400 |
| ボタン | 14px / 1.2 | 600 |

- 日本語と英数字の混在に対応。本文を画像化しない。
- テキストの最小サイズは原則12px。重要な情報は14px以上。
- 行長は本文でおおむね45〜75文字。数字は必要に応じ `font-variant-numeric: tabular-nums`。
- フォントが入っていない環境では指定のフォールバックを使用する。完全一致が必要ならプロジェクトで同一フォントの配布・ライセンス・読み込み方法を統一する。

## 3. レイアウトと密度

- コンテンツ最大幅1200px、中央寄せ。デスクトップの左右余白32px、タブレット24px、モバイル16px。
- 8pxグリッドを基本にし、4pxは微調整専用。
- セクション間32px、カード間16px、カード内24px、密なフォーム内12〜16px。
- 画面の機能が複雑な場合は専用ページを使う。短い確認・単純な入力のみダイアログ。
- モーダル標準幅480px、複雑なフォームは640pxまで。ファイル管理、表、カレンダー、編集画面は専用ページまたは幅広いワークスペース。
- モバイルで横スクロールを強制しない。表は必要なら明示的なスクロール領域にする。
- ブレークポイント：モバイル < 640px、タブレット640〜1023px、デスクトップ1024px以上。
- 画面幅に合わせてナビゲーションやカラム数を切り替える。単純な縮小表示は禁止。

## 4. コンポーネントの外観と役割

### ボタン
- Primary：画面の主要アクションに原則1つ。高さ40px、左右padding16px、角丸8px、背景 `--ui-primary`。
- Secondary：補助操作。高さ40px、角丸8px、薄い背景または境界線。
- Tertiary：目立たせないテキスト操作。不要な塗りを付けない。
- Destructive：削除などの危険操作。赤系と確認手順。
- Icon button：正方形40×40px、視覚アイコン＋アクセシブル名。意味が曖昧ならラベル併記。
- Pillはフィルターや選択チップなど適した用途に限定。**すべてのボタンを丸いピル形状にしない。**
- タッチターゲットは原則44×44px以上（表示上の高さ40pxでも周囲にクリック領域を確保）。

### ナビゲーション・タブ
- ページ移動はナビゲーション、同一画面の表示切替はタブ。
- タブの選択状態は色だけでなく下線・背景・太さなどで明示。
- 設定操作は専用パネルに集約し、通常時に全設定ボタンを並べない。

### カード・リスト
- カード：背景surface、境界線1px、角丸12px、padding24px。影は必要な場合だけsm。
- リスト：見出し・補足・アクションの位置を揃え、行ごとに大量の補助ボタンを常時表示しない。
- 空状態：何もない理由、次の一手、必要なら主要アクションを示す。

### 入力欄
- 高さ40px、角丸8px、境界線1px。ラベルを常時表示し、placeholderだけに依存しない。
- エラーは入力欄の近くに文で示す。入力値を無断で消さない。

### モーダル
- 右上に閉じるボタン。タイトル・本文・フッターを明確に分ける。
- Escで閉じる、フォーカスを内部に保つ、閉じたら起点へ戻す。背景スクロールを抑止。
- 重要な未保存変更がある場合は確認する。背景クリックで勝手に破棄しない。

## 5. モーションの原則

**モーションは操作結果・位置関係・状態変化を伝えるために使う。装飾のために乱用しない。**

### 時間・イージングの規格

| 用途 | 時間 | イージング | 変化 |
|---|---:|---|---|
| ボタンhover | 140ms | standard | 背景色・境界線・影 |
| ボタンpress | 80ms | standard | scale(0.98) |
| ツールチップ | 140ms | enter/exit | opacity + translateY(4px) |
| ドロップダウン | 140ms | enter/exit | opacity + translateY(6px) |
| タブ切替 | 140ms | standard | 下線・色。コンテンツは原則即時切替 |
| トースト登場 | 220ms | enter | opacity + translateY(8px) |
| トースト退場 | 140ms | exit | opacity + translateY(8px) |
| モーダル登場 | 220ms | enter | opacity + translateY(12px) + scale(.98→1) |
| モーダル退場 | 140ms | exit | opacity + translateY(6px) |
| ドロワー | 220ms | enter/exit | translateX(100%→0) |
| アコーディオン | 220ms | standard | 高さ変化 + アイコン回転 |
| カードhover | 140ms | standard | 影またはtranslateY(-2px)（両方を過剰に使わない） |
| ローディング | 800ms/周 | linear | spinner回転。進捗表示を優先 |

- 登場時はやや長く、退場時は短くする。
- 移動距離は4〜12pxを基本とし、画面全体を大きく飛ばさない。
- transformとopacityを優先。`top/left/width/height` の連続アニメーションは原則避ける（アコーディオン等は例外）。
- hover時の大きな拡大、連続バウンド、常時揺れ、派手なパララックスは禁止。
- 操作直後に視覚フィードバックを返す。通信待ちは進捗・処理中表示で明示。
- **一画面内の主要アニメーションは同時に多発させない。**

### 実装例（CSS）

```css
.ui-button {
  min-height: var(--ui-control-height);
  border-radius: var(--ui-radius-sm);
  transition: background-color var(--ui-duration-fast) var(--ui-ease-standard),
              border-color var(--ui-duration-fast) var(--ui-ease-standard),
              box-shadow var(--ui-duration-fast) var(--ui-ease-standard),
              transform var(--ui-duration-instant) var(--ui-ease-standard);
}
.ui-button:active:not(:disabled) { transform: scale(.98); }
.ui-button:focus-visible { outline: 3px solid var(--ui-focus); outline-offset: 2px; }
.ui-button:disabled { opacity: .48; cursor: not-allowed; }

@keyframes ui-dialog-in {
  from { opacity: 0; transform: translateY(12px) scale(.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.ui-dialog[data-state="open"] {
  animation: ui-dialog-in var(--ui-duration-normal) var(--ui-ease-enter) both;
}

@keyframes ui-toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.ui-toast[data-state="open"] {
  animation: ui-toast-in var(--ui-duration-normal) var(--ui-ease-enter) both;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

退場アニメーションは状態管理側で要素を即時アンマウントせず、退場終了後に削除すること。ダイアログのフォーカス管理と背景の操作禁止はCSSだけでは完結しない。

## 6. 操作・状態の一貫性

- 保存は成功・失敗を明示。自動保存なら保存中・保存済み・失敗を区別。
- Undo可能な操作は取り消し導線を用意。
- ローディング中は連打・二重送信を防止。
- エラーは原因を短く伝え、再試行・修復方法を用意。
- ドラッグ＆ドロップにはキーボード・タッチ操作の代替を用意。
- 画面内編集は編集モードと閲覧モードを分離。通常時に編集用ボタンを大量表示しない。

## 7. アクセシビリティ

- WCAG 2.2 AAを目標とする。通常テキストは4.5:1、大きい文字・重要な非文字UIは3:1以上を目安に検証。
- キーボードだけで主要操作を完了できること。Tab順序とフォーカス表示を確認。
- hoverだけで情報を伝えない。タッチでも利用できる。
- モーションを減らすOS設定を尊重。自動再生の音声は禁止。
- アイコンのみの操作に`aria-label`等の名称を与える。状態変化は必要に応じ支援技術に通知。

## 8. 画面ごとの特則

- カレンダー：月表示は曜日見出し＋7列。セルには「1」「2」等の日だけを表示し、年月はヘッダーに表示。日付文字列の不自然な折り返し禁止。
- ファイル管理：一覧・フォルダ・検索・操作ツールバー・詳細ペイン等を用途に応じて構成。小型モーダルに全機能を詰めない。
- クイックアクション：主要操作をすぐ実行できる。ピン留め管理はカスタマイズモードへ分離。
- ダッシュボード：通常閲覧時は編集UIを隠す。配置・サイズ変更は編集モードだけ。
- フォーム：必須・任意、入力エラー、保存状態が分かる。
- モバイル：指で操作しやすく、複数列は必要に応じ1列へ再構成する。

## 9. AI実装ルールと受け入れ条件

1. 着手前に画面の目的・主要操作・情報の階層を3〜6行で整理する。
2. 新規UIは本ファイルのトークンとコンポーネント規格を利用する。例外は理由を記録する。
3. 既存UIに適用する際は、既存デザインとの衝突を検証し、依頼されていない全面変更をしない。
4. 画面を最低でも375px・768px・1440px幅で確認する。
5. 通常・hover・focus・disabled・loading・empty・error・modal openを確認する。
6. 日付・長いタイトル・日本語と英数字の混在・データ0件・大量件数を試す。
7. `prefers-reduced-motion`有効時も意味が通じることを確認する。
8. 実ブラウザでスクリーンショットを比較し、文字の折り返し、はみ出し、余白、クリック領域を確認する。
9. コンソールエラー、キーボード操作、主要機能の回帰テストを確認する。
10. 完了報告では変更箇所、使ったトークン、検証幅、既知の制限を記載する。

## 10. さらに高い再現性が必要な場合

本MDは**仕様書**。実装者の解釈差を最小化するには、次を同じリポジトリ／パッケージで配布する。

- `tokens.css`：このMDの変数をそのまま実装したファイル
- `components/`：Button, Tabs, Dialog, Input, Card, Toast, Navigationの共通実装
- `motion.css`：登場・退場・hover・focusのアニメーション実装
- `icons/`：採用するアイコンライブラリとバージョンを固定
- `examples/`：各状態・画面幅の参照スクリーンショット
- `visual-tests/`：同じブラウザ環境での画像比較テスト

**最終原則：見た目を揃えるために機能を犠牲にしない。機能を増やすために見た目を崩さない。**
