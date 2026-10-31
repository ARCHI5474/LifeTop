# Googleアカウント同期の設定

コードは実装済みですが、Firebaseプロジェクトはまだ作成していません。
`js/firebase-config.js` の `enabled: false` が初期値です。この状態ではFirebase SDKを読み込まず、これまで通り端末内に保存します。

## 1. Firebaseプロジェクトを作成

1. [Firebase Console](https://console.firebase.google.com/)でプロジェクトを新規作成します。
2. プロジェクトの設定からWebアプリを登録します。Firebase Hostingの利用は必須ではなく、既存の静的サイト公開先をそのまま使えます。
3. 表示される `firebaseConfig` の `apiKey`、`authDomain`、`projectId`、`appId` を控えます。

このWeb用の設定値はブラウザに配信するものです。サービスアカウントの秘密鍵や管理者用認証情報は使いません。本人以外のアクセスを防ぐのは、後述のFirestoreルールです。

## 2. Googleログインを有効化

1. Authentication → Sign-in method で **Google** を有効にします。
2. プロジェクトのサポート用メールアドレスを設定します。
3. Authentication → Settings → Authorized domains に、LifeTopを公開するドメインを追加します。
4. ローカル開発で使う場合は `localhost` も必要に応じて追加します。

サイトはHTTPS、ローカル開発は `http://localhost` で開きます。HTMLファイルを直接 `file://` で開く運用は対象外です。Googleログインはボタンを押したときのポップアップを使用するため、ブラウザでポップアップがブロックされた場合は許可して再試行してください。

参考：[Googleログインの公式手順](https://firebase.google.com/docs/auth/web/google-signin)。

## 3. Firestoreを作成し、本人専用のルールを公開

1. Firestore Databaseで **Standard edition / Native mode** のデータベースを作成します。
2. 利用場所に合ったロケーションを選び、**本番モード**で作成します。
3. Rules画面を開き、このリポジトリの `firestore.rules` 全文を貼り付けて公開します。
4. Indexes → Single field からコレクショングループ `lifetop` のフィールド `payload` にインデックス除外を設定します。検索用ではないJSONデータのためです。

Firebase CLIを使う場合、リポジトリのルートで次のコマンドによりルールとインデックス設定をまとめて反映できます。

```powershell
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
```

`YOUR_PROJECT_ID` は実際のプロジェクトIDに置き換えます。既存のFirebaseプロジェクトに独自のルールがある場合は、このファイルをそのまま上書きせず、対象パスのルールを既存ルールへ統合してください。

データの保存先は `users/{FirebaseのUID}/lifetop/state` です。Googleで認証された本人だけがそのパスを読み書きでき、未ログイン・他人のUID・別のパスへのアクセスは拒否します。更新にはリビジョンの増分とサーバー時刻を要求し、クライアントからの削除は許可しません。

参考：[AuthenticationとSecurity Rules](https://firebase.google.com/docs/rules/rules-and-auth)、[Firestoreトランザクション](https://firebase.google.com/docs/firestore/manage-data/transactions)。

## 4. アプリ側で有効化して公開

`js/firebase-config.js` を編集します。

```javascript
export const cloudSyncConfig = {
    enabled: true,
    firebase: {
        apiKey: 'Firebase Consoleの値',
        authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
        projectId: 'YOUR_PROJECT_ID',
        appId: 'Firebase Consoleの値'
    }
};
```

先にルールを公開し、その後 `enabled: true` にしてサイトを再公開してください。設定ファイルがCDNにキャッシュされている場合は、公開先でキャッシュを更新するか、`js/cloud-sync.js` 内の `firebase-config.js?v=8.0` の識別子を更新します。

「設定 → プロフィール → Googleアカウント同期」にログインボタンが表示されます。初回は自動で端末の内容をアップロードせず、保存に使うデータを選びます。別のGoogleアカウントへ切り替えた場合も選択が必要です。

アプリはFirebase公式CDNのSDK 13.1.0を必要時だけ読み込みます。[公式CDNのセットアップ方法](https://firebase.google.com/docs/web/alt-setup)に基づく構成です。

## 同期の動作と範囲

- 対象：設定、プロフィール、ブックマーク、タスク、書式付きメモ。
- 対象外：天気・ニュースなどのキャッシュ、位置情報、ゲームの記録、旧機能の健康・予定データ、ログイン情報そのもの。
- 端末への保存が成功した変更を約1.5秒まとめてから同期します。
- オフライン中も端末内への保存は続きます。再接続時と次の起動時に、前回の同期内容と比較して再試行します。
- 別端末の内容だけが変わった場合は反映し、編集中は入力が終わるまで待ちます。
- 双方で変更された場合は自動上書きしません。競合状態を表示し、「この端末のデータを残す」「クラウドのデータを使う」を選べます。項目ごとの自動マージは行いません。
- クラウド内容を受け取る前に、直前の端末内容を復旧用に1世代保存します。保存に失敗した場合は置き換えません。同期欄のボタンからJSONバックアップとしてダウンロードできます。
- ログアウト後も端末のデータは残ります。共有端末での利用には注意してください。
- 1回の同期データ上限は **UTF-8で900KB** です。大きな画像を含むと同期できない場合があります。その場合も端末保存や既存のJSONバックアップは利用できます。

Firestoreのドキュメント上限は1MiBです。管理情報やフィールド名の余裕を含め、アプリの上限を900KBにしています。[公式の上限一覧](https://firebase.google.com/docs/firestore/quotas)を参照してください。利用料金や無料枠はFirebase Consoleで確認してください。

## 有効化後の確認

1. 先に「詳細 → バックアップを保存」で現在のデータを退避します。
2. 端末AでGoogleログインし、「この端末のデータで同期を開始」を実行します。
3. 端末Bで同じGoogleアカウントにログインし、「クラウドのデータを使う」を実行します。
4. Aでタスク・メモ・設定を変更し、Bへ反映されることを確認します。
5. Aをオフラインにして変更後、オンラインへ戻して同期されることを確認します。
6. オフライン中のAとオンラインのBでそれぞれ変更し、再接続時に競合が表示されることを確認します。
7. 別のGoogleアカウントでは、他人のクラウドデータが表示されないことを確認します。
8. ログアウト後も端末保存を使えること、復旧用JSONをバックアップ画面から戻せることを確認します。

## テスト

外部接続不要の検証：

```powershell
node --test tests/*.test.mjs
```

同期エンジンの検証には、初回の選択、オフライン復帰、競合、入力中の反映待ち、容量不足、アカウント切り替え、ログアウト中の通信、異常なクラウドデータを含みます。

Firestoreルールの実行テストは `tests/firebase/rules.test.mjs` にあります。Node.jsと、使用するFirebase CLIが要求するJavaを用意し、次をルートから実行します。

```powershell
npm install --prefix tests/firebase --no-save @firebase/rules-unit-testing firebase@13.1.0
npx firebase-tools emulators:exec --only firestore --project demo-lifetop "node tests/firebase/rules.test.mjs"
```

`demo-` で始まるテスト用プロジェクトIDを使用し、本番へアクセスしないでください。[公式のルールテスト手順](https://firebase.google.com/docs/rules/unit-tests)に沿ったテストです。

この作業では実プロジェクトの作成・ルールのデプロイ・Googleログインの実機確認・エミュレーター実行はしていません。プロジェクト作成後に上記の確認を行ってください。
