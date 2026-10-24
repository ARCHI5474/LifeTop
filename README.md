# LifeTop
いつものネットをここから。

LifeTopは、ブックマーク機能や天気機能、タイマー/ストップウォッチ機能などを一つにまとめた
PasideaSpaceのWebサービスです。
ブラウザのスタートページにすると便利です。

[LifeTopを開く](https://lifetop.pasidea.space/)

Development: Built with AI-assisted coding

## できること

- ブックマーク、リンク集機能「Quickアクセス」
- タスク管理機能「Quickタスク」
- 簡易メモ機能「Quickメモ」
- タイマー / ストップウォッチ機能「Quickクロック」
- テーマカラーや時計フォント、ユーザー名を設定、カスタマイズ可能「Quickパネル」

## コンセプト
「いつものネットを、ここから」

LifeTopは「多機能であること」ではなく、
日常で必要な機能へすぐアクセスできることを重視しています。

機能を増やしすぎず、
シンプルで使いやすいサービスを目指しています。
また、触感を感じるようなアニメーションやデザインを取り入れ、心地よい体験の提供を目指しています。


## デザイン思想

LifeTopの操作感と視覚表現をもとにした設計思想「[PasideaDesign](PASIDEA_DESIGN.md)」。
日常の操作にやわらかな手応えを与えるための原則と、アニメーションの基準をまとめています。

## 開発時の動作確認

既存テスト: `node --test tests/*.test.mjs`

ブラウザテスト: Playwrightを利用できる環境で `node tests/browser-smoke.cjs`。
必要に応じて `BROWSER_PATH` にChrome等の実行ファイル、`PLAYWRIGHT_MODULE_PATH` にPlaywrightの `index.js` の絶対パスを指定できます。
外部通信を無効にし、起動、タスクの追加・削除・復元、メモの保存、タイマー、設定、モバイル幅のタブ操作を確認します。
ライトモードは完了チェックの視認性、起動前の配色復元、連続切り替え、背景画像の読み込み失敗時も確認します。

## 更新履歴
現在：3.9<br>
2026/9/21リリース│　3.9<br>
2026/9/15リリース│　3.8<br>
2026/9/2リリース│　3.7<br>
2026/9/2リリース│　3.6<br>
2026/8/29リリース│　3.5<br>
2026/8/20リリース│　3.2<br>
2026/8/16リリース│　3.1<br>
[2026/8/12リリース│　3.0](https://pasidea-s.blogspot.com/2026/08/lifetop30-2026812.html)<br>
[2026/8/6リリース│　2.0](https://pasidea-s.blogspot.com/2026/08/lifetop2.html)<br>


## PasideaSpace

LifeTop is a service by PasideaSpace.

© PasideaSpace
