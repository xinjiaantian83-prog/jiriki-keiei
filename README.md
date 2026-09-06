# 現場屋の自力経営

地方の現場職人・一人親方・小規模事業者に向けた静的ブログです。

## 記事を追加する

1. `content/articles/` 内の記事を複製する
2. ファイル先頭の `title`、`description`、`date`、`category`、`featured` を変更する
3. Markdownで本文を書く
4. `npm run build` を実行する

記事URL、トップページの記事一覧、前後記事、関連記事、`sitemap.xml` は自動生成されます。

## 計測設定

`public/site-config.js` の `ga4MeasurementId` にGA4 Measurement IDを設定します。空欄の場合、Google Analyticsへの外部通信は発生しません。

Search Consoleは `public/site-config.js` の説明に従って、発行された確認用metaタグを `src/build.mjs` の共通headへ追加します。
