# テスト

Node.js 22以降を使用します。テスト中はローカルファイルと固定データを使い、外部APIや本番データには接続しません。

```sh
npm ci
npx playwright install chromium
npm test
```

- `npm run test:unit`: ロジック、保存・復元、同期、構文、HTML参照、モジュールの整合性を検査。
- `npm run test:browser`: ホーム、設定、ファイル、カレンダー、Studio、GameBox、イベントの実操作を検査。
- `npm test`: 上記を順に実行。失敗があっても残りを実行し、失敗時は終了コード1を返します。

結果と失敗ログは `test-artifacts/results-all.json`（個別実行時は `results-unit.json` / `results-browser.json`）に保存します。スクリーンショットも同ディレクトリに保存し、Gitには含めません。

既存ブラウザを使う場合は `BROWSER_PATH` に実行ファイルを指定できます。共有のPlaywrightを使う環境では `PLAYWRIGHT_MODULE_PATH` にその `index.js` の絶対パスを指定できます。通常の `npm ci` では指定不要です。

`tests/helpers/browser.cjs` はブラウザ起動とタイムアウトを共通化します。`withApp` はローカル配信、外部通信の遮断、実行時エラーとローカルファイル404の検査も行います。

2026-11-07の回帰テストには、保存容量不足時の入力・取消保持、Studio保存失敗時の遷移抑止、複数タブ競合、遅延storage通知、破損キャッシュ、天気HTML挿入、Messagesの送信中編集と再送、整数境界ID、ダイアログ終了待機、Festival復帰を含みます。Messages/同期の接続テストは固定アダプターを使用します。

`offline-volume.cjs` は1000タスク・500ブックマーク・10万文字メモを扱います。オフライン中もテスト用ルートが静的ファイルを配信するため、PWAの実ネットワークからのオフライン起動を保証するテストではありません。単発の計測値は `test-artifacts/volume-measurements.json` に保存します。

最新の再調査内容と未検証事項は [QA_REAUDIT.md](QA_REAUDIT.md)、初回の詳細は [QA_REPORT.md](QA_REPORT.md) を参照してください。

操作改善の一覧と追加回帰テストは [USABILITY_REVIEW.md](USABILITY_REVIEW.md) を参照してください。

## Firestoreルール

`tests/firebase/` のルールテストはJavaとFirebase Emulatorが必要なため、通常のテストから分離しています。セットアップは [FIREBASE_SETUP.md](FIREBASE_SETUP.md) を参照してください。両方のルールテストを実行します。

```sh
npx firebase-tools emulators:exec --only firestore --project demo-lifetop "node --test tests/firebase/*.test.mjs"
```

`FIRESTORE_EMULATOR_HOST` がない場合、ルールテストは停止します。
