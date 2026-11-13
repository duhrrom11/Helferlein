const {test,expect}=require('@playwright/test');
for(const width of [320,375,768,1280])for(const route of ['index.html','erben.html']){
 test('Estate '+route+' accessible logged-out view '+width,async({page})=>{
  await page.route('https://avapuibsidubuzxjtyld.supabase.co/**',r=>r.fulfill({status:401,contentType:'application/json',body:'{"error":"not_authenticated"}'}));
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:8765/tools/digitaler-nachlass/'+route);
  await expect(page.locator('main')).toBeVisible();await expect(page.locator('h1')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
  if(route==='index.html'){await expect(page.locator('#login-panel')).toBeVisible();await expect(page.locator('#owner-app')).toBeHidden();expect(await page.evaluate(()=>localStorage.getItem('digital_estate_vault'))).toBeNull();}
  else {await expect(page.locator('#first-key')).toBeVisible();await expect(page.locator('#read-panel')).toBeHidden();}
 });
}
