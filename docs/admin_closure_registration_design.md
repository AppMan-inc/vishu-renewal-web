# Web管理画面 休業登録機能設計

作成日: 2026-08-24
対象: `vishu-renewal-web` 管理者画面
関連設計: `vishu-renewal-app/docs/admin_closure_registration_design.md`

## 1. 目的

現在の30分枠単位の「休憩登録」は維持し、サロンの営業を日単位・半日単位で止めるための「休業登録」を別機能として追加する。

- 1日単位で終日休業を登録できる
- 1日または期間に対して午前・午後単位で休業を登録できる
- 開始日と終了日を指定し、複数日をまとめて登録できる
- 営業中の短い休止時間は、従来どおり30分単位の休憩登録で管理できる
- Webとアプリで同じ休業データ、入力制約、競合判定を使用する
- 顧客向け予約可能枠へ即時反映する
- 既存の予約不可時間データを削除せず、後方互換性を保つ

## 2. 現状

- 管理画面の `/admin/rests` は、7日分の時間割から30分枠を選択する画面である。
- 30分単位の休憩登録は、営業中の短い予約不可時間を登録する機能として今後も必要である。
- Webの `adminApi` は `rest.create`、`rest.delete`、`rest.apply` を受け取り、`rests` コレクションを直接更新している。
- `rest.apply` はWeb側でもTransactionを使用するが、アプリ側の新しい休業登録APIとは処理が分かれている。
- `AdminRestBlock` は開始、終了、作成日時だけを読み込み、休業単位や一括登録のグループを保持していない。
- 顧客側の空き枠判定は `rests.startTime` と `rests.endTime` の重複を予約不可として扱っている。

## 3. 確定仕様

### 3.1 用語

「休憩」と「休業」を用途に応じて区別する。

| 用語 | 用途 |
| --- | --- |
| 休憩 | 営業日の中で30分単位に登録する短い予約不可時間 |
| 休業 | 終日・午前・午後単位で、1日または期間に登録する予約不可時間 |

既存の休憩登録URL `/admin/rests` は維持し、休業登録URL `/admin/closures` を追加する。Firestoreコレクションはどちらも `rests` を利用し、`closurePeriod` の有無で表示を区別する。

### 3.2 休業単位

| 選択肢 | 保存する時間区間 |
| --- | --- |
| 終日 | 開店時刻以上、閉店時刻以下 |
| 午前 | 開店時刻以上、12:00以下 |
| 午後 | 12:00以上、閉店時刻以下 |

- 判定タイムゾーンは常に `Asia/Tokyo` とする。
- 12:00を午前と午後の境界とする。
- 12:00が予約枠境界に一致しない営業時間設定では登録を拒否する。
- 開店時刻が12:00以降の場合は午前を選択不可にする。
- 閉店時刻が12:00以前の場合は午後を選択不可にする。
- Webクライアントが送信するのは日付範囲と休業単位だけとし、正式な開始・終了時刻はCloud Functionsで生成する。

### 3.3 日付指定

画面には次の2モードを設ける。

1. `1日`: 対象日を1日選択する
2. `期間`: 開始日と終了日を選択する。両端の日付を含む

共通ルール:

- 当日より前は選択できない。
- 当日は、休業区間の開始時刻を過ぎていなければ登録できる。
- 期間は最大90日とする。
- `settings/businessHours.closedWeekdays` に含まれる定休日は登録対象から除外する。
- 対象営業日が0日の場合は登録できない。
- ブラウザのタイムゾーンに依存しないよう、フォーム状態は `YYYY-MM-DD` の日付文字列として保持する。

### 3.4 予約・既存休業との競合

- キャンセル以外の予約と重なる休業は登録できない。
- 既存の休業と重なる場合も登録できない。
- 期間内に1件でも競合があれば、休業を1件も作成しない。
- 競合時は先頭5件の日付、時刻、顧客名を表示する。
- 既存予約の自動キャンセル、既存休業の暗黙の上書きは行わない。
- ブラウザ上のプレビューは案内用途とし、Cloud Functionsの判定を最終結果とする。

