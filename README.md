# Salon Vishu Web

Salon Vishuの公式ホームページ、オンライン予約、店主管理画面を提供するNext.jsアプリです。

Flutterアプリの `vishu-renewal` とは分離された、Web専用のGitリポジトリです。

## Repository structure

```text
vishu-renewal-web/
├── src/       # Next.jsアプリ
├── public/    # 静的ファイル
├── firebase/  # Firestore / Storage設定
└── docs/      # 構想・設計・ロードマップ
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | サロンの公式ホームページ |
| `/login` | お客様ログイン |
| `/booking` | お客様向け予約フロー |
| `/admin/login` | 店主ログイン |
| `/admin` | 予約・メニュー・営業時間管理 |

## Source structure

```text
src/
├── app/                  # App Routerのページとレイアウト
├── components/           # 複数機能から使うUI（実装時に追加）
├── features/             # 予約など機能単位のロジック
└── lib/firebase/         # Firebase Client / Admin SDK境界
```

ブラウザ用SDKは `src/lib/firebase/client.ts`、秘密情報を扱うサーバー用SDKは `src/lib/firebase/admin.ts` に分けています。

## Local development

```bash
npm install
npm run dev
```

`npm run dev` はdev環境を使用します。最初にFirebase ConsoleでdevプロジェクトのWebアプリを登録し、Webアプリ設定を環境ファイルへ入力してください。

```bash
cp .env.dev.example .env.dev.local
# .env.dev.local の NEXT_PUBLIC_FIREBASE_API_KEY と
# NEXT_PUBLIC_FIREBASE_APP_ID をFirebase Webアプリの値で埋める
npm run dev
```

### 環境別の起動・ビルド

Flutterアプリの `vishu-renewal-app` と同じdev/prod区分を使用します。

| 環境 | 環境ファイル | Firebase Project | ビルド出力 |
| --- | --- | --- | --- |
| dev | `.env.dev.local` | `salon-vishu2-dev-30830` | `.next/dev/production` |
| prod | `.env.prod.local` | `salon-vishu` | `.next/prod/production` |

```bash
# dev Firebaseで開発サーバーを起動
npm run dev:dev

# prod Firebaseで開発サーバーを起動（必要時のみ）
npm run dev:prod

# 環境別に最適化ビルド
npm run build:dev
npm run build:prod

# 対応するビルドを起動
npm run start:dev
npm run start:prod
```

`npm run build` と `npm run start` は環境の指定忘れを防ぐため、単独では実行できません。必ず環境付きのコマンドを使用してください。

環境ラッパーはアプリ側から確認したFirebase Project ID、Storage Bucket、Messaging Sender IDとの一致を検証します。dev用ファイルにprodの値が混ざった場合は、Next.jsを起動する前にエラーになります。開発サーバーのキャッシュは `.next/<environment>/development`、最適化ビルドは `.next/<environment>/production` に分離されます。`NEXT_PUBLIC_` の値はビルド時にブラウザ用バンドルへ固定されるため、環境ごとに必ず別々にビルドしてください。

API KeyとApp IDはプラットフォーム固有です。FlutterのAndroid/iOS用App IDを流用せず、各Firebaseプロジェクトに登録したWebアプリの値を使用してください。Admin SDKの秘密鍵はリポジトリへ保存せず、`.env.<environment>.local` またはホスティング環境のSecretとして設定します。

## Checks

```bash
npm run lint
npm run build:dev
npm run build:prod
```

## Documents

- [Webサービス構想](docs/web_product_concept.md)
- [Webデザインシステム](docs/design_system.md)
- [Webアーキテクチャ](docs/web_architecture.md)
- [Firebaseデータモデル](docs/firebase_data_model.md)
- [実装ロードマップ](docs/web_implementation_roadmap.md)

## Security notes

- `NEXT_PUBLIC_` 付きの値はブラウザに公開されます。Admin SDKの秘密鍵には付けません。
- 管理ページのリンクを隠すだけでは保護になりません。セッション、サーバー処理、Firestore Rulesで権限を確認します。
- 予約確定時の空き枠確認と書き込みは、Cloud Functions等のトランザクション内で再確認します。
- `/booking` はFirebase Authenticationのログイン状態を確認し、未ログインの場合は `/login` へ移動します。
