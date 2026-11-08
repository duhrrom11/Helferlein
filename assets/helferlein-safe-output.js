/* Shared strict output helpers for HTML templates (no external dependency).
   Strings must be escaped on insertion into HTML; never use these as a
   substitute for per-user server-side authorization. */
(function(global){
 'use strict';
 const ENTITIES=Object.freeze({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'});
 function html(value){
   return String(value==null?'':value).replace(/[&<>"']/g,c=>ENTITIES[c]);
 }
 // Images are stored as camera-generated base64 data URLs or are trusted
 // HTTP(S) links. Reject active content (SVG, javascript:, file:, etc).
 function photo(value){
   if(typeof value!=='string')return '';
   const x=value.trim();
   if(/^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(x))return x;
   if(/^blob:https?:\/\/[^\s"'<>]+$/i.test(x))return x.replace(/&/g,'&amp;');
   try{
     const url=new URL(x,window.location.href);
     if(!['http:','https:'].includes(url.protocol))return '';
     if(/[<>"'\x00-\x1f]/.test(x))return '';
     return url.href.replace(/&/g,'&amp;');
   }catch{return ''}
 }
 // Escape a value for use as a standalone argument inside an HTML onclick.
 // JSON.stringify protects JavaScript quoting; html() protects the attribute.
 function jsArg(value){
   const json=JSON.stringify(String(value==null?'':value))
     .replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
   return html(json);
 }
 function tel(value){
   const number=String(value==null?'':value).replace(/[^0-9+]/g,'');
   return number.startsWith('+')?'+'+number.slice(1).replace(/\+/g,''):number.replace(/\+/g,'');
 }
 // Validated numeric identifiers for legacy inline action handlers. Do not
 // concatenate raw stored IDs into JavaScript or HTML event attributes.
 function numericId(value){
   if(typeof value!=='number' && typeof value!=='string')return -1;
   if(typeof value==='string' && !/^(?:0|[1-9][0-9]*)$/.test(value))return -1;
   const number=Number(value);
   return Number.isSafeInteger(number) && number>=0?number:-1;
 }
 global.HelferleinSafe=Object.freeze({html,photo,jsArg,tel,numericId});
})(window);