## 4. 画面設計

### 4.1 ナビゲーションと予約カレンダー

- 管理ナビゲーションには既存の `休憩` を残し、別項目として `休業` を追加する。
- 予約画面には `休憩登録` と `休業登録` の両方のリンクを表示する。
- 週カレンダーでは、従来データを `休憩`、休業メタデータを持つデータを `休業` と表示する。
- 月カレンダーでは `休憩 N件` と `休業 N件` を分けて表示する。
- `/admin/closures` のページタイトルとブラウザタイトルを `休業登録` とする。
- ダッシュボードには休憩と休業を別々の管理項目として表示する。

### 4.2 休業登録画面

既存の `/admin/rests` の時間割グリッドには手を加えず、新しい `/admin/closures` に入力フォームと登録済み一覧を追加する。

```text
休業登録

登録範囲
[ 1日 ] [ 期間 ]

対象日                    期間モードの場合
[ 2026/8/25 ]             [ 2026/8/25 ] 〜 [ 2026/8/31 ]

休業する時間
[ 終日 ] [ 午前 ] [ 午後 ]

登録内容
2026/8/25 〜 2026/8/31
午後（12:00〜18:00）
登録対象 6日・定休日除外 1日

[ 休業を登録 ]

登録済みの休業
2026/8/25 〜 2026/8/31　午後
6日分　12:00〜18:00
[ 詳細 ] [ この期間を削除 ]
```

操作フロー:

1. `1日` または `期間` を選択する。
2. 日付を選択する。
3. `終日`、`午前`、`午後`を選択する。
4. 対象日数、除外日数、休業時間を確認する。
5. `休業を登録`を押す。
6. 確認ダイアログで、期間と休業単位を再確認して確定する。
7. 成功後に入力を初期化し、登録済み一覧と予約カレンダーのデータを再取得する。

### 4.3 登録済み一覧

- 未来の休業を日付の昇順で表示する。
- 同じ `closureGroupId` の休業は1つの期間カードにまとめる。
- カードを展開すると、対象日ごとの時間区間を確認できる。
- グループ登録は `この日のみ削除` と `この期間すべて削除` を選択できる。
- `closurePeriod` がない既存データと `custom` は休憩データなので、休業一覧には表示しない。
- 削除前に対象日と削除件数を確認する。
- 過去の休業は初期表示から除外し、必要な場合のみ `過去の休業を表示` で確認する。

### 4.4 レスポンシブ表示

- デスクトップでは、入力フォームと登録済み一覧を2カラムで表示する。
- 画面幅が狭い場合は、入力フォーム、登録内容、登録済み一覧の順に1カラムで表示する。
- 日付入力、選択ボタン、登録ボタンは44px以上の操作領域を確保する。
- 期間カードの詳細は横スクロールさせず、日付ごとの縦一覧にする。

### 4.5 アクセシビリティ

- `1日`／`期間`、`終日`／`午前`／`午後`は選択状態を `aria-pressed` で伝える。
- 日付入力には視覚ラベルとプログラム上のラベルを付ける。
- 入力エラーは該当項目と関連付け、送信エラーは `role="alert"` で通知する。
- 登録成功は `role="status"` で通知する。
- 送信中は入力を無効化し、ボタン文言を `登録中…` に変更する。
- 確認ダイアログはキーボード操作とフォーカス復帰に対応する。

## 5. データ設計

保存先はアプリと共通の `rests/{documentId}` を継続利用する。

```text
rests/{documentId}
restId: string
startTime: Timestamp
endTime: Timestamp
createdAt: serverTimestamp
createdBy: string
closurePeriod: fullDay | morning | afternoon | custom
closureGroupId: string | null
businessDate: YYYY-MM-DD | null
schemaVersion: 2
```

