# LifeTop v10.0 実装・検証報告

## 実装した内容

- Workspace: プロジェクト作成・編集・ゴミ箱／復元、説明・進捗、フォルダ階層、ファイル一覧、絞り込み・ソート、名前変更・移動・複製、お気に入り、最近のファイル、関連タスク、Studio再開。
- Quickタスク: 旧IDと既存操作を保持。説明・状態・優先度・期限・プロジェクト・ファイル・日時を追加。リスト／カンバン／期限カレンダーは元のQuickライフ内で切り替える。Quickメモ・Quickアクセス・時計・天気の複製カードは表示しない。
- Calendar: 月・週・日・一覧、終日、日／週／月の繰り返し、終了日、場所・カテゴリ・説明・プロジェクト、タスクの期限。アプリを開いている間の1日前／1時間前／10分前通知、任意の通知音とブラウザ通知。
- Studio: 14アプリの既存処理とlifetop-mini version:1を維持。複数ファイルのWorkspace保存、保存済みWorkspaceファイルの自動更新、ユーザー保存テンプレート、最大30段階の状態Undo/Redo、Ctrl/Cmd+S、直前の自動保存からの復元。入力欄のCtrl+Zはブラウザの編集履歴を優先する。
- Smart Search: Ctrl/Cmd+K、カテゴリ別の絞り込み、タスク・メモ・フォルダ内を含むQuickアクセス・予定・Workspace・Workspace保存済みStudioファイル・機能の検索と移動。
- Quick Actions: 操作一覧とチェックボックスによるピン留め。Smart Flow: タスク追加／メモ追記のローカル操作ブロック、追加・編集・並べ替え・削除、確認付き実行、サンプル、実行履歴とエラー。
- Smart Dashboard: 元のQuickカードを一つずつ維持。専用「ホームを編集」パネルから表示、標準／ワイド、ドラッグ／矢印による順序変更、自動保存、初期配置復元。追加の予定・プロジェクト・ファイル概要は同じホームに配置。ミニカレンダー・Actions・Flow・保存状態は任意表示。
- 保存: 新規IndexedDB、旧設定の移行前バックアップ、入力検証、JSON入出力、直前保存の復元、他タブのrevision競合検出。新データの同期対象をオフ／選択／すべてから選択し、確認とバックアップを伴う手動Google送受信を追加。既存の同期データは別ドキュメントで維持。
- Messages: 別Firebase Appの匿名認証クライアント、招待参加、ルーム一覧、リアルタイム投稿、自分の投稿削除、退出、管理者削除、招待再発行、通知のソースを追加。参加／退出／招待／削除／投稿はApp Check付きCallable経由。サーバーtransactionで20人上限、権限、投稿・作成上限を検証。現在は設定待ちで無効。

## UI設計方針と修正

DESIGN.mdの先頭にv10方針を追加。既存画面は維持し、新機能内部は用途別に設計する。

Workspaceはサイドバー、フォルダツリー、パンくず、表示セグメント、検索／ソート、テーブル、各行メニューへ再構成した。新規作成のみ主操作として強調し、補助操作は静かなボタン、編集はアイコン／メニューを使用する。スマホでは機能・プロジェクト選択欄へ切り替える。モーダルの中央配置と狭い画面のはみ出しも確認した。

ホームには大量の操作ボタンを並べず、Quick系を元の表示場所へ統合。Dashboardの設定操作は編集パネルに集約した。既存配色・フォント・GameBox・既存メニューは維持している。

## v10 Festival

専用festival.htmlに、JST基準で1日1回の無料ガチャ（全10種・重複と履歴・コンプリート表示）、performance.nowによる10秒チャレンジ、3つの隠しバッジ、初回参加時発行チケット、任意ニックネーム、PNG保存、残り時間を実装。記念品JSONの保存・追加復元にも対応する。

開催中だけホーム末尾に小さな入口を表示し、最初の1回は10秒以内に消える無音の案内と軽量紙吹雪を表示する。prefers-reduced-motionと既存の動きを減らす設定に対応する。隠し要素は独立した小さな操作で、既存ボタンの動作を変更しない。

終了時にはガチャ・ゲーム参加・隠し要素・通常入口を停止し、記念品を削除しない。Quickパネルの情報欄にある「v10 Festival Memories」からチケット・コレクション・バッジ・ベスト記録を継続閲覧・保存できる。

### 開催日時の設定方法

js/festival-config.js の releaseAt は現在 null。正式公開日時が確定したら、タイムゾーンを含むISO 8601文字列へ変更する。形式は YYYY-MM-DDTHH:mm:ss+09:00。durationDaysは10のままにする。未設定時はイベントを開始せず、入口・初回演出・隠し要素も表示しない。開催期間は開始時刻を含み、開始から正確に240時間後を含まない。

日付や開催を確認するテストでは専用のfixtureを使っており、実際の設定ファイルには仮の公開日時を入れていない。

### Festivalの制限

端末内の保存と端末時計を使用する。本人確認・参加者数の証明・端末をまたぐ不正防止を目的としない。ブラウザデータ削除で失われるため、チケットPNGと記念品JSONの保存を案内する。ガチャの同時実行はIndexedDBの単一transactionで日付判定と保存を行う。サーバー、Firebase、課金、広告、外部画像素材への新しい依存は追加していない。

## Firebase側で必要な作業（未実行）

既存Googleログイン設定は変更していない。新しいCanvas同期には、追加したFirestore Rulesの反映が必要。既存users/{uid}/lifetop/stateと新users/{uid}/canvas/stateはGoogle認証本人のみアクセス可能。同期は900KB上限で、競合時に勝手に上書きしない。

