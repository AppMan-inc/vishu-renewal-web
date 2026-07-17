# Firebaseデータモデル案

## 方針

- コレクション名とステータス値は英語で固定する。
- 画面表示用の日本語文言はアプリ側で変換する。
- 日時はFirestore Timestamp、金額は整数の円、所要時間は整数の分で保存する。
- すべての主要ドキュメントに `schemaVersion`、`createdAt`、`updatedAt` を持たせる。
- MVPは単店舗でも `salonId` を持たせ、将来のデータ分離を容易にする。

## Collections

### `salons/{salonId}`

```ts
{
  name: string;
  timezone: "Asia/Tokyo";
  address: string;
  phone: string;
  businessHours: Record<string, { open: string; close: string } | null>;
  slotIntervalMinutes: number;
  bookingLeadTimeMinutes: number;
  bookingWindowDays: number;
  schemaVersion: 2;
  updatedAt: Timestamp;
}
```

### `menus/{menuId}`

```ts
{
  salonId: string;
  name: string;
  description: string;
  categories: string[];
  priceFrom: number;
  priceTo: number | null;
  durationMinutes: number;
  imagePath: string | null;
  isPublished: boolean;
  sortOrder: number;
  schemaVersion: 2;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `reservations/{reservationId}`

```ts
{
  salonId: string;
  customerId: string;
  menuId: string;
  menuSnapshot: {
    name: string;
    price: number;
    durationMinutes: number;
  };
  customerSnapshot: {
    name: string;
    email: string;
    phone: string;
  };
  startAt: Timestamp;
  endAt: Timestamp;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  note: string;
  source: "web" | "ios" | "android" | "admin";
  notificationStatus: "pending" | "sent" | "failed";
  schemaVersion: 2;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

メニュー名・価格・所要時間は予約時点のスナップショットも保存する。後からメニューを編集しても過去予約の内容が変わらない。

### `restBlocks/{restBlockId}`

```ts
{
  salonId: string;
  startAt: Timestamp;
  endAt: Timestamp;
  reason: string;
  createdBy: string;
  schemaVersion: 2;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `users/{uid}`

```ts
{
  displayName: string;
  email: string;
  phone: string;
  isAnonymous: boolean;
  schemaVersion: 2;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `adminUsers/{uid}`

```ts
{
  salonIds: string[];
  role: "owner" | "manager" | "staff";
  active: boolean;
  schemaVersion: 2;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

`adminUsers` をクライアントが作成・変更できないようにする。権限付与はAdmin SDKを使う管理手順だけで行う。

## 必要なクエリ

- 公開メニュー: `salonId == ...`, `isPublished == true`, `sortOrder asc`
- 期間内予約: `salonId == ...`, `startAt >= ...`, `startAt < ...`
- 予約一覧: 上記に `status` を追加
- 予約不可時間: `salonId == ...`, 対象期間との重複

Firestoreは任意の区間重複クエリが得意ではないため、対象日周辺を取得し、トランザクション内で `startA < endB && startB < endA` を検証する。負荷が増えた場合は日単位のロックドキュメントや予約枠ドキュメントへ移行する。

## 旧形式からの移行

旧 `salon_vishu` の `users/{uid}/reservations/{id}` をそのまま書き換えない。まず開発環境で次を行う。

1. 旧ドキュメントの全フィールドと欠損パターンを調査する。
2. v2形式への変換表を作る。
3. dry-runで件数、日時、金額、ユーザー紐付けを検証する。
4. バックアップとロールバック手順を作る。
5. 承認後に一度だけ移行する。

移行完了までは `schemaVersion` で読み取りを分岐し、無計画な二重書き込みは行わない。
