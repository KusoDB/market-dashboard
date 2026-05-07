# Market Dashboard

VIX / Fear & Greed Index / NAAIM Exposure Index のセンチメント指標と、NDX / SOX / XLK の指数・セクターETFを一画面で監視する個人向け投資ダッシュボード。**GitHub Pages + GitHub Actions** で完全無料・1日1回更新で運用する。

## アーキテクチャ

```
[GitHub Actions]  毎日 22:00 UTC (07:00 JST)
       │
       ├─ scripts/fetch-data.mjs を実行
       │     ├─ Yahoo Finance v8 → public/data/quotes.json
       │     ├─ CNN dataviz       → public/data/fear-greed.json
       │     └─ naaim.org XLSX    → public/data/naaim.json
       │
       ├─ npm run build (Vite + TypeScript)
       │
       └─ dist/ を GitHub Pages にデプロイ

[ブラウザ]
       └─ ./data/*.json を fetch (静的ファイル)
```

サーバサイドAPI (Vercel API Routes) は持たない。1日1回ビルド時にデータを焼き込んで配信。

## ローカル開発

```bash
npm install
npm run fetch:data   # 一度叩いて public/data/*.json を生成
npm run dev          # http://localhost:5173 で開発
```

`fetch:data` を走らせずに開発することも可能 (カードはエラー表示になる)。

ビルド確認:

```bash
npm run build
npm run preview
```

## GitHub Pages へのデプロイ

1. このリポジトリを GitHub に作成して push
2. **Settings → Pages → Source** を `GitHub Actions` に変更
3. main ブランチに push すると `.github/workflows/deploy.yml` が走る
4. Actions タブでビルド完了を確認
5. `https://<username>.github.io/<repo-name>/` にアクセス

### 補足

- **URL パスの設定**: `vite.config.ts` の `base` または環境変数 `VITE_BASE` で制御。リポジトリ名が `<user>.github.io` の場合は `/` に。ワークフローは自動でリポジトリ名を流し込む。
- **cron 時刻変更**: `.github/workflows/deploy.yml` の `cron: '0 22 * * *'` を編集 (UTC)。
- **手動更新**: Actions タブから `Build & Deploy` ワークフローを `Run workflow` で発火。

## ファイル構成

| パス | 役割 |
|---|---|
| `scripts/fetch-data.mjs` | Yahoo / CNN / NAAIM の一括取得スクリプト |
| `public/data/*.json` | 取得結果 (Actions が生成。git には含めない) |
| `src/components/MetricCard.tsx` | 各指標カードの描画 |
| `src/components/RangeBar.tsx` | 52週レンジバー |
| `src/components/StatusBadge.tsx` | ステータスバッジ (6種 × 日英) |
| `src/components/Header.tsx` | タイトル / 最終更新 / 更新ボタン / 言語切替 |
| `src/components/Dashboard.tsx` | センチメント / 指数 セクションのレイアウト |
| `src/hooks/useMarketData.ts` | JSON取得・状態管理 |
| `src/lib/thresholds.ts` | 閾値定義 + ステータス計算 (カスタマイズ箇所) |
| `src/lib/i18n.ts` | 日英ラベル |
| `src/lib/format.ts` | 数値・日時フォーマット |
| `.github/workflows/deploy.yml` | ビルド + デプロイ + cron |

## ステータス判定ロジック

仕様書 §3 に準拠。`src/lib/thresholds.ts` の `computeStatus()` で一元管理。

| 指標 | 閾値 |
|---|---|
| VIX | `<20` Safe / `≤30` Caution / `>30` Danger |
| F&G | `<25` Danger / `<45` Caution / `≤55` Neutral / `≤75` Caution / `>75` Danger |
| NAAIM | `<30` Danger / `<60` Caution / `≤90` Neutral / `≤100` Caution / `>100` Danger |
| NDX/SOX/XLK | 52週レンジ内位置 `>0.9` High / `<0.1` Low / 他 Neutral |

## トラブルシュート

| 症状 | 対処 |
|---|---|
| Yahoo `429 Too Many Requests` | `scripts/fetch-data.mjs` の `sleep(350)` を `sleep(800)` などに伸ばす |
| CNN が `502/403` を返す | `production.dataviz.cnn.io` のスキーマ変更可能性。レスポンスを確認して `fetchFearGreed()` 内のキー名を修正 |
| NAAIM `XLSX URL not found` | naaim.org のページ構造が変わった可能性。`fetchNAAIM()` の正規表現 `/\.xlsx/i` を見直し |
| GitHub Pages で 404 | `Settings → Pages` の Source が `GitHub Actions` か確認。`VITE_BASE` がリポジトリ名と一致しているかも確認 |

## ライセンス

個人利用想定。各データソース (Yahoo Finance / CNN / NAAIM) の利用規約はそれぞれ確認してください。
