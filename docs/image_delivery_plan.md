# Web画像の配信・素材準備方針

## 配信経路

本番Webは OpenNext を介して Cloudflare Workers にデプロイする。

```text
利用者のブラウザ
  → 最寄りのCloudflareエッジ
  → public画像: Cloudflare Static Assets（ASSETS binding）
  → next/image: Cloudflare Images（IMAGES binding）
  → 変換済み画像をCloudflareエッジから返却
```

- 単一リージョンに固定した画像サーバーではなく、Cloudflareのグローバルネットワークから配信する。
- 2026-08-24の本番確認では、`/images/salon-vishu-interior.webp` は大阪の `KIX` エッジから `cf-cache-status: HIT` で応答した。
- `/_next/image` の画像変換経路も同じ `KIX` エッジから正常応答した。
- `next.config.ts` ではAVIF／WebP出力と24時間の最小キャッシュ期間を指定している。
- GitHub Pages用の静的出力では画像最適化が無効になるため、本番はCloudflare Workers経路を使用する。

## 掲載素材の準備状況

| 用途 | 採用候補 | 解像度 | 容量 | 状況 |
| --- | --- | ---: | ---: | --- |
| トップ・店内 | `salon-vishu-interior.webp` | 1179 × 2556 | 約130KB | 使用可能 |
| 髪質改善・縮毛矯正 | `salon-vishu-straightening-*.webp` 4点 | 1000〜1200 × 1333〜1600 | 約95〜263KB | 最適化済み |
| シャンプー台 | `salon-vishu-shampoo-station.webp` | 1672 × 941 | 約58KB | 使用可能 |
| Google Maps左・玄関 | `salon-vishu-exterior.webp` | 1179 × 1563 | 約168KB | 使用可能 |

## 画像作成基準

- 元写真は編集前の最大解像度で受領し、Web掲載用ファイルを別途作成する。
- 写真はWebPを基本とし、透過が必要な素材だけPNGを使用する。
- 色空間はsRGBとし、位置情報を含むEXIFなど不要なメタデータを削除する。
- トップ画像は長辺1600〜2000px、その他は長辺1200〜1600pxを目安にする。
- WebP品質は75〜82を基準に、髪の質感や店内の木目に破綻がない範囲で調整する。
- 元画像の容量目標はトップ250KB以下、その他200KB以下とする。
- `next/image` には実際の表示幅に合う `sizes`、固定比率または `fill`、適切な代替テキストを設定する。
- ファーストビューだけを優先読込し、それ以外は遅延読込する。

## 配置実装時の作業

1. 店内写真をトップへ移し、デスクトップ／スマートフォン双方の切り抜きを調整する。
2. 縮毛矯正写真を2番目、シャンプー台写真を3番目へ配置する。
3. 玄関写真とGoogle Mapsを横並びにし、スマートフォンでは縦並びにする。
4. Lighthouseと実機でLCP、CLS、画質を確認する。
