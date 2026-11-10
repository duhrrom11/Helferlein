import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'.',
 testMatch:['wishes-ui.spec.mjs','dashboard-browser.integration.spec.mjs'],
 fullyParallel:false,
 workers:1,
 retries:0,
 timeout:20000,
 expect:{timeout:5000},
 reporter:[['list']],
 projects:[{
  name:'chromium',
  use:{
   ...devices['Desktop Chrome'],
   browserName:'chromium',
   headless:true,
   reducedMotion:'reduce',
   actionTimeout:5000,
   navigationTimeout:10000,
   trace:'retain-on-failure',
   screenshot:'only-on-failure',
   video:'off'
  }
 }],
 outputDir:'./.playwright-results'
});
