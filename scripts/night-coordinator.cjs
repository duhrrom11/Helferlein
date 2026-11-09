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
function api(method, endpoint, body) {
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
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}
const issueTitle = 'Helferlein Nachtbetrieb – dauerhafter Arbeitsstand';
const marker = '<!-- HELFERLEIN_NIGHT_STATE_V1 -->';
const checks = [
  {id:'supabase-migrations', label:'Produktive Supabase-Migrationen inventarisieren', run:() => {
    const dir='supabase/migrations';
    const files=fs.readdirSync(dir).filter(f=>f.endsWith('.sql'));
    return files.length + ' versionierte SQL-Migrationen vorhanden';
  }},
  {id:'release-smoke', label:'Release-Smoke-Prüfung ausführen', run:() => {
    const {spawnSync}=require('node:child_process');
    const r=spawnSync(process.execPath,['scripts/release-smoke.cjs'],{encoding:'utf8',timeout:90000});
    if (r.status!==0) throw new Error((r.stderr||r.stdout||'Smoke check failed').slice(-450));
    return 'Release-Smoke-Prüfung erfolgreich';
  }},
  {id:'vault-gate', label:'Tresor-Freigabesperre überprüfen', run:() => {
    const s=fs.readFileSync('supabase/functions/vault-api/index.ts','utf8');
    if (!s.includes('vault_access_not_configured')) throw new Error('Tresor-API-Gate verändert: manuelle Prüfung nötig');
    return 'Tresor-API weiterhin bewusst nicht freigeschaltet';
  }},
  {id:'wg-auth', label:'WG-Anmelde- und Abmeldeschutz prüfen', run:() => {
    const s=fs.readFileSync('tools/wg-organisator/index.html','utf8');
    if (!s.includes('secureWgDirty') || !s.includes('sessionError')) throw new Error('WG-Schutzmarker fehlen');
    return 'WG-Schutzmechanismen im Code vorhanden (kein Browser-E2E-Test)';
  }},
  {id:'rls-review', label:'RLS-Migrationen auf Vorhandensein prüfen', run:() => {
    const s=fs.readFileSync('supabase/migrations/20261108233000_optimize_user_data_rls.sql','utf8');
    if (!/auth\.uid\(\)/.test(s)) throw new Error('RLS-Migrationsmarker fehlt');
    return 'RLS-Migration vorhanden; Live-Policy nicht erneut geprüft';
  }},
  {id:'acceptance', label:'Offene Produktivabnahme prüfen', run:() => {
    const s=fs.readFileSync('docs/supabase-produktivabnahme.md','utf8');
    const open=(s.match(/- \[ \]/g)||[]).length;
    return open + ' offene dokumentierte Freigabekriterien';
  }}
];
function encodeState(s) {
  return marker + '\n\x60\x60\x60json\n' + JSON.stringify(s,null,2) + '\n\x60\x60\x60\n' +
    '\nAutomatischer 24/7-Koordinator: nur Repository-Prüfungen und Issue-Protokoll. ' +
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
  if (hour===6 && !manual) {
    if (state.lastReportDay===localDay) return console.log('Report already posted');
    const runs=state.history.filter(x=>x.day===localDay);
    const report='### Morgenbericht '+localDay+' (Europe/Berlin)\n' +
      'Automatische, ausschließlich lesende Prüfungen: '+runs.length+'\n' +
      'Erfolgreich: '+runs.filter(x=>x.ok).length+', Auffälligkeiten: '+runs.filter(x=>!x.ok).length+'\n\n' +
      runs.slice(-72).map(x=>'- '+x.time+' · '+x.task+' · '+(x.ok?'OK':'ACHTUNG')+' · '+x.result).join('\n') +
      '\n\n**Keine Produktivänderungen automatisch ausgeführt.** Für Änderungen ist ein gesondert geprüfter Pull Request und die erforderliche Freigabe nötig.';
    await api('POST',base+'/issues/'+issue.number+'/comments',{body:report.slice(0,55000)});
    state.lastReportDay=localDay;
  } else {
    const task=checks[state.cursor % checks.length];
    let ok=true, result;
    try { result=task.run(); } catch(e) {ok=false;result=String(e.message||e).slice(0,450);}
    const entry={day:localDay,time:parts.hour+':'+parts.minute,task:task.id,ok,result};
    state.history.push(entry);
    state.cursor++;
    console.log(JSON.stringify(entry));
  }
  state.history=state.history.slice(-100);
  state.day=localDay;
  await api('PATCH',base+'/issues/'+issue.number,{body:encodeState(state)});
}
main().catch(e=>{console.error(e);process.exitCode=1;});
