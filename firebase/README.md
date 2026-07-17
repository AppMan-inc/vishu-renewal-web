# Firebase scaffold

WebとFlutterで共有するFirebase設定の初期雛形です。現時点のRulesは安全のため、公開中メニューと店舗情報の読み取り以外を拒否します。

## Before use

1. Firebase Consoleで対象プロジェクトとWebアプリを確認する。
2. `.firebaserc.example` を `.firebaserc` にコピーする。
3. Emulator SuiteでRulesテストを作成する。
4. 店主認証とサーバー側予約確定を実装する。
5. テスト合格後に必要な権限だけをRulesへ追加する。

既存プロジェクトへ `firebase deploy` する前に、現在のRulesとIndexesを必ず取得して差分を確認してください。このディレクトリからのデプロイは今回行っていません。
