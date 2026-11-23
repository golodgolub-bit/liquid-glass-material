import { defineConfig } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const cache = join(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
const installed = existsSync(cache) ? readdirSync(cache).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>join(cache,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(existsSync) : undefined;
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.ts', workers: 1, timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 },
    launchOptions: { executablePath: process.env.CHROMIUM_PATH ?? installed, args: process.env.LIQUID_GLASS_GPU==='1' ? (process.platform==='win32'?['--use-angle=d3d11','--ignore-gpu-blocklist']:[]) : ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] },
  },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: true, timeout: 30000 },
});
