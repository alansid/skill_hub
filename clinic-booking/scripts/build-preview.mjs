// 產生「單一檔案」的示範版網頁（病人頁＋管理頁，示範模式），給手機預覽用。
// 用法：npm run build:preview → 產生 dist-preview/preview-single.html
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = 'dist-preview';
await build({
  configFile: false,
  plugins: [react()],
  base: './',
  // 示範版一律不連資料庫
  define: {
    'import.meta.env.VITE_DEMO': '"1"',
    // 示範版不顯示撥號連結
    'import.meta.env.VITE_PREVIEW': '"1"',
  },
  build: {
    outDir,
    emptyOutDir: true,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: { input: 'preview.html', output: { codeSplitting: false } },
  },
  logLevel: 'warn',
});

const assets = join(outDir, 'assets');
const files = readdirSync(assets);
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const html = `<title>任老師中醫預約示範</title>
<meta name="robots" content="noindex, nofollow">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>
`;
writeFileSync(join(outDir, 'preview-single.html'), html);
console.log('OK', join(outDir, 'preview-single.html'), Math.round(html.length / 1024) + ' KB');
