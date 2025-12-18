# 🚀 デプロイ手順 (Cloud Build & Cloud Run)

本番環境（us-west1）へのデプロイには、Google Cloud Build を使用します。これにより、`Dockerfile.cloudbuild` で定義されたビルドプロセスが確実に実行されます。

## 前提条件

1.  Google Cloud SDK (`gcloud`) がインストールされていること
2.  Google Cloud プロジェクト (`gen-lang-client-0686497338`) へのアクセス権があること
3.  Docker (ローカルでの確認用、デプロイには必須ではありません)

## デプロイコマンド

以下のコマンドを実行して、Cloud Build でのビルドとデプロイを開始します。

### 1. Google Cloud にログイン (初回のみ)

```bash
gcloud auth login
gcloud config set project gen-lang-client-0686497338
```

### 2. Cloud Build を実行 (推奨)

`cloudbuild.yaml` の設定に従ってビルドとデプロイを行います。

```bash
gcloud builds submit --config cloudbuild.yaml .
```

**このコマンドで実行される内容:**
1.  `Dockerfile.cloudbuild` を使用して Docker イメージをビルド
2.  イメージを Container Registry (`gcr.io`) にプッシュ
3.  Cloud Run サービス (`fukuoka-city-ai-chatbot-v2`) に新しいイメージをデプロイ

## 構成情報

*   **プロジェクトID:** `gen-lang-client-0686497338`
*   **リージョン:** `us-west1`
*   **サービス名:** `fukuoka-city-ai-chatbot-v2`
*   **環境変数:** Cloud Run コンソール上で設定済み（再デプロイ時も引き継がれます）

## (参考) 旧デプロイ手順 / ローカル簡易デプロイ

開発中の簡易確認などで、手元のソースコードから直接デプロイしたい場合は以下を使用できますが、本番環境への反映は上記の Cloud Build 手順を推奨します。

```bash
# 旧 v1 サービスへのデプロイ (東京リージョン)
gcloud run deploy fukuoka-city-ai-chatbot \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated
```

## トラブルシューティング

### ビルドエラーが発生した場合
Cloud Build のログ URL がコンソールに表示されるので、詳細を確認してください。

### 環境変数の変更
環境変数を追加・変更したい場合は、Cloud Run のコンソール画面から編集するか、以下のコマンドを使用します：

```bash
gcloud run services update fukuoka-city-ai-chatbot-v2 \
  --region us-west1 \
  --update-env-vars KEY=VALUE
```

