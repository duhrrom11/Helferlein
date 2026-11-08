/** Small pure validators shared by the browser and Node tests. */
export function normalizeProfileSearch(input) {
 if(typeof input!=='string')return '';
 return input.trim().replace(/[^a-zA-Z0-9äöüÄÖÜß -]/g,'').slice(0,80).trim();
}
export function validateWishFields(title,note) {
 const t=typeof title==='string'?title.trim():'';
 const n=typeof note==='string'?note.trim():'';
 if(!t||t.length>250)throw Error('Produkttitel muss 1 bis 250 Zeichen enthalten');
 if(n.length>500)throw Error('Notiz darf maximal 500 Zeichen enthalten');
 return {title:t,note:n};
}
export function validateHandle(handle) {
 const h=typeof handle==='string'?handle.trim().toLowerCase():'';
 if(!/^[a-z0-9_]{3,30}$/.test(h))throw Error('Benutzername: 3–30 Zeichen, nur a–z, 0–9 und _');
 return h;
}
