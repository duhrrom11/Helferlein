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
 global.HelferleinSafe=Object.freeze({html,photo});
})(window);
