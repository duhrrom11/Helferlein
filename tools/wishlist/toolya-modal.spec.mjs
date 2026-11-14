import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto('/toolya-mobile-preview.html');
});
test('native modal isolates background, traps focus and restores trigger',async({page})=>{
 const trigger=page.locator('#preview-confirm');await trigger.click();
 expect(await page.locator('dialog.tb-overlay').evaluate(el=>el.matches(':modal'))).toBe(true);
 const cancel=page.getByRole('button',{name:'Abbrechen',exact:true});await expect(cancel).toBeFocused();
 await page.locator('#quiet').evaluate(el=>el.focus());await expect(cancel).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(page.getByRole('button',{name:'Test bestätigen',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(cancel).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.locator('dialog.tb-overlay')).toHaveCount(0);await expect(trigger).toBeFocused();
 await expect(page.locator('#status')).toHaveText('Testbestätigung abgebrochen.');
});
test('large text leaves modal actions reachable without horizontal overflow',async({page})=>{
 await page.addStyleTag({content:'html{font-size:200%}button{font:inherit}'});await page.locator('#preview-confirm').click();
 for(const name of ['Abbrechen','Test bestätigen']){
  const action=page.getByRole('button',{name,exact:true});await action.focus();await action.scrollIntoViewIfNeeded();await expect(action).toBeInViewport();
  const box=await action.boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(page.viewportSize().width);
 }
 expect(await page.locator('.tb-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.getByRole('button',{name:'Test bestätigen',exact:true}).click();await expect(page.locator('#status')).toHaveText('Testbestätigung angenommen.');
});
test('system reduced motion overrides lively animation dynamically',async({page})=>{
 await page.locator('#intensity').selectOption('lively');await page.locator('[data-type="success"]').click();const avatar=page.locator('.tb-avatar');
 expect(await avatar.evaluate(el=>getComputedStyle(el).animationName)).toBe('tb-success');
 await page.emulateMedia({reducedMotion:'reduce'});expect(await avatar.evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 await page.emulateMedia({reducedMotion:'no-preference'});expect(await avatar.evaluate(el=>getComputedStyle(el).animationName)).toBe('tb-success');
 await page.locator('#preview-confirm').click();expect(await avatar.evaluate(el=>getComputedStyle(el).animationPlayState)).toBe('paused');
});
