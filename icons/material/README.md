# Google公式Material Symbols

Google公式Material Symbols Outlinedを、Google Fonts公式APIのicon_names指定で使用する96種類に限定して取得しています。独自に描いたパスや代替記号は使用していません。

- 公式ガイド: https://developers.google.com/fonts/docs/material_symbols
- 公式リポジトリ: https://github.com/google/material-design-icons/tree/master/variablefont
- スタイル: Outlined / opsz=24 / wght=400 / FILL=0 / GRAD=0
- 配布形式: TrueType（material-symbols-outlined.ttf、約21KB）
- ライセンス: Apache 2.0（LICENSEを同梱）
- names.txt: 取得時に指定した公式アイコン名
- upstream.css: Google Fontsから返された原文。取得元URLと実際のフォント形式を記録
- codepoints.txt: 公式リポジトリのアイコン名・Unicode対応表
- glyphs.json: アプリで使用する公式コードポイントの一覧

font-faceで同梱フォントを使用するため、実行時のGoogle Fontsへの接続に依存せず、公式の形状をそのまま表示します。アイコンと画像の表示枠は幅・高さ・flex幅を一致させ、変形を防ぎます。

検証: node --test tests/material-icons.test.mjs
