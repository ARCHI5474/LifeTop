# LifeTop v10 Connected Canvas 実装計画・調査

既存構成: index.html と ES Modules、css/style.css から33分割CSSを読み込む静的サイト。npmビルドなし。既存テーマ・ホーム・GameBoxを維持する。
Studio: mini-model/office/media/tools/common と mini-apps.js、14アプリ。lifetop-mini-apps IndexedDB projects(appキー)に直近作業、lifetop-mini version:1 JSON。素材ファイルは保持しない。
既存設定: lifetop_v1_0_data localStorage、Quickタスク・メモ・アクセスを含む。Google認証Firestore users/{uid}/lifetop/stateに900KB以下で同期、revision競合検出。匿名チャット用アクセスは現在すべて拒否。
レスポンシブ: 30-responsive-polish.cssほか。テスト: node --test tests/*.test.mjs と Playwright CJS。Firebase emulatorテストは別途依存と実行環境が必要。

順序:
1. 新規DBを分離し、旧設定のバックアップ・移行を冪等に実行。transaction完了で保存成功を判定、revisionで他タブ上書きを防止。
2. 既存Quickタスクを共有、Workspace/Calendarを追加。既存同期はそのまま、新DBは既定でローカルのみ。
3. Studio既存形式を保ち、Workspaceへ複数スナップショット保存と再開。
4. Ctrl+K検索、Quick Actions、既存ホームに追加カード、ローカル限定Flow。
5. Messagesは有料設定を変更せず、サーバー要件を文書化。安全性を満たさない仮チャットは提供しない。
6. 自動テスト・静的検証。実行できないブラウザ・クラウド検証は完了扱いにしない。

## 実装後の更新

サーバー要件の文書化に加えてMessagesのクライアント・Callable処理・Rules・期限削除処理のソースも実装した。既定では無効とし、有料プランや本番サービスは変更していない。

ユーザーのUI方針修正に合わせ、Quick重複表示を解消し、新機能内部は専用のサイドバー・一覧・セグメント・行メニュー・編集パネルに再構成した。独立したFestivalモジュールも追加。詳細と未完了事項はCONNECTED_CANVAS_RELEASE.mdを参照する。
