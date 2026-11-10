import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'.',
 testMatch:'wishes-ui.spec.mjs',
 fullyParallel:false,
 workers:1,
 retries:0,
 timeout:20000,
 reporter:[['list']],
 use:{...devices['Desktop Chrome'],browserName:'chromium',headless:true,trace:'off',screenshot:'off',video:'off'},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
 outputDir:'./.playwright-results'
});
