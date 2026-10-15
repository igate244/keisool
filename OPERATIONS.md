# 運用ガイド（スマホだけで回す）

## 全体の流れ
```
スマホのClaudeアプリで「〇〇を直して」「△△のツールを足して」
   ↓ Claudeがコードを直してテスト・ビルド確認 → GitHubにpush
GitHub Actions が自動でテスト → ビルド → Firebase Hosting に公開（2〜3分）
   ↓
スマホのアプリを開き直すと新しい版になる
```

## アプリのURL
**`https://keisool.web.app/`**
→ Chromeで開いて「︙ → アプリをインストール」（iPhoneはSafariの共有 → ホーム画面に追加）。オフラインでも動く。

## 設定済みのもの
- Firebase Hosting：KEEP の Firebase プロジェクト（keep-app-30128）に相乗りしたサイト `keisool`
- 公開用の鍵：GitHub の Secrets に `FIREBASE_SERVICE_ACCOUNT` として登録済み
- Claude の GitHub アプリに keisool リポジトリへのアクセスを追加済み

## ふだんの運用
| やりたいこと | やり方 |
|---|---|
| 機能を足す・直す | Claudeに頼むだけ。push までやってくれる |
| 公開されたか見る | GitHubの Actions タブ、またはアプリの 設定 → 「ビルド」の日時 |
| 新しい版にならない | 設定 → 「最新版に更新」。ダメならアプリを一度閉じて開き直す |

## 困ったとき
- **Actions が赤い**：失敗した画面のURLか、エラーのスクショをClaudeに渡す
- **鍵の期限切れ・削除**：Firebaseコンソール → プロジェクトの設定 → サービスアカウント → 新しい秘密鍵 → GitHub の Secrets を更新
