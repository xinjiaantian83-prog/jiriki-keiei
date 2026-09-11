# SNS投稿管理

ブログ記事から作成したSNS投稿案を、記事単位のJSONで管理します。

## 管理ファイル

- `ai-search-first-posts.json`：第一話を元にした投稿案18本

## 各項目

- `postId`：投稿を一意に識別するID
- `sourceArticle`：元記事のslug
- `theme`：1投稿で扱う話題
- `platform`：投稿媒体
- `body`：投稿本文または動画用原稿
- `cta`：CTAを含めるか
- `linkPlacement`：リンクの設置場所。`profile`、`button`、`none`のいずれか
- `linkTarget`：リンク先。リンクを使わない投稿は`null`
- `scheduledAt`：ISO 8601形式の仮投稿日時
- `posted`：投稿済みフラグ
- `postUrl`：投稿後のURL。未投稿時は`null`

## 運用手順

1. 記事公開後、その記事を話題単位に分解する。
2. 投稿案を確認し、必要なら本文と仮投稿日時を調整する。
3. 実際に投稿したら`posted`を`true`へ変更する。
4. 公開された投稿URLを`postUrl`へ記録する。

XとTikTokでは本文にURLを入れず、`linkPlacement`が`profile`の投稿だけプロフィールへ自然に誘導します。Googleビジネスプロフィールでは、`button`の投稿に限り、操作ボタンのURL欄へ`linkTarget`を設定します。
