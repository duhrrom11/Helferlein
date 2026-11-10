import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

// Isolated UI contract tests. Scripts and remote resources are removed deliberately:
// no Supabase connection, no auth session, no production writes.
const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
const fixture=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<script\b[^>]*\/>/gi,'').replace(/<link\b[^>]*>/gi,'');
async function mount(page){
 await page.setContent(fixture,{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{
  for(const el of document.querySelectorAll('#listsDashboard, #listWishCards, .wish-bulk-toolbar'))el.hidden=false;
 });
}
test('bulk controls have descriptive accessible names and correct selection scope',async({page})=>{
 await mount(page);
 await expect(page.getByRole('group',{name:'Sammelaktionen für Wünsche'})).toBeVisible();
 await expect(page.getByRole('checkbox',{name:/Alle gefilterten Wünsche auswählen/})).toBeVisible();
 await expect(page.getByRole('button',{name:'Ausgewählte zur Liste hinzufügen'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Ausgewählte aus Liste entfernen'})).toBeVisible();
});
test('confirmation dialog supports keyboard Escape and focus',async({page})=>{
 await mount(page);
 await page.evaluate(()=>document.getElementById('bulkConfirmDialog').showModal());
 const dialog=page.getByRole('dialog',{name:'Mehrfachaktion prüfen'});
 await expect(dialog).toBeVisible();
 await page.keyboard.press('Tab');
 await expect(page.locator('#bulkConfirmCancel, #bulkConfirmApply').first()).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(dialog).not.toBeVisible();
});
test('progress and loading errors are announced to assistive technology',async({page})=>{
 await mount(page);
 await expect(page.locator('#bulkProgressBar')).toHaveAttribute('aria-label','Bearbeitete Wünsche');
 await expect(page.locator('#bulkProgressDetails')).toHaveAttribute('aria-live','polite');
 await expect(page.locator('#listItemsFeedback')).toHaveAttribute('role','status');
 await expect(page.locator('#listItemsRetry')).toHaveText('Erneut laden');
});
test('mobile bulk controls remain usable without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:375,height:667});
 await mount(page);
 const bar=page.getByRole('group',{name:'Sammelaktionen für Wünsche'});
 await expect(bar).toBeVisible();
 await expect(page.getByRole('button',{name:'Ausgewählte zur Liste hinzufügen'})).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
 expect(overflow).toBe(false);
});
test('bulk results and history are structured and screenreader-readable',async({page})=>{
 await mount(page);
 await expect(page.locator('#bulkResultPanel')).toHaveAttribute('aria-labelledby','bulkResultHeading');
 await expect(page.locator('#bulkHistoryPanel')).toHaveAttribute('aria-labelledby','bulkHistoryHeading');
 await expect(page.locator('#bulkResultSummary')).toHaveAttribute('role','status');
 await expect(page.locator('#bulkHistoryList')).toHaveJSProperty('tagName','OL');
});