Messagesを有効にする前に、テスト用プロジェクトで以下を完了する。

1. functions/package.json の依存をインストールし、lockfileを確定してランタイム結合テストを行う。
2. Firebase匿名認証とApp Checkを設定する。既存Google認証とは別のlifetop-messagesインスタンスを利用する。
3. Emulatorで既存RulesとMessages Rulesの両テストを実行する。クライアントによる直接書き込み、非参加者閲覧、期限切れ閲覧は禁止する。
4. 料金プランと運用予算を確認してから、firebase.messages.jsonを使うFunctions／Scheduler／Rulesをデプロイする。この作業では課金設定もデプロイも行っていない。Functionsの公開にはBlazeプランが必要：[Firebase公式手順](https://firebase.google.com/docs/functions/get-started?gen=2nd)。
5. messagesのexpiresAtにTTLを設定し、cleanupMessagesの定期実行を確認する。TTLの物理削除は即時ではないため、Rulesとクライアントでも期限切れ表示を制限する：[公式TTL仕様](https://firebase.google.com/docs/firestore/ttl)。日次処理には上限があるため削除バックログも監視する。
6. js/messages-config.jsのApp Checkサイトキーを設定し、実際の招待／人数上限／通知／退出／削除を確認した後、enabledをtrueにする。FunctionsのApp Check検証はサーバー側で強制する：[公式App Check手順](https://firebase.google.com/docs/app-check/cloud-functions)。

匿名IDの保存情報が失われると以前の管理権限を取り戻せない。招待リンクはURLフラグメントで受け取り、表示後すぐ履歴から除去する。招待トークンはサーバーで32バイト乱数を生成し、保存時はハッシュ化する。日次上限・App Check・最大インスタンス数は濫用を軽減するが、実運用の予算監視の代わりにはならない。

## 検証結果

- node --test tests/*.test.mjs: 34テスト成功。
- Chrome: 既存ホームの起動／Quickタスク／メモ／タイマー／設定、Studio全14アプリと画像・PDF・音声・動画の入出力、Canvasのプロジェクト・フォルダ・タスク・予定・検索・Flow・保存・競合・複数Studioファイル・テンプレート・Undo/Redoのテスト成功。
- Chrome／Edge: Workspaceのサイドバー／一覧／絞り込み／行メニュー／複製、Quickの重複なし、既存Quick内での表示切替、Dashboardの表示／幅／順序の保存、PC／390px幅のナビゲーション・はみ出し確認に成功。
- Chrome／Edge: Festivalの未設定／開催前／開催中／終了後、JST日付変更、ガチャ同時実行、チケット保持とPNG形式、10.00秒表示、3バッジ、初回演出の一度限り、動きを減らす設定、オフライン操作、390px幅のテスト成功。
- Messagesはサーバーサービスのロジックテストで同時参加20人上限・権限・招待無効化・送信間隔／長さ・自分の削除・90日有効期限・作成上限を検証。実Firestoreによる結合テストではない。
- git diff --check: 成功。生成スクリーンショットはtest-artifactsに保存し、WorkspaceとFestivalのPC／スマホ表示、Dashboard編集パネルを目視確認した。

Firefoxはこの環境にないため未確認。Firebase EmulatorはJavaとFirebase CLIがないため未実行。実Google同期、実Messages接続、OS通知、実端末のスリープ後動作は未確認。テスト成功を本番接続成功として扱っていない。

## 未完了・今後の改善

- Messagesの本番設定・Functions依存インストール／lockfile・Emulator結合試験・課金承認・デプロイが残る。画面には未有効であることを表示する。
- Canvas同期は選択対象の手動送受信。バックグラウンド自動同期とレコード単位のマージは未対応。取得時の選択単位はWorkspace／Calendar／Flow／Dashboard。
- Studioは保存可能な状態のUndo/Redo。素材ファイルそのものの復元は対応せず、画像／音声／動画等では再選択が必要。既存のアプリ別直近保存と、Workspaceに明示保存した複数ファイルは併存する。
- Dashboardのサイズは標準／ワイド。ヒーロー時計と天気の自由移動は未対応。タスク・メモ・時計は既存Quickライフのタブを共有する。
- 予定通知はページ実行中の近い時間帯を検査する方式で、終了中・スリープ中・長時間バックグラウンドの通知配信は保証しない。
- オフライン初回起動／再読み込みは既存静的サイトと同様に保証しない。読み込み済み画面の端末内作業は継続できる。
- 公開日時は未確定のためFestivalは未開催。本番公開、Firebase設定、課金設定の変更は行っていない。

## 変更ファイル

既存変更: DESIGN.md、index.html、mini-apps.html、css/style.css、js/config.js、js/main.js、js/todo.js、js/firebase-adapter.js、js/mini-apps.js、firestore.rules、tests/browser-smoke.cjs。

Canvas追加: js/canvas-model.js、js/canvas-sync.js、js/canvas-ui.js、js/connected-canvas.js、css/34-connected-canvas.css、CONNECTED_CANVAS_PLAN.md、本書。

Festival追加: festival.html、css/festival.css、js/festival-config.js、js/festival-model.js、js/festival-entry.js、js/festival.js。

Messages追加: messages.html、js/messages-config.js、js/messages.js、functions/package.json、functions/messages-service.js、functions/index.js、firebase.messages.json。

テスト追加: tests/canvas-model.test.mjs、tests/canvas-sync.test.mjs、tests/canvas-browser.cjs、tests/canvas-ui-browser.cjs、tests/festival-model.test.mjs、tests/festival-browser.cjs、tests/messages-service.test.mjs、tests/firebase/messages.rules.test.mjs。
