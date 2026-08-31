# Firebase scaffold

WebとFlutterで共有するFirebase設定の初期雛形です。現時点のRulesは安全のため、公開中メニューと店舗情報の読み取り以外を拒否します。

## Before use

1. Firebase Consoleで対象プロジェクトとWebアプリを確認する。
2. `.firebaserc.example` を `.firebaserc` にコピーする。
3. Emulator SuiteでRulesテストを作成する。
4. 店主認証とサーバー側予約確定を実装する。
5. テスト合格後に必要な権限だけをRulesへ追加する。

## Admin API Function

管理画面のHTTPS APIは `asia-northeast2` の `adminApi` Functionとして配置します。

```bash
cd firebase
npm --prefix functions install
npm --prefix functions run typecheck
firebase deploy --only functions:adminApi --project salon-vishu2-dev-30830
```

ローカルのFunctions Emulatorなど別URLを利用する場合は、Web側の
`NEXT_PUBLIC_FIREBASE_ADMIN_API_URL` に `adminApi` のベースURLを設定します。

既存プロジェクトへ `firebase deploy` する前に、現在のRulesとIndexesを必ず取得して差分を確認してください。このディレクトリからのデプロイは今回行っていません。

## 管理者メール配信

管理画面のメール配信は Resend を利用します。Resend で送信ドメインを認証した後、Functions の Secret と送信元を設定してください。

```bash
firebase functions:secrets:set RESEND_API_KEY --project salon-vishu2-dev-30830
```

送信元とReply-ToはFunctions Paramsとして設定します。未設定時は次の既定値を使用します。

```text
NOTIFICATION_EMAIL_FROM=Salon Vishu <notifications@notify.app-man.jp>
NOTIFICATION_EMAIL_REPLY_TO=y.itsukage@app-man.jp
```

本番環境では `--project salon-vishu` に置き換え、同様に設定します。全体配信も宛先ごとの個別メールとして送信されるため、受信者同士にメールアドレスは公開されません。

本番ではリポジトリルートから、`adminApi` だけを限定デプロイします。

```bash
npm run deploy:firebase-admin-api:prod
```
