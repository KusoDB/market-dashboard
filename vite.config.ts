import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages のサブパスでホスティングする場合はリポジトリ名を入れる。
// ユーザー専用ページ (<user>.github.io) なら '/' のままで OK。
// 環境変数 VITE_BASE で上書き可能。
const base = process.env.VITE_BASE ?? '/market-dashboard/';

export default defineConfig({
  base,
  plugins: [react()],
  server: { port: 5173 },
});
