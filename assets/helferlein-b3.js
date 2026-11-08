/* Helferlein B3 pilot – presentation only. Never touches tool records or Supabase. */
(() => {
  'use strict';
  const THEME_KEY = 'helferlein_ui_theme_v1';
  const LAYOUT_KEY = 'helferlein_ui_layout_pflanzen_v1';
  const definitions = [
    {id:'actions',name:'Werkzeuge & Schnellzugriff',size:'l',locked:true},
    {id:'stats',name:'Pflanzen-Statistiken',size:'l'},
    {id:'calendar',name:'Garten-Saisonkalender',size:'m'},
    {id:'create',name:'Pflanze erfassen',size:'l'},
    {id:'plants',name:'Pflanzenliste & Filter',size:'l'},
    {id:'recommendations',name:'Empfehlungen',size:'m'}
  ];
  const clone = x => JSON.parse(JSON.stringify(x));
  const defaults = () => definitions.map((d,i)=>({id:d.id,visible:true,size:d.size,order:i}));
  const safeRead = (key) => { try{return localStorage.getItem(key)}catch{return null} };
  const safeWrite = (key,value) => {try{localStorage.setItem(key,value);return true}catch{return false}};
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let theme = safeRead(THEME_KEY) || 'auto';
  if(!['light','dark','auto'].includes(theme))theme='auto';
  function applyTheme(){
    const dark=theme==='dark'||(theme==='auto'&&media.matches);
    document.body.classList.toggle('b3-dark',dark);
    document.documentElement.style.colorScheme=dark?'dark':'light';
    document.querySelectorAll('[data-b3-theme]').forEach(el=>{el.value=theme});
  }
  function loadLayout(){
    try{
      const raw=JSON.parse(safeRead(LAYOUT_KEY)||'null');
      if(!Array.isArray(raw))return defaults();
      const byId=new Map(raw.map(x=>[x?.id,x]));
      return defaults().map((d,i)=>{
        const saved=byId.get(d.id)||{};
        const spec=definitions[i];
        return {id:d.id,visible:spec.locked?true:saved.visible!==false,size:['s','m','l'].includes(saved.size)?saved.size:d.size,order:Number.isInteger(saved.order)&&saved.order>=0&&saved.order<100? saved.order:i};
      }).sort((a,b)=>a.order-b.order).map((x,i)=>({...x,order:i}));
    }catch{return defaults()}
  }
  let layout=loadLayout(),draft=null;
  function renderLayout(data){
    data.forEach((x,i)=>{
      const el=document.querySelector('[data-b3-panel="'+x.id+'"]');
      if(!el)return;
      el.dataset.b3Size=x.size;
      el.dataset.b3Hidden=String(!x.visible);
      el.style.setProperty('--b3-order',String(i));
    });
  }
  function create(tag,attrs={},content=''){
    const e=document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{if(k==='class')e.className=v;else e.setAttribute(k,v)});
    if(content)e.textContent=content;
    return e;
  }
  function button(label,handler,secondary=false){
    const b=create('button',{type:'button',class:'b3-action'+(secondary?' b3-outline':'')},label);
    b.addEventListener('click',handler);
    return b;
  }
  function editorRender(host){
    host.replaceChildren(create('h2',{},'Dashboard bearbeiten'));
    host.append(create('p',{class:'text-sm'},'Bereiche sortieren, ein- oder ausblenden und die Größe S / M / L wählen. Änderungen gelten nur für dieses Tool.'));
    const list=create('div',{class:'b3-editor-list'});
    draft.forEach((entry,i)=>{
      const spec=definitions.find(d=>d.id===entry.id);
      const row=create('div',{class:'b3-editor-row'});
      row.append(create('strong',{},spec.name));
      const up=button('↑',()=>move(i,-1),true);up.disabled=i===0;up.setAttribute('aria-label',spec.name+' nach oben');
      const down=button('↓',()=>move(i,1),true);down.disabled=i===draft.length-1;down.setAttribute('aria-label',spec.name+' nach unten');
      row.append(up,down);
      const vis=create('label');
      const check=create('input',{type:'checkbox','aria-label':spec.name+' sichtbar'});
      check.checked=entry.visible;check.disabled=!!spec.locked;
      check.addEventListener('change',()=>{entry.visible=check.checked;renderLayout(draft)});
      vis.append(check,document.createTextNode('Sichtbar'));row.append(vis);
      const size=create('select',{'aria-label':'Größe: '+spec.name});
      for(const val of ['s','m','l']){
        const opt=create('option',{value:val},val.toUpperCase());size.append(opt);
      }
      size.value=entry.size;size.addEventListener('change',()=>{entry.size=size.value;renderLayout(draft)});
      row.append(size);list.append(row);
    });
    host.append(list);
    const actions=create('div',{class:'flex flex-wrap gap-2'});
    actions.append(button('Speichern',()=>{
      if(!safeWrite(LAYOUT_KEY,JSON.stringify(draft))){window.alert('Layout konnte nicht gespeichert werden. Bitte Browser-Speicher prüfen.');return}
      layout=clone(draft);closeEditor(host);
    }),button('Abbrechen',()=>{renderLayout(layout);closeEditor(host)},true),button('Standardlayout',()=>{
      draft=defaults();renderLayout(draft);editorRender(host);
    },true));
    host.append(actions);
  }
  function move(i,delta){
    const j=i+delta;if(j<0||j>=draft.length)return;
    [draft[i],draft[j]]=[draft[j],draft[i]];
    draft.forEach((x,k)=>x.order=k);
    renderLayout(draft);editorRender(document.getElementById('b3-editor'));
  }
  function closeEditor(host){
    draft=null;host.hidden=true;host.replaceChildren();
    const btn=document.getElementById('b3-edit-open');if(btn){btn.disabled=false;btn.focus()}
  }
  function init(){
    document.body.classList.add('b3');
    applyTheme();
    const main=document.getElementById('main-content');if(!main)return;
    main.classList.add('b3-dashboard');
    const targets={
      actions:main.querySelector('[data-b3-panel="actions"]'),
      stats:main.querySelector('[data-b3-panel="stats"]'),
      calendar:main.querySelector('[data-b3-panel="calendar"]'),
      create:main.querySelector('[data-b3-panel="create"]'),
      plants:main.querySelector('[data-b3-panel="plants"]'),
      recommendations:main.querySelector('[data-b3-panel="recommendations"]')
    };
    if(Object.values(targets).some(v=>!v)){console.warn('B3: Layout-Abschnitte unvollständig; Editor nicht gestartet');return}
    const shell=create('div',{class:'b3-shell'});
    const nav=create('nav',{class:'b3-nav','aria-label':'Pflanzenpflege Navigation'});
    const links=[['🌱','Übersicht','#main-content'],['📊','Statistiken','#b3-stats'],['📅','Gießplan','#b3-calendar'],['➕','Pflanze erfassen','#b3-create'],['🪴','Meine Pflanzen','#b3-plants']];
    links.forEach(([icon,label,href])=>{const a=create('a',{href},icon+' '+label);nav.append(a)});
    main.parentNode.insertBefore(shell,main);shell.append(nav,main);
    const toolbar=create('div',{class:'b3-edit-toolbar'});
    toolbar.append(create('strong',{},'Meine Pflanzenpflege'));
    const edit=button('✎ Dashboard bearbeiten',()=>{
      draft=clone(layout);
      const host=document.getElementById('b3-editor');host.hidden=false;
      edit.disabled=true;editorRender(host);renderLayout(draft);
      host.scrollIntoView({block:'nearest',behavior:'smooth'});
    },true);
    edit.id='b3-edit-open';toolbar.append(edit);
    const label=create('label',{class:'text-sm'},'Design: ');
    const select=create('select',{'aria-label':'Globaler Designmodus','data-b3-theme':'true',class:'rounded-lg border p-2 text-sm'});
    [['auto','Automatisch'],['light','Hell'],['dark','Dunkel']].forEach(([value,name])=>select.append(create('option',{value},name)));
    select.value=theme;select.addEventListener('change',()=>{theme=select.value;if(!safeWrite(THEME_KEY,theme))window.alert('Designmodus konnte nicht gespeichert werden');applyTheme()});
    label.append(select);toolbar.append(label);
    const editor=create('section',{id:'b3-editor',class:'b3-editor','aria-label':'Dashboard bearbeiten'});editor.hidden=true;
    main.prepend(editor);main.prepend(toolbar);
    renderLayout(layout);
    const mobile=create('nav',{class:'b3-mobile-nav','aria-label':'Mobile Pflanzenpflege-Navigation'});
    [['🏠','Übersicht','#main-content'],['🌱','Pflanzen','#b3-plants'],['📅','Gießplan','#b3-calendar'],['✎','Bearbeiten','#b3-editor']].forEach(([icon,label,href])=>{
      const a=create('a',{href});a.append(create('span',{},icon),document.createTextNode(label));
      if(label==='Bearbeiten')a.addEventListener('click',ev=>{ev.preventDefault();if(!draft)edit.click();else editor.scrollIntoView()});
      mobile.append(a);
    });
    document.body.append(mobile);
    let lastY=window.scrollY;
    window.addEventListener('scroll',()=>{
      const y=window.scrollY,delta=y-lastY;
      if(Math.abs(delta)>7){mobile.classList.toggle('b3-scrolled-away',delta>0&&y>140);lastY=y}
    },{passive:true});
    mobile.addEventListener('focusin',()=>mobile.classList.remove('b3-scrolled-away'));
    media.addEventListener?.('change',applyTheme);
    window.addEventListener('storage',e=>{
      if(e.key===THEME_KEY){theme=['light','dark','auto'].includes(e.newValue)?e.newValue:'auto';applyTheme()}
      if(e.key===LAYOUT_KEY&&!draft){layout=loadLayout();renderLayout(layout)}
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
