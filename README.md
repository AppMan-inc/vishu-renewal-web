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
cp .env.example .env.local
npm install
npm run dev
```

開発用Firebaseプロジェクト `salon-vishu2-dev-30830` にWebアプリを登録し、`.env.local` の空欄をFirebase Consoleの値で埋めます。Admin SDKの秘密鍵はサーバー環境だけに設定してください。

## Checks

```bash
npm run lint
npm run build
```

## Documents

- [Webサービス構想](docs/web_product_concept.md)
- [Webアーキテクチャ](docs/web_architecture.md)
- [Firebaseデータモデル](docs/firebase_data_model.md)
- [実装ロードマップ](docs/web_implementation_roadmap.md)

## Security notes

- `NEXT_PUBLIC_` 付きの値はブラウザに公開されます。Admin SDKの秘密鍵には付けません。
- 管理ページのリンクを隠すだけでは保護になりません。セッション、サーバー処理、Firestore Rulesで権限を確認します。
- 予約確定時の空き枠確認と書き込みは、Cloud Functions等のトランザクション内で再確認します。
