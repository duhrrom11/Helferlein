import test from 'node:test';
import assert from 'node:assert/strict';
import {wishSaveOutcome} from './wish-save-outcome.mjs';

// Simulierte Supabase-Speicherantworten; kein Netzwerk und keine Datenänderungen.
async function simulatedSave({editing=false,dbError=null,extrasSaved=true,assignmentError=false}={}){
 const response=await Promise.resolve(dbError?{data:null,error:dbError}:{data:{id:'mock-wish'},error:null});
 if(response.error)throw response.error;
 return wishSaveOutcome({editing,extrasSaved,assignmentError});
}
test('Neue Speicherung vollständig erfolgreich',async()=>{const result=await simulatedSave();assert.equal(result.type,'success');assert.match(result.message,/Wunsch gespeichert/)});
test('Neue Speicherung mit fehlgeschlagenem lokalem Zusatzspeicher',async()=>{const result=await simulatedSave({extrasSaved:false});assert.equal(result.type,'warning');assert.match(result.message,/nicht erneut anlegen/)});
test('Neue Speicherung mit fehlgeschlagener Listenzuordnung',async()=>{const result=await simulatedSave({assignmentError:true});assert.equal(result.type,'warning');assert.match(result.message,/Listenzuordnung/)});
test('Beide Teilfehler werden genannt',async()=>{const result=await simulatedSave({assignmentError:true,extrasSaved:false});assert.equal(result.type,'warning');assert.match(result.message,/Listenzuordnung/);assert.match(result.message,/Zusatzdaten/)});
test('Bearbeitung erfolgreich',async()=>{const result=await simulatedSave({editing:true});assert.equal(result.type,'success');assert.match(result.message,/aktualisiert/)});
test('Bearbeitung mit lokalem Speicherfehler',async()=>{const result=await simulatedSave({editing:true,extrasSaved:false});assert.equal(result.type,'warning');assert.match(result.message,/nicht erneut anlegen/)});
test('Datenbankfehler wird nicht als Erfolg angezeigt',async()=>{await assert.rejects(simulatedSave({dbError:new Error('Mock DB Fehler')}),/Mock DB Fehler/)});
test('Fehlende Extras-Rückmeldung wird abgelehnt',()=>assert.throws(()=>wishSaveOutcome(),TypeError));
