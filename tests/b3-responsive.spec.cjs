const { test, expect } = require('@playwright/test');
const base = 'http://127.0.0.1:8765/tools/pflanzenpflege-giessplan/index.html';

for (const width of [390, 768, 900, 1024, 1200, 1440]) {
  test('B3 panels readable without overlap at '+width+'px', async ({page}) => {
    await page.setViewportSize({width,height:900});
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await expect(page.locator('body.b3')).toBeVisible();
    const measurements=await page.evaluate(()=>{
      const main=document.querySelector('main.b3-dashboard');
      const container=main.getBoundingClientRect();
      const keys=['stats','calendar','create','plants'];
      const rects=keys.map(id=>{
        const el=document.querySelector('[data-b3-panel="'+id+'"]');
        const b=el.getBoundingClientRect();
        return {id,left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};
      });
      return {viewport:innerWidth,docWidth:document.documentElement.scrollWidth,container:{left:container.left,right:container.right,width:container.width},rects};
    });
    expect(measurements.docWidth).toBeLessThanOrEqual(width+3);
    for (const r of measurements.rects) {
      expect(r.width, r.id+' is too narrow').toBeGreaterThan(width<768?width*.72:width<1280?measurements.container.width*.9:measurements.container.width*.3);
      expect(r.left).toBeGreaterThanOrEqual(measurements.container.left-2);
      expect(r.right).toBeLessThanOrEqual(measurements.container.right+2);
    }
    for(let i=0;i<measurements.rects.length;i++){
      for(let j=i+1;j<measurements.rects.length;j++){
        const a=measurements.rects[i],b=measurements.rects[j];
        const overlapX=Math.min(a.right,b.right)-Math.max(a.left,b.left);
        const overlapY=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
        expect(overlapX>8&&overlapY>8, a.id+' overlaps '+b.id+' at '+width).toBe(false);
      }
    }
  });
}
test('B3 editing never writes tool records and cancellation restores the layout',async ({page})=>{
  await page.setViewportSize({width:900,height:900});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  const editor=page.locator('#b3-editor');
  await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
  await page.locator('#b3-edit-open').click();
  await expect(editor).toBeVisible();
  await editor.getByRole('button',{name:'Standardlayout'}).click();
  await editor.getByRole('button',{name:'Abbrechen'}).click();
  await expect(editor).toBeHidden();
  expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_layout_pflanzen_v1'))).toBeNull();
});
test('B3 dark mode keeps calendar content readable',async ({page})=>{
  await page.setViewportSize({width:900,height:900});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
  await page.locator('[data-b3-theme]').selectOption('dark');
  await expect(page.locator('body')).toHaveClass(/b3-dark/);
  const c=await page.locator('[data-b3-panel="calendar"]').evaluate(el=>{
    const t=el.querySelector('h3');
    return {background:getComputedStyle(el).backgroundColor,text:getComputedStyle(t).color,width:el.getBoundingClientRect().width};
  });
  expect(c.width).toBeGreaterThan(500);
  expect(c.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(c.text).not.toBe('rgb(255, 255, 255)');
});

for(const width of [390,900]){
 test('B3 compact header and consolidated navigation at '+width+'px',async ({page})=>{
  await page.setViewportSize({width,height:850});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await expect(page.locator('.b3-settings-trigger')).toBeVisible();
  await expect(page.locator('.b3-tool-title h1')).toBeVisible();
  await expect(page.locator('.b3-tool-title p')).toBeVisible();
  await expect(page.locator('.b3-more>summary')).toBeVisible();
  await expect(page.locator('.b3-mobile-nav')).toHaveCount(0);
  await expect(page.locator('main [data-b3-panel="actions"]')).toHaveCount(0);
  await page.locator('.b3-more>summary').click();
  await expect(page.getByRole('button',{name:'Garten-ROI'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Zisterne'})).toBeVisible();
  await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
  await expect(page.locator('#settingsModal')).toBeVisible();
  await expect(page.locator('[data-b3-theme]')).toBeVisible();
  await expect(page.locator('#b3-edit-open')).toBeVisible();
  await expect(page.getByRole('link',{name:'Zur Helferlein-Hauptseite'})).toBeVisible();
 });
}
