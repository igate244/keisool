# CLAUDE.md — 開発エージェント向けメモ

このリポジトリは、オーナーが**スマホだけ**で開発・運用している個人用PWA「Keisool（計装ツール）」。
計装保全の計算を電卓感覚で使うためのツール箱。変更依頼はスマホのClaudeアプリから来る。

## 守ること
- 変更したら `npm test` と `npm run build` が通ることを確認してから main に push する（push＝本番公開）
- 計算式を変えたら、規格表の値でテストを足す（`tests/calc.test.ts`）。数字の正しさが最優先
- 画面を変えたら、スマホ幅（390px）でスクリーンショットを撮って崩れていないか自分で見る
- 依存パッケージは増やさない（react / react-dom / esbuild / tsx だけ）
- 点検記録・タグ台帳のような「実データの保存」は入れない方針。計算・メモは端末内（localStorage）、クラウドに置くのは「今日のワーク」の共有タスクだけ
- Firestore のルールは KEEP のプロジェクトと共用。変更はコンソールのルールに `keisoolTeams` の部分だけ足す形で（KEEP・人間図鑑の部分は触らない）。ルールの公開とドメイン追加はオーナー本人がやる
- オーナーへの報告は短く、くだけた日本語で。結果と「スマホで何をすればいいか」だけ

## 構成
- `src/calc/*` 計算ロジック（純関数・テストあり）
  - `thermocouple.ts` 熱電対 ITS-90 多項式（JIS C 1602）。逆変換は二分法
  - `rtd.ts` 測温抵抗体 Callendar–Van Dusen（JIS C 1604 / IEC 60751、JPt100は旧JIS近似）
  - `signal.ts` 4-20mA等 ⇔ % ⇔ 物理量（リニア／開平）
  - `units.ts` 単位換算（圧力・流量・温度・長さ）
- `src/tools/*Tool.tsx` 各ツール画面（`TempTool` が測温抵抗体 `RtdTool` と熱電対 `TcTool` を切替でまとめている）。`registry.ts` に1行足せばホームに並ぶ
  - ツールは `ToolDef`（`types.ts`）：id・名前・グループ・検索キーワード・アイコン・初期値・画面・履歴用の一行要約
- `src/store.ts` localStorage（お気に入り・最近・各ツールの入力状態・計算履歴・メモ・参加中チームID・設定）
- `src/cloud.ts` 今日のワーク（Firebase Auth の Google ログイン＋Firestore のリアルタイム共有）。SDK は gstatic から動的 import（npm には入れない）、sw.js が SDK をキャッシュ
  - `keisoolTeams/{teamId}`（name・owner・members・names）、`keisoolTeams/{teamId}/tasks/{id}`
  - 招待リンク `#/join/{teamId}`。teamId を知っているログイン済みの人が自分を members に足せる
- `src/screens/*` ホーム（検索＋グループ絞り込み）・ツール・ワーク（＋参加）・メモ・履歴・設定
- `src/styles.css` 全スタイル（ダーク）。グループ色は `--g-signal` などのCSS変数
- `build.mjs` esbuild でビルド→ `dist/`、`src/sw.template.js` から sw.js を生成（オフライン対応）
- `.github/workflows/deploy.yml` main への push で test→build→Firebase Hosting（https://keisool.web.app）に公開
- `firebase.json` / `.firebaserc` KEEP の Firebase プロジェクト（keep-app-30128）のサイト `keisool`

## 確認方法
```
npm install
npm test
npm run dev   # http://localhost:5173/ で確認（ビルド済みを配信）
```

## 要件・今後
`docs/requirements.md` が最新の要件。方針変更があったらそこも更新する。