Webの型を次のように拡張する。

```ts
type ClosurePeriod = "fullDay" | "morning" | "afternoon" | "custom";

type AdminRestBlock = {
  id: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  closurePeriod: ClosurePeriod;
  closureGroupId: string | null;
  businessDate: string | null;
};
```

旧データは読み込み時に `closurePeriod: "custom"`、`closureGroupId: null`、`businessDate: null` として扱い、休憩として表示する。既存データの一括移行や削除は行わない。

## 6. API設計

### 6.1 共通Cloud Functionsの利用

Web専用に休業生成ロジックを複製せず、アプリ側で提供する次のCallable Functionsを正規APIとして利用する。

- `createAdminClosures`
- `deleteAdminClosures`

呼び出しリージョンは `asia-northeast2` とする。Firebase Web SDKのCallable Functionsを使用することで、ログイン中のFirebase ID Tokenが自動送信される。Functions側は `adminUsers/{uid}` を再検証する。

現在のWeb `adminApi` は一覧取得と30分単位の休憩登録に引き続き利用する。休業の登録・削除だけを共通Callable Functionsへ接続する。`rest.create`、`rest.delete`、`rest.apply` は休憩登録に必要なため削除しない。

### 6.2 登録リクエスト

```json
{
  "startDate": "2026-08-25",
  "endDate": "2026-08-31",
  "period": "afternoon",
  "requestId": "UUID"
}
```

- 日付は `YYYY-MM-DD` だけを送る。
- `requestId` は `crypto.randomUUID()` で作成する。
- 通信失敗後の再試行では同じ `requestId` を再利用する。
- 入力内容を変更した場合、または成功後の次回登録では新しい `requestId` を発行する。
- 認証UID、営業時間、開始・終了時刻はクライアントから送らない。

レスポンス:

```json
{
  "closureGroupId": "...",
  "createdIds": ["..."],
  "createdDates": ["2026-08-25", "2026-08-26"],
  "skippedClosedDates": ["2026-08-27"]
}
```

### 6.3 削除リクエスト

この日のみ削除:

```json
{
  "closureIds": ["rest-document-id"],
  "requestId": "UUID"
}
```

期間すべて削除:

```json
{
  "closureGroupId": "closure-group-id",
  "closureIds": [],
  "requestId": "UUID"
}
```

`closureIds` と `closureGroupId` はどちらか一方だけを有効値として指定する。削除後は管理スナップショットを再取得する。

### 6.4 エラー変換

| Functionsエラー | Web表示 |
| --- | --- |
| `unauthenticated` / `permission-denied` | `管理者として再ログインしてください。` |
| `invalid-argument` | Functionsから返された入力エラーを表示する |
| `failed-precondition` + 予約競合 | `予約が入っているため休業を登録できません。予約内容を確認してください。` |
| `failed-precondition` + 休業競合 | `すでに休業が登録されている日を含みます。` |
| 通信失敗 | `通信に失敗しました。入力内容を保持したまま再試行できます。` |

Functionsが返す内部情報やスタックトレースは画面に表示しない。競合詳細は日付、時間、顧客名だけを表示する。

## 7. Web実装構成

```text
src/features/admin/
├── admin-closures-api.ts
├── closure-registration.ts
├── closure-registration.test.mts
├── components/
│   ├── admin-console.tsx
│   ├── admin-closures.tsx
│   ├── closure-registration-form.tsx
│   └── closure-list.tsx
├── server/admin-data.ts
└── types.ts
```

責務:

- `admin-closures-api.ts`: Callable Functionsの初期化、型付き呼び出し、エラー変換
- `closure-registration.ts`: 日付範囲、定休日、表示用時間、グループ化を扱う純粋関数
- `admin-closures.tsx`: 独立した休業登録画面の構成
- `closure-registration-form.tsx`: 入力、プレビュー、確認、送信状態
- `closure-list.tsx`: 登録済み休業のグループ表示、詳細、削除操作
- `admin-console.tsx`: ページ全体の通知、スナップショット再取得、他管理画面との接続
- `server/admin-data.ts`: `rests` の追加メタデータを読み取って `AdminRestBlock` に変換

