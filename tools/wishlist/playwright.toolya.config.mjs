import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'.',testMatch:'toolya-modal.spec.mjs',workers:1,retries:0,
 use:{browserName:'chromium',launchOptions:process.env.TOOLYA_CHROMIUM_PATH?{executablePath:process.env.TOOLYA_CHROMIUM_PATH}:{},headless:true,baseURL:'http://127.0.0.1:8769',hasTouch:true,isMobile:true},
 projects:[{name:'android-small',use:{viewport:{width:320,height:640}}},{name:'android-landscape',use:{viewport:{width:640,height:320}}}],
 webServer:{command:'python3 -m http.server 8769 --bind 127.0.0.1',url:'http://127.0.0.1:8769',reuseExistingServer:false},
});
