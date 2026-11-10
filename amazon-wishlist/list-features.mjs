export const LIST_TEMPLATES=Object.freeze([
 {id:'birthday',title:'Mein Geburtstag',description:'Alles, was ich mir zum Geburtstag wünsche.',icon:'🎂',color:'#E883A7'},
 {id:'christmas',title:'Weihnachtswünsche',description:'Geschenkideen für Weihnachten.',icon:'🎄',color:'#4EAA9D'},
 {id:'gaming',title:'Mein Gaming-Setup',description:'Spiele, Zubehör und Technik für mein Setup.',icon:'🎮',color:'#9D78E8'},
 {id:'home',title:'Meine Traumwohnung',description:'Einrichtung, Deko und praktische Helfer.',icon:'🏡',color:'#E7A94D'},
 {id:'travel',title:'Reisewünsche',description:'Ausrüstung und Ideen für meine nächste Reise.',icon:'✈️',color:'#5E8BD6'},
 {id:'books',title:'Bücher & Inspiration',description:'Lesestoff und kreative Entdeckungen.',icon:'📚',color:'#9D78E8'},
 {id:'custom',title:'Meine Wunschliste',description:'',icon:'🎁',color:'#9D78E8'}
]);
export function filterListWishes(items,{search='',priority='all',assignment='all',assignedIds=new Set(),sort='newest'}={}){
 const term=search.trim().toLocaleLowerCase('de');
 return items.filter(w=>(assignment==='all'||(assignment==='assigned')===assignedIds.has(w.id))&&(priority==='all'||String(w.priority)===priority)&&(!term||[w.wishlist_products?.title,w.note].some(v=>String(v||'').toLocaleLowerCase('de').includes(term)))).sort((a,b)=>sort==='priority'?(a.priority-b.priority)||String(b.created_at).localeCompare(String(a.created_at)):String(b.created_at).localeCompare(String(a.created_at)));
}
