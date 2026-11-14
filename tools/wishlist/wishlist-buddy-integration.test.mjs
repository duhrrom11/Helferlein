// Ausführen: node --test tools/wishlist/wishlist-buddy-integration.test.mjs
// Statische Regressionstests für den echten App-Einstiegspunkt, ohne Datenbankzugriff.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const buddy=readFileSync(new URL('./toolya-buddy.mjs',import.meta.url),'utf8');
test('ToolyaBuddy wird in der echten Wunschliste importiert',()=>assert.match(app,/import\s*\{ToolyaBuddy\}\s*from\s*['"]\.\/toolya-buddy\.mjs['"]/));
test('ToolyaBuddy wird im Wunschlisten-Einstiegspunkt erstellt',()=>assert.match(app,/new ToolyaBuddy\(\{root:/));
test('Stylesheet ist in der Wunschliste eingebunden',()=>assert.match(html,/toolya-buddy\.css/));
test('Login meldet Willkommen',()=>assert.match(app,/buddyNotice\('welcome','Willkommen zurück!'\)/));
test('Speicherfehler werden als Formularfehler gemeldet',()=>assert.match(app,/buddyNotice\(isWishSave\?'form-error':'error',message\)/));
test('Cloud-Import verlangt ausdrückliche Bestätigung',()=>assert.match(app,/toolyaBuddy\.confirm\(\{title:'Cloud-Import bestätigen'/));
test('Cloud-Überschreiben verlangt ausdrückliche Bestätigung',()=>assert.match(app,/toolyaBuddy\.confirm\(\{title:'Cloud-Daten überschreiben\?'/));
test('Bestätigungsdialog blockiert konkurrierende und zerstörte Dialoge ohne offene Promise',()=>assert.match(buddy,/if\(this\.destroyed\|\|this\.dialogs\.length\)\{resolve\(false\);return;\}/));

test('Speichermeldungen werden über den gemeinsamen Mapper erzeugt',()=>assert.match(app,/wishSaveOutcome\(\{editing:true,extrasSaved\}\)/));
test('Neue Wünsche verwenden den gemeinsamen Mapper',()=>assert.match(app,/wishSaveOutcome\(\{extrasSaved,assignmentError:!!assignmentError\}\)/));
