# 🚀 Google Cloud Run へのデプロイ手順

## 前提条件

1. Google Cloud SDK (`gcloud`) がインストールされていること
2. Google Cloud プロジェクトが作成されていること
3. Gemini API キーを取得済みであること

## デプロイコマンド

### 1. Google Cloud にログイン

```bash
gcloud auth login
```

### 2. プロジェクトを設定

```bash
gcloud config set project YOUR_PROJECT_ID
```

### 3. Cloud Run にデプロイ

```bash
gcloud run deploy fukuoka-city-ai-chatbot \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars API_KEY=YOUR_GEMINI_API_KEY
```

**パラメータ説明:**
- `--source .`: 現在のディレクトリをソースとしてアップロード（自動ビルド）
- `--region asia-northeast1`: 東京リージョン（日本に最も近い）
- `--allow-unauthenticated`: 誰でもアクセス可能にする
- `--set-env-vars API_KEY=...`: Gemini API キーを環境変数として設定

### 4. デプロイ完了後

デプロイが完了すると、URL が表示されます：
```
Service URL: https://fukuoka-city-ai-chatbot-xxxxx-an.a.run.app
```

ブラウザでこの URL にアクセスして動作確認してください。

## リージョンの選択肢

- `asia-northeast1` (東京) - 推奨
- `asia-northeast2` (大阪)
- `us-central1` (アメリカ中部)

## 注意事項

⚠️ **API キーの管理:**
- コマンドに API キーを直接入力する際は、履歴に残らないよう注意してください
- または、Secret Manager を使用することをお勧めします

⚠️ **コスト:**
- Cloud Run は従量課金制です
- 無料枠: 月間 200万リクエスト、36万 GB-秒

## トラブルシューティング

### ビルドエラーが発生した場合

1. `package.json` の `scripts` に `start` コマンドが定義されているか確認
2. ローカルで `npm run build` が成功するか確認

### API キーが認識されない場合

環境変数の設定を確認：
```bash
gcloud run services describe fukuoka-city-ai-chatbot \
  --region asia-northeast1 \
  --format="value(spec.template.spec.containers[0].env)"
```

### 既存のサービスを更新する場合

同じコマンドを再実行するだけで更新されます：
```bash
gcloud run deploy fukuoka-city-ai-chatbot \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars API_KEY=YOUR_NEW_API_KEY
```

