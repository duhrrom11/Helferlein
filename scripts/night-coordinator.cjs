'use strict';
// Helferlein night coordinator. Read-only repository checks; writes only a GitHub issue.
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repo || !token || !/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('Missing GitHub context');
const now = new Date();
const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
}).formatToParts(now).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
const localDay = parts.year + '-' + parts.month + '-' + parts.day;
const hour = Number(parts.hour);
const minute = Number(parts.minute);
const manual = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
// Repository checks run 24/7; retain the 06:00 Berlin morning report.
function apiOnce(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body);
    const req = https.request('https://api.github.com' + endpoint, {
      method, headers: {
        Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'helferlein-night-coordinator',
        ...(data ? {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data)} : {})
      }
    }, res => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; if (raw.length > 2_000_000) req.destroy(new Error('API response too large')); });
      res.on('end', () => {
        let value; try { value = raw ? JSON.parse(raw) : {}; } catch { return reject(new Error('Invalid API JSON')); }
        if (res.statusCode < 200 || res.statusCode >= 300)
          return reject(new Error('GitHub API ' + res.statusCode + ': ' + (value.message || 'unknown')));
        resolve(value);
      });
    });
    // Avoid hanging indefinitely when GitHub's API does not respond.
    req.setTimeout(15000, () => req.destroy(new Error('GitHub API request timed out')));
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}
// Retry only idempotent reads; retrying writes could duplicate reports or lose checkpoints.
async function api(method, endpoint, body) {
  for (let attempt=0; ; attempt++) {
    try { return await apiOnce(method, endpoint, body); }
    catch (e) {
      if (method!=='GET' || attempt>=2 || !/GitHub API (429|502|503|504):|GitHub API request timed out/.test(String(e.message))) throw e;
      await new Promise(resolve=>setTimeout(resolve, 1000 * (attempt+1)));
    }
  }
}
const issueTitle = 'Helferlein Wunschliste – Nachtschicht-Arbeitsstand';
const marker = '<!-- HELFERLEIN_WISHLIST_NIGHT_STATE_V1 -->';
const checks = [
  {id:'wishlist-syntax', label:'Wunschlisten-Module auf Syntax prüfen', run:() => {
    const {spawnSync}=require('node:child_process');
    for(const file of ['amazon-wishlist/app.mjs','amazon-wishlist/amazon-links.mjs','amazon-wishlist/wishlist-utils.mjs']){
      const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8',timeout:30000});
      if(r.status!==0)throw Error(file+': '+(r.stderr||r.stdout||'Syntaxfehler').slice(-450));
    }
    return 'Alle drei Wunschlisten-Module syntaktisch gültig';
  }},
  {id:'wishlist-unit', label:'Wunschlisten-Unit- und Sicherheitsprüfungen', run:() => {
    const {spawnSync}=require('node:child_process');
    const files=fs.readdirSync('amazon-wishlist').filter(f=>f.endsWith('.test.mjs')).sort().map(f=>'amazon-wishlist/'+f);
    if(files.length<3)throw Error('Wunschlisten-Testdateien fehlen');
    const r=spawnSync(process.execPath,['--test',...files],{encoding:'utf8',timeout:90000});
    if(r.status!==0)throw Error((r.stderr||r.stdout||'Wunschlisten-Tests fehlgeschlagen').slice(-450));
    return files.length+' Wunschlisten-Testdateien erfolgreich';
  }},
  {id:'wishlist-public-safety', label:'Wunschlisten-Sicherheitsmarker prüfen', run:() => {
    const app=fs.readFileSync('amazon-wishlist/app.mjs','utf8');
    const html=fs.readFileSync('amazon-wishlist/index.html','utf8');
    if(/service_role|sb_secret_|\\.innerHTML\\s*=|insertAdjacentHTML\\s*\\(/i.test(app+html))
      throw Error('Privilegierter Schlüssel oder unsichere HTML-Injektion erkannt');
    if(!html.includes('öffentlich')||!app.includes('noopener noreferrer sponsored'))
      throw Error('Öffentlichkeitshinweis oder Partnerlink-Schutz fehlt');
    return 'Keine Service-Role-Schlüssel oder direkte HTML-Injektion; Öffentlichkeitshinweis vorhanden';
  }},
  {id:'wishlist-release', label:'Offene Wunschlisten-Freigabepunkte inventarisieren', run:() => {
    const s=fs.readFileSync('amazon-wishlist/50-SCHRITTE.md','utf8');
    const open=(s.match(/- \\[ \\]/g)||[]).length;
    return open+' offene Wunschlisten-Aufgaben (nur Dokumentation; keine Freigabe)';
  }}
];
function encodeState(s) {
  return marker + '\n\x60\x60\x60json\n' + JSON.stringify(s,null,2) + '\n\x60\x60\x60\n' +
    '\nAutomatische Wunschlisten-Nachtschicht: nur amazon-wishlist/ prüfen und Issue-Protokoll. ' +
    'Keine Datenbankänderungen, keine Deployments, keine Code-Commits. ' +
    'Ein Coding-Agent darf ausschließlich über einen separat freigegebenen PR-Prozess arbeiten.\n';
}
function decodeState(body) {
  if (!body || !body.includes(marker)) return null;
  const match=body.match(/\x60\x60\x60json\n([\s\S]*?)\n\x60\x60\x60/);
  if (!match) return null;
  try { const s=JSON.parse(match[1]); return s.version===1 ? s : null; } catch { return null; }
}
async function main() {
  const [owner, name]=repo.split('/');
  const base='/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(name);
  // The repository can have more than 100 open issues. Search all pages
  // instead of silently creating a duplicate checkpoint.
  let issue;
  for (let page=1; page<=20; page++) {
    const issues=await api('GET',base+'/issues?state=open&per_page=100&page='+page);
    issue=issues.find(i=>!i.pull_request && i.title===issueTitle);
    if (issue || issues.length<100) break;
    if (page===20) throw new Error('Issue search exceeded 2000 entries; refusing to create a duplicate checkpoint');
  }
  let state=issue ? decodeState(issue.body) : null;
  // Never overwrite an existing checkpoint when its format is unexpected.
  // A reset would silently lose the handoff between night runs.
  if (issue && (!state || !Number.isSafeInteger(state.cursor) ||
      state.cursor < 0 || !Array.isArray(state.history))) {
    throw new Error('Invalid night checkpoint in issue #' + issue.number + '; manual review required');
  }
  if (!state) state={version:1,day:localDay,cursor:0,history:[],lastReportDay:null};
  if (!issue) issue=await api('POST',base+'/issues',{title:issueTitle,body:encodeState(state)});
  // If GitHub delays or skips the 06:00 run, publish once on the next scheduled run.
  let failedCheck=false;
  let summary='';
  if (hour>=6 && !manual && state.lastReportDay!==localDay) {
    const runs=state.history.filter(x=>x.day===localDay && !x.manual);
    const report='### Morgenbericht '+localDay+' (Europe/Berlin)\n' +
      'Automatische, ausschließlich auf die Wunschliste begrenzte Prüfungen: '+runs.length+'\n' +
      'Erfolgreich: '+runs.filter(x=>x.ok).length+', Auffälligkeiten: '+runs.filter(x=>!x.ok).length+'\n\n' +
      runs.slice(-72).map(x=>'- '+x.time+' · '+x.task+' · '+(x.ok?'OK':'ACHTUNG')+' · '+x.result).join('\n') +
      '\n\n**Keine Produktivänderungen automatisch ausgeführt.** Der Koordinator bearbeitet ausschließlich die Wunschliste und führt keine automatischen Änderungen aus.';
    await api('POST',base+'/issues/'+issue.number+'/comments',{body:report.slice(0,55000)});
    state.lastReportDay=localDay;
    summary='Morgenbericht '+localDay+' veröffentlicht in Issue #'+issue.number;
  } else {
    const task=checks[state.cursor % checks.length];
    let ok=true, result;
    try { result=task.run(); } catch(e) {ok=false;result=String(e.message||e).slice(0,450);}
    const entry={day:localDay,time:parts.hour+':'+parts.minute,task:task.id,ok,result,manual};
    state.history.push(entry);
    state.cursor++;
    failedCheck=!ok;
    summary=entry.time+' '+entry.task+': '+(ok?'OK':'FEHLER')+' – '+result;
    console.log(JSON.stringify(entry));
  }
  state.history=state.history.slice(-100);
  state.day=localDay;
  await api('PATCH',base+'/issues/'+issue.number,{body:encodeState(state)});
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### Helferlein-Koordinator\\n\\n'+summary+'\\n\\n[Status-Issue](https://github.com/'+repo+'/issues/'+issue.number+')\\n');
  if (failedCheck) process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
