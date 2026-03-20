# Microsoft Teams 連携

> ステータス: **計画中（Planned）**
> 目標リリース: **2026/05/01**（Post-MVP）

---

## 概要

コープネットの投稿を Microsoft Teams のチャネルに共有する機能。Teams の Incoming Webhook / Connectors を利用して、ユーザーがワンクリックで投稿内容をTeamsチャネルに転送できるようにする。

---

## ユーザーストーリー

### US-1: 投稿をTeamsチャネルに共有する
**ユーザーとして**、コープネットの投稿をTeamsチャネルに共有したい。
**それにより**、Teamsを主に使っているメンバーにも情報が届く。

**受入基準:**
- [ ] 投稿詳細画面に「Teamsに共有」ボタンが表示される
- [ ] ボタンをクリックすると共有先チャネルを選択できる
- [ ] 共有が完了すると成功メッセージが表示される
- [ ] Teams側にカード形式で投稿内容が表示される

### US-2: お知らせをTeamsに自動通知する
**管理者として**、お知らせを作成したときにTeamsチャネルに自動通知したい。
**それにより**、全社員が確実にお知らせを確認できる。

**受入基準:**
- [ ] お知らせ作成時に「Teamsにも通知する」チェックボックスがある
- [ ] チェックを入れると、設定済みのチャネルに自動送信される
- [ ] 通知カードにはお知らせのタイトルとリンクが含まれる

### US-3: Teams Webhook URLを管理する
**管理者として**、Teams連携先のWebhook URLを管理画面から設定したい。
**それにより**、IT部門に依頼せずに連携先を変更できる。

**受入基準:**
- [ ] 管理画面にTeams連携設定ページがある
- [ ] Webhook URLの追加・編集・削除ができる
- [ ] チャネル名とURLを紐付けて管理できる
- [ ] テスト送信ボタンで疎通確認ができる

---

## 機能要件

### Teams Webhook 送信

| 項目 | 内容 |
|------|------|
| 送信方式 | Incoming Webhook (HTTP POST) |
| メッセージ形式 | Adaptive Card (JSON) |
| 送信タイミング | ユーザーの手動操作 / お知らせ作成時の自動送信 |
| リトライ | 失敗時に最大3回リトライ（指数バックオフ） |

### Adaptive Card テンプレート

```json
{
  "type": "message",
  "attachments": [
    {
      "contentType": "application/vnd.microsoft.card.adaptive",
      "content": {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.4",
        "body": [
          {
            "type": "TextBlock",
            "text": "コープネット - 新しい投稿",
            "weight": "bolder",
            "size": "medium"
          },
          {
            "type": "ColumnSet",
            "columns": [
              {
                "type": "Column",
                "width": "auto",
                "items": [
                  {
                    "type": "Image",
                    "url": "{{avatarUrl}}",
                    "size": "small",
                    "style": "person"
                  }
                ]
              },
              {
                "type": "Column",
                "width": "stretch",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "{{displayName}}",
                    "weight": "bolder"
                  },
                  {
                    "type": "TextBlock",
                    "text": "{{postDate}}",
                    "isSubtle": true,
                    "size": "small"
                  }
                ]
              }
            ]
          },
          {
            "type": "TextBlock",
            "text": "{{postBody}}",
            "wrap": true
          }
        ],
        "actions": [
          {
            "type": "Action.OpenUrl",
            "title": "コープネットで見る",
            "url": "{{postUrl}}"
          }
        ]
      }
    }
  ]
}
```

### API エンドポイント

| メソッド | パス | 説明 |
|----------|------|------|
| `GET` | `/api/v1/admin/teams-webhooks` | Webhook一覧取得 |
| `POST` | `/api/v1/admin/teams-webhooks` | Webhook追加 |
| `PATCH` | `/api/v1/admin/teams-webhooks/:id` | Webhook更新 |
| `DELETE` | `/api/v1/admin/teams-webhooks/:id` | Webhook削除 |
| `POST` | `/api/v1/admin/teams-webhooks/:id/test` | テスト送信 |
| `POST` | `/api/v1/posts/:id/share-to-teams` | 投稿をTeamsに共有 |

---

## エッジケース

| ケース | 対応 |
|--------|------|
| Webhook URLが無効 | バリデーションエラーを表示、URLの形式チェック |
| Teams側がダウン | リトライ後にエラーメッセージを表示、ログに記録 |
| 長文の投稿 | 300文字で切り詰め、「続きを読む」リンクを付与 |
| 画像付き投稿 | 最初の画像のサムネイルを表示、残りは省略 |
| Webhook URLが削除された | 共有ボタンを非活性化、管理者に通知 |
| レート制限 | 1ユーザーあたり1分に5回まで |

---

## データベース

### teams_webhooks テーブル

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UNIQUEIDENTIFIER | 主キー |
| channel_name | NVARCHAR(200) | チャネル表示名 |
| webhook_url | NVARCHAR(500) | Webhook URL |
| is_active | BIT | 有効/無効 |
| is_auto_announce | BIT | お知らせ自動通知の対象か |
| created_at | DATETIME2(7) | 作成日時 |
| updated_at | DATETIME2(7) | 更新日時 |
| created_by | UNIQUEIDENTIFIER | 作成者 |

---

## 技術的注意事項

- Webhook URLはデータベースに暗号化して保存する
- 送信失敗のログは `teams_share_logs` テーブルに記録する
- 非同期キュー（Redis Bull）で送信処理を行い、UIをブロックしない
- Webhook URLの有効性は定期的に検証する（週1回のヘルスチェック）
