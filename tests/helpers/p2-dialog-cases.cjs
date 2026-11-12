'use strict';
const cases = [
  ['haushaltsbuch-kassenbon', 'budgetModal', '⚙️ Budgets anpassen', 'main'],
  ['haushaltsbuch-kassenbon', 'savingsModal', '+ Neues Sparziel', 'main'],
  ['pflanzenpflege-giessplan', 'inventoryModal', '📦 Lager & Nachbestellen', 'more'],
  ['pflanzenpflege-giessplan', 'seedsModal', '🌰 Saatgut', 'more'],
  ['pflanzenpflege-giessplan', 'roiModal', '💰 Garten-ROI', 'more'],
  ['pflanzenpflege-giessplan', 'cisternModal', '🌧️ Zisterne', 'more'],
  ['pflanzenpflege-giessplan', 'beetModal', '🌿 Beet', 'more'],
  ['backform-umrechner', 'cook-modal', '⏱️ Kochmodus & Multi-Timer', 'more'],
  ['zaehlerstaende-erfassen', 'energyTipsModal', '💡 Energiespar-Tipps', 'more'],
  ...['pflanzenpflege-giessplan', 'wg-organisator', 'parkplatz-merker-parkschein-timer', 'verliehene-gegenstaende-verwalten']
    .map(tool => [tool, 'helpModal', null, 'settings'])
].map(([tool, id, name, source]) => ({tool, id, name, source}));

async function openDialog(page, item) {
  if (item.source === 'settings') {
    const settings = page.getByRole('button', {name:'Einstellungen öffnen', exact:true});
    await settings.click();
    await page.locator('.b3-preferences').getByRole('button', {name:/Hilfe/}).click();
    return settings;
  }
  if (item.source === 'more') {
    const summary = page.locator('.b3-more > summary');
    await summary.click();
    await page.locator('.b3-more').getByRole('button', {name:item.name, exact:true}).click();
    return summary;
  }
  const opener = page.getByRole('button', {name:item.name, exact:true});
  await opener.click();
  return opener;
}
module.exports = {cases, openDialog};