フォーム状態:

```ts
type ClosureRegistrationState = {
  rangeMode: "single" | "range";
  startDate: string;
  endDate: string;
  period: "fullDay" | "morning" | "afternoon";
  requestId: string | null;
  isSubmitting: boolean;
};
```

## 8. 状態と再取得

- 初期表示は既存の `fetchAdminSnapshot()` から営業時間、定休日、予約、休業を取得する。
- フォームのプレビューはスナップショットを使って即時表示する。
- 登録・削除成功後は `fetchAdminSnapshot()` を再実行する。
- 再取得に失敗しても登録自体を失敗扱いにせず、成功通知と再読込案内を分けて表示する。
- 複数タブやアプリから同時更新される可能性があるため、送信直前のクライアント状態を正としない。
- Functionsの競合検証とTransactionを最終判定とする。

## 9. 移行方針

1. `AdminRestBlock` とMapperへ新フィールドを任意互換で追加する。
2. Callable Functions用のWeb APIアダプターと純粋関数のテストを追加する。
3. `/admin/closures` と独立した休業登録フォームを追加する。
4. 管理ナビゲーションと予約画面に、休憩登録と休業登録の両方の導線を設ける。
5. 予約カレンダーで休憩と休業を区別して表示する。
6. 開発環境でWebとアプリから相互に休業を登録・削除できることを確認する。

既存の `rests` ドキュメントは移行せず、従来どおり休憩として使用する。

## 10. テスト設計

### 10.1 Unit Test

- 1日と期間の両端を含むプレビューを生成できる
- 終日、午前、午後の表示時間が営業時間設定に一致する
- 定休日を除外し、対象日数と除外日数を表示できる
- 90日超過、開始・終了の逆転、過去日を拒否する
- 12:00境界を扱えない営業時間設定を拒否する
- `closureGroupId` 単位で休業をまとめる
- 旧データを `custom` の休憩として扱い、休業一覧には混在させない
- ブラウザのタイムゾーンにかかわらずJSTの日付が変わらない
- Functionsエラーを安全な日本語メッセージへ変換する
- 再試行時に同じ `requestId` を利用する

### 10.2 結合確認

- Webで登録した休業がアプリ管理画面と顧客向け予約枠へ反映される
- アプリで登録した休業がWeb管理画面へ反映される
- 予約と重なる期間登録が全件失敗し、休業が1件も作成されない
- 期間の1日だけ削除した場合、同じグループの他の日が残る
- 期間すべてを削除した場合、同じ `closureGroupId` の全件が削除される
- 権限のないユーザーからCallable Functionsを実行できない
- 二重送信と通信再試行で重複データが作成されない

### 10.3 UI確認

- 360px幅とデスクトップ幅でフォームと一覧が操作できる
- キーボードだけで入力、確認、キャンセル、登録ができる
- スクリーンリーダーで選択状態、入力エラー、成功、失敗を判別できる
- 送信中に二重送信できない
- 休憩登録と休業登録を誤認せず操作できる

## 11. 完了条件

- 現在の時間割型「休憩」UIが維持されている
- 独立した `/admin/closures` の休業登録UIが追加されている
- 1日・期間、終日・午前・午後の組み合わせで休業登録できる
- 登録済み休業を日単位または期間単位で削除できる
- Webとアプリが同じCloud Functionsと `rests` データを使用している
- 予約競合、既存休業、権限、再送がサーバー側で安全に処理される
- 顧客向け予約可能枠へ反映される
- 旧データを失わず30分単位の休憩として表示・編集できる
- 自動テスト、lint、本番ビルドが成功する
