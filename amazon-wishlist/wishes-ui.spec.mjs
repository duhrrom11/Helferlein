import {test,expect} from '@playwright/test';
import {loadIsolatedWishesPage} from './isolated-browser-fixture.mjs';

// Real HTML under a restrictive CSP: no scripts, remote resources or writes.
async function mount(page){
 await loadIsolatedWishesPage(page);
 await page.evaluate(()=>{
  for(const selector of ['#listsDashboard','#listWishCards','.wish-bulk-toolbar']){const el=document.querySelector(selector);if(!el)throw new Error('Missing UI fixture: '+selector);for(let node=el;node&&node!==document.body;node=node.parentElement)node.hidden=false;}
 });
}
test('bulk controls have descriptive accessible names and correct selection scope',async({page})=>{
 await mount(page);
 await expect(page.getByRole('group',{name:'Sammelaktionen für Wünsche'})).toBeVisible();
 await expect(page.getByRole('checkbox',{name:/Angezeigte Wünsche auswählen/})).toBeVisible();
 await expect(page.getByRole('button',{name:'Ausgewählte zur Liste hinzufügen'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Ausgewählte aus Liste entfernen'})).toBeVisible();
});
test('confirmation dialog supports keyboard Escape and focus',async({page})=>{
 await mount(page);
 await page.evaluate(()=>document.getElementById('bulkConfirmDialog').showModal());
 const dialog=page.getByRole('dialog',{name:'Mehrfachaktion prüfen'});
 await expect(dialog).toBeVisible();
 await page.keyboard.press('Tab');
 const focusInside=await page.evaluate(()=>document.getElementById('bulkConfirmDialog').contains(document.activeElement));
 expect(focusInside).toBe(true);
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
 const overflow=await bar.evaluate(el=>{const box=el.getBoundingClientRect();return box.left<0||box.right>window.innerWidth+1});
 expect(overflow).toBe(false);
});
test('bulk results and history are structured and screenreader-readable',async({page})=>{
 await mount(page);
 await expect(page.locator('#bulkResultPanel')).toHaveAttribute('aria-labelledby','bulkResultHeading');
 await expect(page.locator('#bulkHistoryPanel')).toHaveAttribute('aria-labelledby','bulkHistoryHeading');
 await expect(page.locator('#bulkResultSummary')).toHaveAttribute('role','status');
 await expect(page.locator('#bulkHistoryList')).toHaveJSProperty('tagName','OL');
});

test('simulated bulk selection updates selection count and can be cleared',async({page})=>{
 await mount(page);
 await page.evaluate(()=>{
  const list=document.getElementById('listWishCards');
  for(const id of ['a','b']){
   const label=document.createElement('label');
   const check=document.createElement('input');check.type='checkbox';check.dataset.wishId=id;
   label.append(check,document.createTextNode('Wunsch '+id));list.append(label);
  }
  const checks=[...list.querySelectorAll('input')];
  const all=document.getElementById('bulkSelectVisible');
  const count=document.getElementById('bulkSelectedCount');
  const update=()=>{const n=checks.filter(c=>c.checked).length;count.textContent=n+' ausgewählt';all.checked=n===checks.length;all.indeterminate=n>0&&n<checks.length};
  all.addEventListener('change',()=>{checks.forEach(c=>c.checked=all.checked);update()});
  checks.forEach(c=>c.addEventListener('change',update));
  document.getElementById('bulkClear').addEventListener('click',()=>{checks.forEach(c=>c.checked=false);update()});
 });
 await page.getByRole('checkbox',{name:/Angezeigte Wünsche auswählen/}).check();
 await expect(page.locator('#bulkSelectedCount')).toHaveText('2 ausgewählt');
 await page.locator('#bulkClear').click();
 await expect(page.locator('#bulkSelectedCount')).toHaveText('0 ausgewählt');
});
test('simulated loading failure exposes a keyboard-accessible retry control',async({page})=>{
 await mount(page);
 await page.evaluate(()=>{
  const panel=document.getElementById('listItemsFeedback'),retry=document.getElementById('listItemsRetry');
  panel.hidden=false;retry.hidden=false;
  document.getElementById('listItemsFeedbackText').textContent='Laden fehlgeschlagen';
  retry.addEventListener('click',()=>{retry.hidden=true;document.getElementById('listItemsFeedbackText').textContent='Wird erneut geladen'});
 });
 await expect(page.locator('#listItemsFeedback')).toBeVisible();
 await expect(page.locator('#listItemsFeedbackText')).toHaveText('Laden fehlgeschlagen');
 await page.locator('#listItemsRetry').focus();
 await page.keyboard.press('Enter');
 await expect(page.locator('#listItemsFeedbackText')).toHaveText('Wird erneut geladen');
});
test('confirmation cancel does not trigger an action in isolated UI simulation',async({page})=>{
 await mount(page);
 await page.evaluate(()=>{
  window.__testWrites=0;
  const dialog=document.getElementById('bulkConfirmDialog');
  document.getElementById('bulkConfirmCancel').addEventListener('click',()=>dialog.close());
  document.getElementById('bulkConfirmApply').addEventListener('click',()=>{window.__testWrites++;dialog.close()});
  dialog.showModal();
 });
 await page.getByRole('button',{name:'Abbrechen'}).click();
 await expect(page.getByRole('dialog',{name:'Mehrfachaktion prüfen'})).not.toBeVisible();
 expect(await page.evaluate(()=>window.__testWrites)).toBe(0);
});
test('mobile layout at 320 and 375 pixels keeps bulk action buttons inside viewport',async({page})=>{
 for(const width of [320,375]){
  await page.setViewportSize({width,height:700});
  await mount(page);
  await expect(page.locator('.wish-bulk-toolbar')).toBeVisible();
  const outside=await page.locator('.wish-bulk-toolbar button').evaluateAll(buttons=>buttons.filter(el=>{const rect=el.getBoundingClientRect();return rect.width>0&&rect.height>0&&(rect.left<0||rect.right>window.innerWidth+1)}).map(el=>el.id));
  expect(outside).toEqual([]);
 }
});

test('isolated DOM regression: reload clears stale cards, bulk selection and confirmation without writes',async({page})=>{
 await mount(page);
 await page.evaluate(()=>{
  window.__mockSupabase={writes:0};
  const cards=document.getElementById('listWishCards');
  const card=document.createElement('article');card.textContent='Alter Wunsch';cards.append(card);
  document.getElementById('bulkSelectedCount').textContent='1 ausgewählt';
  document.getElementById('bulkResultPanel').hidden=false;
  document.getElementById('bulkConfirmDialog').showModal();
  const reload=()=>{
   cards.replaceChildren();
   document.getElementById('bulkSelectedCount').textContent='0 ausgewählt';
   document.getElementById('bulkResultPanel').hidden=true;
   document.getElementById('bulkConfirmDialog').close();
   document.getElementById('bulkAdd').disabled=true;
   document.getElementById('bulkRemove').disabled=true;
   document.getElementById('listItemsFeedback').hidden=false;
   document.getElementById('listItemsFeedbackText').textContent='Listenzuordnungen konnten nicht vollständig geladen werden.';
  };
  reload();
 });
 await expect(page.locator('#listWishCards article')).toHaveCount(0);
 await expect(page.locator('#bulkSelectedCount')).toHaveText('0 ausgewählt');
 await expect(page.locator('#bulkResultPanel')).toBeHidden();
 await expect(page.locator('#bulkConfirmDialog')).not.toBeVisible();
 await expect(page.locator('#bulkAdd')).toBeDisabled();
 await expect(page.locator('#bulkRemove')).toBeDisabled();
 await expect(page.locator('#listItemsFeedbackText')).toContainText('nicht vollständig geladen');
 expect(await page.evaluate(()=>window.__mockSupabase.writes)).toBe(0);
});
