# AI RADIO 98.7

好きなテーマを入力すると、性格の異なる2人のDJが短いセグメントをつなぎながら語り合う、自分専用AIラジオです。GitHub Pagesだけで動く無料のDemo Modeと、Cloudflare Worker経由でGroq / Geminiを使うAI Modeを用意しています。

公開URL: https://anemia111.github.io/ai-radio/

## 主な機能

- APIキーなしで動くF1・ゲーム・テクノロジー・スポーツ・アニメ・勉強・雑談・深夜ラジオのDemo番組
- Web Speech APIによるDJ A / DJ Bの交互読み上げと個別音声選択
- 20〜60秒単位の会話セグメント、次セグメントの先読み、直近履歴の引き継ぎ
- Web Audio APIで生成する権利問題のないBGMとジングル、発話中の自動ダッキング
- 開始、一時停止、再開、終了、次の話題、話題継続、DJ配分、各音量調整
- 11番組モード、6種類の雰囲気、最近のテーマ、お気に入り
- 設定のlocalStorage保存、RSS入力、失敗時のDemo自動フォールバック
- レスポンシブUI、PWA、オフライン用Service Worker、WebMCP操作ツール
- Groq / Geminiを差し替え可能なProvider構造と安全なWorkerプロキシ

## 技術構成

- React 19 / Vite 8 / TypeScript 6 / Tailwind CSS 4
- Web Speech API / Web Audio API / localStorage
- GitHub Pages / GitHub Actions
- Cloudflare Workers（AI ModeとCORS制限付きRSSプロキシ）

## ローカル起動

Node.js 22以上を推奨します。

```bash
npm install
npm run dev
```

表示されたURL（通常は `http://localhost:5173/ai-radio/`）を開きます。本番ビルドは次のとおりです。

```bash
npm run check
npm run preview
```

成果物は `dist/` に生成されます。Viteの `base` はGitHub Pages用に `/ai-radio/` を設定済みです。

## Demo Mode

初期状態はDemo Modeです。テーマを入力して「放送を開始」を押すだけで動き、APIキーや外部サーバーは不要です。テーマにF1、ゲーム、AI / テクノロジー、深夜などを含めると近いサンプル番組を選びます。AI接続・RSS・音声で問題が起きてもアプリ全体は停止せず、Demo会話または字幕で継続します。

## GitHub Pages と GitHub Actions

`.github/workflows/deploy-pages.yml` が `main` へのpushでcheckout、Node.js準備、`npm ci`、`npm run check`（lint・単体テスト・Worker型検査・本番ビルド）、artifact upload、`github-pages` environmentへのデプロイを自動実行します。

リポジトリの **Settings → Pages → Build and deployment → Source** が **GitHub Actions** になっていることを確認してください。workflowには `contents: read`、`pages: write`、`id-token: write` のみを付与しています。リポジトリ名を変える場合は `vite.config.ts` の `base` と本READMEのURLも変更してください。

## AI Mode: Cloudflare Worker

静的なGitHub Pagesへ秘密鍵を置くことはできません。AI Modeは `GitHub Pages → Cloudflare Worker → Groq / Gemini` の経路を使います。

### 1. Workerを準備

```bash
cd worker
npm install
npx wrangler login
```

`worker/wrangler.toml` の `ALLOWED_ORIGINS` に公開URLのorigin（例: `https://anemia111.github.io`）を設定します。

### 2. APIキーをSecretへ保存

Groq（標準）:

```bash
npx wrangler secret put GROQ_API_KEY
```

Gemini:

```bash
npx wrangler secret put GEMINI_API_KEY
```

Geminiを使う場合は `AI_PROVIDER = "gemini"` に変更します。APIキーはCloudflareのSecretにのみ保存し、`VITE_GROQ_API_KEY` や `VITE_GEMINI_API_KEY` は作成しないでください。

### 3. デプロイして接続

```bash
npm run deploy
```

発行された `https://...workers.dev` URLを、アプリの **SOUND & CONNECTION → Cloudflare Worker URL** に入力します。Workerは `POST /api/generate` と `GET /api/rss` を提供し、origin確認、入力・出力長制限、Cloudflare Rate Limiting、AI応答スキーマ検証を行います。RSSは公開HTTP(S)フィードのみを対象とし、ローカルアドレス、資格情報付きURL、任意ポートを拒否します。対象ドメインを限定したい場合は `RSS_ALLOWED_HOSTS` にカンマ区切りで設定してください。

## BGMとジングル

音源が未登録のときはWeb Audio APIで穏やかなBGMと3音のStation IDを端末内生成するため、追加ファイルなしで動きます。使用許諾済み音源はBGMなら `public/audio/bgm/`、ジングルなら `public/audio/jingles/` に置き、`public/audio/catalog.json` に相対パスを登録してください。読み込みに失敗した場合も生成音へ戻ります。市販曲や利用許諾が不明な音源は同梱しないでください。

## RSS

ニュースモードでRSS URLを登録できます。ブラウザから直接取得できるフィードはそのまま利用し、CORS制限がある場合はWorker URLも設定してください。取得対象はタイトル、概要、URL、公開日時で、Demo Modeでも取得記事を番組へ反映します。サイズ上限、タイムアウト、XML解析エラーを検査し、RSS失敗時も通常放送を続けます。

## PWA

`manifest.webmanifest` とService Workerを同梱しています。公開URLをスマートフォンで開き、ブラウザメニューの「ホーム画面に追加」を選ぶとアプリ風に起動できます。初回読み込み後は基本UIをキャッシュします。

## トラブルシューティング

- **声が出ない**: 端末音量と自動再生設定を確認し、必ず「放送を開始」をタップしてください。日本語音声がない端末ではOSの日本語音声を追加します。
- **DJ AとBが同じ声**: SOUND & CONNECTIONで別々のvoiceを選びます。端末に1つしかない場合は速度とピッチで差を付けます。
- **AI MODEにならない**: Worker URL、Cloudflare Secret、`ALLOWED_ORIGINS`、Workerログを確認します。失敗中はDemo Modeへ戻ります。
- **RSSを読めない**: Worker URLを設定します。認証必須・アクセス制限付きフィードは対象外です。
- **Pagesが白画面**: リポジトリ名が `ai-radio` か、Viteの `base` と一致するか確認します。
- **古い画面が残る**: ブラウザのサイトデータを削除して再読み込みします。

## セキュリティ

フロントエンドには秘密鍵を含めません。ユーザー入力はReactのテキストとして描画します。Workerは許可origin、入力・出力長、リクエスト頻度、AI応答形式を検証します。RSS取得はリダイレクト先も毎回検査し、プライベートネットワークを指すURLを拒否します。さらに公開規模を拡大する場合はTurnstileやCloudflare WAFの追加を検討してください。

## ライセンス

MIT
