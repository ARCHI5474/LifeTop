# LifeTop v11.0.0 — リリース準備

この変更はリリース用のソース準備です。本番公開・Gitタグ作成は行っていません。

## 変更内容

- 時計：6種類のデザイン。数字の幅を固定し、秒・分・時の更新による周囲の移動を防止。背景を大きな面で覆わず、文字の縁・影・太さで視認性を補います。
- Studio：StoneTXT、BlockSheet、SlideSpark、LineNote、FutureDraw、ChangePosition、PaisdeaBrowser（β版）、PasideaCode（β版）の8アプリ。機能を短く説明し、ページ送りなしで一覧表示します。狭い画面は縦にスクロールできます。
- Material Symbols / Material Iconsは既存の公式フォントとアイコン実装を継続します。
- ライト／ダーク、透明感、全画面ポップアップの既存構成を維持し、最終の余白・文字・操作状態を調整します。

## デザイン参照

ユーザー提供の「Universal UI Design System — Specification v2.0」を参考にしました。既存の `--ui-font`、文字色、surface、primary、focus、12px以上の補足文字、レスポンシブの基準を使用しています。今回は全面改修せず、既存の透明感と、ユーザー指定の全画面ポップアップを優先しています。時計の縁・影は壁紙の視認性を保つための局所的な補助です。

## v10 Festivalとの区別

- LifeTop本体、読み込み画面、設定内の情報、更新案内、バックアップのアプリバージョンはv11です。
- Festivalはv10記念イベントのまま継続します。名称、チケット、収集記録、開催期間を変更しません。
- 開始は2026年11月7日14:11:54（日本時間）、期間は10日間。終了判定は既存のFestival設定に従います。

## データ互換性

- ローカル保存キー、バックアップのformat/version、Studio作業ファイル形式を維持します。
- 過去のバックアップに時計デザインがない場合はOrbitを補完します。
- 旧Studioアプリの作業ファイルを引き続き開けます。

## 確認コマンド

```powershell
npm run test:unit
$env:BROWSER_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
node tests/v11-release-browser.cjs
node tests/clock-studio-browser.cjs
node tests/popup-home-browser.cjs
node tests/light-mode-browser.cjs
node tests/browser-smoke.cjs
node tests/festival-launch-browser.cjs
node tests/unified-ui-browser.cjs
```

## 検証結果

上記の単体テストと7本のブラウザテストは通過済みです。320・375・390・768・844・1440px幅、低い横画面、ライト／ダーク、カスタム壁紙、時刻更新、保存・復元、Festival終了判定を確認しました。スクリーンショットは `test-artifacts/v11-*.png` にあります。

## 既存の制限

- PaisdeaBrowserはβ版です。埋め込みを許可しないサイトは別タブで開きます。
- ChangePositionの対応範囲は画像・UTF-8テキスト・CSV／JSONです。任意の拡張子への変換ではありません。
- PasideaCodeのプレビューは分離した領域で動作し、外部リソースの読み込みを制限します。
- Messages・Google同期の有効化には既存の外部設定が必要です。このリリース準備で外部設定は変更していません。
