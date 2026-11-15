# Quickアクセスの選定方針

1000件の公式サイト・Webサービスへの直接リンクを収録します。資料リンク集、Awesomeリスト、GitHubリポジトリ、ソフトウェアの紹介リポジトリは掲載しません。GitHub本体はコード管理サービスとして従来の1件を残します。

ニュース、料理、旅行、学習、読書、音楽、買い物、仕事、防災、スポーツ、画像編集などの日常用途を先に配置します。追加分には制作・共同作業・サイト運営などのWebサービスも含みます。同じホストへの重複は除外します。

## データ

- `js/quick-links-seed.json`：従来の公式サイト候補。
- `js/quick-links-curated.json`：日常用途の公式サイトを追加選定した候補。
- `js/quick-links-approved.json`：リンク確認後の1000件。通常の生成はこのファイルを使います。
- `js/quick-links-data.js`：アプリで使用する生成データ。全項目が「サイト」です。

公開のサービス一覧は候補の確認にのみ使用しました。アプリのリンク先は各サービスの公式サイトであり、一覧ページではありません。説明文は転載せず、名称・URLという事実情報を独自の日本語カテゴリで再整理しています。

候補の参照元：

- [Design Resources for Developers](https://github.com/bradtraversy/design-resources-for-developers)：デザイン・素材・編集サービスの公式URL。Brad Traversyほか、MIT License。
- [free-for-dev](https://github.com/ripienaar/free-for-dev)：共同作業・サイト運営等のサービスの公式URL。

以前収録していたAwesomeリストとAwesome-Selfhostedのリンクは削除しました。旧データを再生成に利用しません。

## 更新・検証

通常の再生成：`node scripts/build-quick-links.mjs`

候補の再取得・リンク確認：`node scripts/build-quick-links.mjs --verify`

候補の取得済みスナップショットは `test-artifacts/` にあれば利用し、なければ公開ソースを取得します。HEADリクエストと必要に応じたGETで応答と転送先を確認し、404・接続失敗・GitHubリポジトリへの転送・ドメイン販売への転送などを除外します。401・403・429はログインや自動アクセス制限の可能性があるため、接続先が存在する候補として扱います。全サイトの機能や利用料金の確認を意味しません。

確認結果は `test-artifacts/quick-link-checks.json`。リンク先の将来の提供状況は変わるため、カタログは定期的な見直しが必要です。アプリは起動時に外部のリストやトラッキング画像を取得しません。
