# Webアーキテクチャ

## 採用構成

- Frontend / BFF: Next.js App Router、TypeScript、React
- Styling: Tailwind CSSを利用可能にし、初期画面はグローバルCSSで構成
- Backend: Firebase Authentication、Cloud Firestore、Cloud Storage、Cloud Functions
- Validation: Zod
- Hosting: Firebase App Hosting、Vercel等を比較して決定

Next.jsは公開ページのSEOと表示速度、予約・管理画面の対話性、サーバー側の安全な処理をひとつのプロジェクトで扱いやすい。

## 全体像

```text
お客様ブラウザ ─┐
                 ├─ Next.js Web ── Firebase Auth
店主ブラウザ ───┘       │          Firestore
                         │          Storage
                         └─ Trusted server / Cloud Functions
                              └─ 予約確定・通知・権限処理

Flutterアプリ ──────────────────── 同じFirebase（段階的に統合）
```

## URL設計

```text
/
├── menu
├── access
├── booking
│   ├── menu
│   ├── datetime
│   ├── details
│   └── complete
└── admin
    ├── login
    ├── reservations
    ├── menus
    ├── availability
    └── settings
```

初期段階では `/booking` と `/admin` の入口だけを作成している。実装時に段階的に子ルートを追加する。

## コード境界

- `src/app`: URL、ページ、レイアウト、Route Handler
- `src/features`: 予約、メニュー、管理など機能単位の型・検証・UI・ユースケース
- `src/components`: 複数機能で共有するUI
- `src/lib/firebase/client.ts`: ブラウザ専用Firebase SDK
- `src/lib/firebase/admin.ts`: サーバー専用Firebase Admin SDK

Client SDKとAdmin SDKは `client-only` / `server-only` で境界を固定し、秘密鍵がブラウザのコードに混入する事故を防ぐ。

## 認証・認可

### お客様

MVPは匿名認証を推奨する。予約完了後にメールリンク等で本人確認を追加できる。顧客が自分の予約を閲覧・変更する機能を提供する場合は、予約IDだけでなく認証済みUIDとの一致を必須にする。

### 店主

1. Firebase Authでログインする。
2. ID Tokenをサーバー側セッションCookieへ交換する。
3. サーバーでセッションを検証する。
4. `adminUsers/{uid}` の `uid`、またはCustom Claimsを検証する。
5. Firestore Rulesでも同等の権限を検証する。

画面上のリダイレクトだけを権限保護には使用しない。

## 予約確定

空き枠の表示後に別のお客様が予約する可能性があるため、確定処理は次の順序で行う。

1. ブラウザからメニュー、開始時刻、連絡先をサーバーへ送る。
2. Zodで入力を検証する。
3. サーバー側でメニューの公開状態、所要時間、営業時間、休業日を再取得する。
4. Firestore Transactionで重複する予約・予約不可時間を確認する。
5. 重複がなければ予約を作成する。
6. トランザクション成功後に確認メールを送信する。

通知失敗で予約自体を失わないよう、予約保存と通知処理は分離し、通知再試行状態を保持する。

## 既存アプリとの関係

- 現行 `salon_vishu` は `users/{uid}/reservations` と `collectionGroup('reservations')` を利用している。
- 現在の `vishu-renewal` Flutter管理機能はローカルのMock Repository中心で、Firebase統合前である。
- Webは管理画面で扱いやすいトップレベル `reservations` をv2案とする。
- 本番移行前に読み取り互換レイヤーまたは移行スクリプトを設計し、二つの保存形式へ同時書き込みしない。

## 環境

Flutterアプリと同じ2環境を使用する。

- dev: `salon-vishu2-dev-30830`
- prod: `salon-vishu`

Web固有のFirebase API KeyとApp IDは `.env.dev.local` / `.env.prod.local` またはCI・ホスティング環境の変数から注入する。`scripts/with-environment.mjs` がプロジェクトID等の対応を検証し、ビルド成果物は `.next/dev/production` / `.next/prod/production` に分離する。

サービスアカウントJSONはリポジトリへ保存せず、ホスティング環境のSecretとして設定する。
