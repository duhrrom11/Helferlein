/* Shared binary attachment envelope. The server only receives ciphertext and random object IDs. */
(function(root){
 'use strict';
 const MAX=5*1024*1024;
 async function fileKey(key,usage){if(!/^[a-f0-9]{64}$/.test(key))throw Error('invalid_file');return crypto.subtle.importKey('raw',Uint8Array.from(key.match(/../g),x=>parseInt(x,16)),'AES-GCM',false,usage);}
 function type(bytes){if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return 'image/jpeg';if([137,80,78,71,13,10,26,10].every((x,i)=>bytes[i]===x))return 'image/png';if(new TextDecoder().decode(bytes.slice(0,5))==='%PDF-')return 'application/pdf';throw Error('Bitte wähle eine PDF-Datei oder ein Foto als JPG oder PNG.');}
 async function encrypt(bytes,key){bytes=new Uint8Array(bytes);if(!bytes.length||bytes.length>MAX)throw Error('Bitte wähle eine Datei mit höchstens 5 MB.');type(bytes);const iv=crypto.getRandomValues(new Uint8Array(12));const data=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await fileKey(key,['encrypt']),bytes));const out=new Uint8Array(13+data.length);out[0]=1;out.set(iv,1);out.set(data,13);return out;}
 async function decrypt(buffer,key){const data=new Uint8Array(buffer);if(data.length<30||data.length>MAX+29||data[0]!==1)throw Error('invalid_file');const plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:data.slice(1,13)},await fileKey(key,['decrypt']),data.slice(13)));type(plain);return plain;}
 function safeName(name){return String(name||'Unterlage').replace(/[\\/\u0000-\u001f\u007f]/g,'_').slice(0,180);}
 function save(bytes,name){const url=URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'}));const a=document.createElement('a');a.href=url;a.download=safeName(name);a.rel='noopener';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 root.EstateFiles={MAX,type,encrypt,decrypt,safeName,save};
 if(typeof module!=='undefined')module.exports=root.EstateFiles;
})(globalThis);
