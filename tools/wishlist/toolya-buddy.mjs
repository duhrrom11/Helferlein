const POSE={welcome:'welcome',success:'success',tip:'tip',warning:'error',error:'error','form-error':'error'};
const REQUIRED=new Set(['warning','error','form-error']);
export class ToolyaBuddy {
 constructor({root=document.body,assetBase='./toolya-assets/',character='turquoise',quiet=false}={}){
  this.root=root;this.assetBase=assetBase;this.character=character;this.quiet=quiet;this.queue=[];this.current=null;this.timer=null;this.dialogs=[];
  this.host=document.createElement('aside');this.host.className='toolya-buddy';this.host.setAttribute('aria-label','Toolya-Begleiter');
  this.host.innerHTML='<div class="tb-message-box" hidden><img class="tb-avatar" alt="" aria-hidden="true"><div class="tb-text"><strong class="tb-title"></strong><p class="tb-body"></p><button type="button" class="tb-close">Schließen</button></div></div>';
  root.append(this.host);this.host.querySelector('.tb-close').onclick=()=>this.dismiss();
 }
 image(img,type){if(!['turquoise','purple'].includes(this.character))return;img.hidden=false;img.onerror=()=>{img.hidden=true};img.src=this.assetBase+'toolya_wishlist_'+this.character+'_'+(POSE[type]||'error')+'_1024.png'}
 setCharacter(c){if(!['turquoise','purple'].includes(c))throw Error('Ungültiger Charakter');this.character=c;if(this.current)this.render();for(const d of this.dialogs)this.image(d.img,'warning')}
 setQuiet(q){this.quiet=!!q;if(this.quiet&&this.current&&!REQUIRED.has(this.current.type))this.current=null;this.render()}
 show(type,message){if(!POSE[type]||typeof message!=='string'||!message.trim())return false;if(this.quiet&&!REQUIRED.has(type))return false;const item={type,message};if(this.current&&REQUIRED.has(this.current.type)){this.queue.push(item);return true}this.current=item;this.render();return true}
 render(){clearTimeout(this.timer);const box=this.host.querySelector('.tb-message-box');box.hidden=!this.current;if(!this.current)return;const {type,message}=this.current;this.image(this.host.querySelector('.tb-avatar'),type);this.host.querySelector('.tb-title').textContent=({'welcome':'Willkommen','success':'Geschafft','tip':'Tipp','warning':'Achtung','error':'Fehler','form-error':'Bitte Eingabe prüfen'})[type];this.host.querySelector('.tb-body').textContent=message;this.host.querySelector('.tb-text').setAttribute('role',REQUIRED.has(type)?'alert':'status');if(!REQUIRED.has(type))this.timer=setTimeout(()=>this.dismiss(),type==='tip'?9000:7000)}
 dismiss(){clearTimeout(this.timer);this.current=this.queue.shift()||null;this.render()}
 confirm({message,title='Bitte bestätigen',confirmLabel='Bestätigen',cancelLabel='Abbrechen',danger=false}={}){
  if(!message||typeof message!=='string')return Promise.reject(Error('Bestätigungstext fehlt'));
  return new Promise(resolve=>{
   const previous=document.activeElement,overlay=document.createElement('div');overlay.className='tb-overlay';
   const dialog=document.createElement('div');dialog.className='tb-dialog';dialog.setAttribute('role','alertdialog');dialog.setAttribute('aria-modal','true');
   const img=document.createElement('img');img.className='tb-dialog-avatar';img.alt='';img.setAttribute('aria-hidden','true');this.image(img,'warning');
   const h=document.createElement('h2'),p=document.createElement('p');h.textContent=title;p.textContent=message;
   const id='tb-dialog-'+Math.random().toString(36).slice(2);h.id=id+'-title';p.id=id+'-desc';dialog.setAttribute('aria-labelledby',h.id);dialog.setAttribute('aria-describedby',p.id);
   const cancel=document.createElement('button'),yes=document.createElement('button');cancel.type=yes.type='button';cancel.textContent=cancelLabel;yes.textContent=confirmLabel;if(danger)yes.className='tb-danger';
   dialog.append(img,h,p,cancel,yes);overlay.append(dialog);this.root.append(overlay);
   const entry={img,finish:null};this.dialogs.push(entry);
   const finish=value=>{if(!this.dialogs.includes(entry))return;this.dialogs=this.dialogs.filter(x=>x!==entry);document.removeEventListener('keydown',key,true);overlay.remove();if(previous?.isConnected)previous.focus();resolve(value)};
   entry.finish=finish;
   const key=e=>{if(this.dialogs.at(-1)!==entry)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(false)}else if(e.key==='Tab'){const a=document.activeElement;if(e.shiftKey&&a===cancel){e.preventDefault();yes.focus()}else if(!e.shiftKey&&a===yes){e.preventDefault();cancel.focus()}else if(a!==cancel&&a!==yes){e.preventDefault();cancel.focus()}}};
   cancel.onclick=()=>finish(false);yes.onclick=()=>finish(true);document.addEventListener('keydown',key,true);cancel.focus();
  });
 }
 destroy(){clearTimeout(this.timer);for(const d of [...this.dialogs])d.finish(false);this.host.remove()}
}
