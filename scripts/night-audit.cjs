'use strict';
// Audit only: reads GitHub metadata and trees; writes one report comment to issue #167.
// No repository mutations, merges, deployments, database calls, or test data.
const https = require('node:https');
const fs = require('node:fs');
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository) || !token) throw Error('Missing GitHub context');
const base = '/repos/' + repository;
function request(method, endpoint, payload) {
  return new Promise((resolve, reject) => {
    const data = payload === undefined ? null : JSON.stringify(payload);
    const req = https.request('https://api.github.com' + endpoint, {
      method, headers: {
        'User-Agent':'helferlein-audit-only',
        'Accept':'application/vnd.github+json',
        'Authorization':'Bearer ' + token,
        'X-GitHub-Api-Version':'2022-11-28',
        ...(data ? {'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)} : {})
      }
    }, res => {
      let body='';
      res.on('data', chunk => { body+=chunk; if(body.length>5_000_000) req.destroy(Error('Response too large')); });
      res.on('end', () => {
        if(res.statusCode<200 || res.statusCode>=300) return reject(Error('GitHub HTTP '+res.statusCode));
        try { resolve(body ? JSON.parse(body) : {}); } catch { reject(Error('Invalid GitHub JSON')); }
      });
    });
    req.setTimeout(20000,()=>req.destroy(Error('GitHub request timeout')));
    req.on('error',reject);
    if(data)req.write(data);
    req.end();
  });
}
const get = endpoint => request('GET',endpoint);
async function pages(endpoint, max=15) {
  const all=[];
  for(let page=1;page<=max;page++) {
    const sep=endpoint.includes('?')?'&':'?';
    const items=await get(endpoint+sep+'per_page=100&page='+page);
    if(!Array.isArray(items))throw Error('Expected GitHub list');
    all.push(...items);
    if(items.length<100)return all;
  }
  throw Error('Pagination limit exceeded for '+endpoint);
}
const escape = value => String(value||'').replace(/[\r\n|]/g,' ').slice(0,120);
const pageFile = path => /(?:^|\/)(?:index\.html|[^/]+\.html)$/.test(path);
async function main() {
  const [branches,prs,releases,commits,runs] = await Promise.all([
    pages(base+'/branches',20),
    pages(base+'/pulls?state=all',20),
    pages(base+'/releases',5),
    get(base+'/commits?sha=main&per_page=30'),
    get(base+'/actions/runs?per_page=60')
  ]);
  const main=branches.find(b=>b.name==='main');
  if(!main)throw Error('main branch missing');
  const mainTree=await get(base+'/git/trees/'+main.commit.sha+'?recursive=1');
  if(mainTree.truncated)throw Error('main tree truncated; no complete page audit possible');
  const mainPages=new Map(mainTree.tree.filter(x=>x.type==='blob'&&pageFile(x.path)).map(x=>[x.path,x.sha]));
  const changed=[], failures=[];
  // Inspect every branch's recursive file tree, not merely its name or latest commit.
  // Small batches bound API concurrency; any missing tree is reported as incomplete.
  for(let i=0;i<branches.length;i+=5) {
    await Promise.all(branches.slice(i,i+5).map(async b=>{
      try {
        const t=b.name==='main'?mainTree:await get(base+'/git/trees/'+b.commit.sha+'?recursive=1');
        if(t.truncated)throw Error('truncated tree');
        const html=t.tree.filter(x=>x.type==='blob'&&pageFile(x.path));
        const changedPages=html.filter(x=>mainPages.get(x.path)!==x.sha).map(x=>x.path);
        const removed=[...mainPages.keys()].filter(x=>!html.some(y=>y.path===x));
        changed.push({name:b.name,sha:b.commit.sha.slice(0,8),total:html.length,changed:changedPages.length,removed:removed.length,samples:changedPages.slice(0,4)});
      } catch(e) {failures.push(b.name+': '+escape(e.message));}
    }));
  }
  changed.sort((a,b)=>a.name.localeCompare(b.name));
  const open=prs.filter(p=>p.state==='open');
  const merged=prs.filter(p=>p.merged_at);
  const recent=merged.filter(p=>Date.parse(p.merged_at)>Date.now()-7*86400000);
  const latest=runs.workflow_runs||[];
  const mainDeploy=latest.find(r=>r.head_branch==='main'&&/pages build and deployment/i.test(r.name)&&r.conclusion==='success');
  const currentDeploy=latest.find(r=>r.head_branch==='main'&&r.head_sha===main.commit.sha&&/pages build and deployment/i.test(r.name));
  const lines=[
    '# Helferlein Nachtschicht-Audit – '+new Date().toISOString().slice(0,10),
    '',
    '**Nur Bestandsaufnahme. Keine Code-, Datenbank- oder Deploymentänderungen.**',
    '',
    '## Release-Nachweis',
    '- main: `'+main.commit.sha+'`',
    '- GitHub Releases: '+releases.length,
    '- Pages für main-HEAD: '+(currentDeploy?escape(currentDeploy.status)+' / '+escape(currentDeploy.conclusion):'kein Lauf in den letzten 60 Workflow-Runs gefunden'),
    '- Letzter beobachteter erfolgreicher Pages-Lauf: '+(mainDeploy?mainDeploy.head_sha.slice(0,8)+' ('+mainDeploy.html_url+')':'nicht in den letzten 60 Läufen gefunden'),
    '- **Hinweis:** Ein Commit auf main ist nicht automatisch als live verifiziert.',
    '',
    '## Branches und Seiten',
    '- Branches: '+branches.length+'; HTML-Seiten/Unterseiten auf main: '+mainPages.size,
    '- Branch-Bäume erfolgreich geprüft: '+changed.length+'; fehlgeschlagen: '+failures.length,
    '',
    '| Branch | Commit | HTML-Seiten | Abweichende/neue Seiten | Auf Branch fehlende main-Seiten | Beispiele |',
    '|---|---|---:|---:|---:|---|',
    ...changed.map(b=>'| `'+escape(b.name)+'` | `'+b.sha+'` | '+b.total+' | '+b.changed+' | '+b.removed+' | '+b.samples.map(escape).join(', ')+' |'),
    '',
    '## Arbeiten und offene Entscheidungen',
    '- Offene PRs: '+open.length+' (Draft: '+open.filter(p=>p.draft).length+')',
    '- In den letzten 7 Tagen gemergte PRs: '+recent.length,
    ...open.slice(0,35).map(p=>'- Offen #'+p.number+(p.draft?' (Draft)':'')+': '+escape(p.title)),
    '',
    '## Jüngste main-Commits',
    ...commits.slice(0,15).map(c=>'- '+c.sha.slice(0,8)+' '+escape(c.commit.message.split('\n')[0])),
    '',
    '## Aktionsplan',
    '1. Für den neuesten main-Commit Pages-Deployment und Live-HTTP-Prüfung bestätigen; nur dann als released kennzeichnen.',
    '2. Offene PRs nach Themen und überlappenden Dateien konsolidieren; nicht automatisch mergen.',
    '3. Fehlgeschlagene CI-Checks und fehlende Browser-/Sicherheitsfreigaben priorisieren.',
    '4. Abweichende Branch-Seiten mit main vergleichen und nur geprüfte Änderungen zur Freigabe vorschlagen.',
    '5. Nächsten Audit-Bericht nach der nächsten geplanten Ausführung erstellen.',
    ...(failures.length?['','## Unvollständig geprüfte Branches',...failures.map(x=>'- '+x)]:[])
  ];
  const report=lines.join('\n');
  console.log(report);
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,report.slice(0,950000)+'\n');
  // GitHub comments have size limits: preserve headline and action plan if report is long.
  const body=report.length<=60000?report:report.slice(0,47000)+'\n\n**Vollständige Branch-Tabelle gekürzt; Details im Workflow-Job-Summary.**\n\n'+lines.slice(lines.indexOf('## Aktionsplan')).join('\n').slice(0,10000);
  await request('POST',base+'/issues/167/comments',{body});
  if(failures.length)process.exitCode=1;
}
main().catch(e=>{console.error('Audit incomplete:',e.message);process.exitCode=1;});
