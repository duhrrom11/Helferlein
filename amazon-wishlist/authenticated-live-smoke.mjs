import {chromium} from '@playwright/test';

const email=process.env.WISHES_EXISTING_USER_EMAIL;
const password=process.env.WISHES_EXISTING_USER_PASSWORD;
const base=process.env.WISHES_LIVE_BASE||'https://duhrrom11.github.io/Helferlein';
if(!email||!password)throw Error('Existing-user auth credentials not configured; authenticated release gate NOT passed');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 const blockedWrites=[];
 // Fail closed: this acceptance run must never mutate production REST tables.
 await page.route('https://avapuibsidubuzxjtyld.supabase.co/rest/v1/**',async route=>{
  const method=route.request().method();
  if(method!=='GET'&&method!=='HEAD'&&method!=='OPTIONS'){
   blockedWrites.push(method);
   await route.abort('blockedbyclient');
   return;
  }
  await route.continue();
 });
 // No screenshots, tracing, storage-state exports or console capture: do not leak credentials.
 await page.goto(base.replace(/\/$/,'')+'/amazon-wishlist/index.html',{waitUntil:'domcontentloaded'});
 const listReads=[];
 page.on('response',response=>{
  const url=response.url();
  if(url.startsWith('https://avapuibsidubuzxjtyld.supabase.co/rest/v1/')&&/\/wishlist_lists(?:\?|$)|\/wishlist_list_items(?:\?|$)/.test(url)){
   listReads.push({table:url.includes('/wishlist_list_items')?'wishlist_list_items':'wishlist_lists',status:response.status()});
  }
 });
 await page.locator('#email').fill(email);
 await page.locator('#password').fill(password);
 await page.locator('#signin').click();
 await page.locator('#logout').waitFor({state:'visible',timeout:30000});
 await page.locator('#listsDashboard').waitFor({state:'visible',timeout:30000});
 const readOnly=await page.evaluate(async()=>{
  const client=window.supabase;
  if(!client||typeof client.createClient!=='function')throw Error('Supabase client unavailable');
  // Browser app already loaded owner-scoped lists. Verify the signed-in UI, without writes.
  const listSelect=document.getElementById('wishListSelect');
  const dashboard=document.getElementById('listsDashboard');
  return {visible:!dashboard.hidden,hasListSelect:!!listSelect,loginHidden:document.getElementById('login').hidden};
 });
 if(!readOnly.visible||!readOnly.hasListSelect||!readOnly.loginHidden)throw Error('Authenticated dashboard is not ready');
 if(blockedWrites.length)throw Error('Production REST write attempted during read-only smoke');
 if(!listReads.some(r=>r.table==='wishlist_lists'&&r.status===200))throw Error('No successful authenticated wishlist_lists REST SELECT observed');
 if(listReads.some(r=>r.status>=400))throw Error('Authenticated list REST request failed');
 await page.locator('#logout').click();
 await page.locator('#login').waitFor({state:'visible',timeout:30000});
 await page.locator('#listsDashboard').waitFor({state:'hidden',timeout:30000});
 if(blockedWrites.length)throw Error('Production REST write attempted during logout');
 if(await page.locator('#wishListSelect option').count()!==1)throw Error('Private list selection survived logout');
 console.log('Existing-account read-only browser sign-in, dashboard and logout verified');
}finally{await browser.close()}
