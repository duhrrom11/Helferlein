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

export function validatePriority(input) {
 const value=Number(input);
 if(![1,2,3].includes(value))throw Error('Ungültige Priorität');
 return value;
}

/** Preserve unrelated query parameters when switching a public profile view. */
export function profilePageUrl(currentUrl,handle=null) {
 const url=new URL(currentUrl);
 url.searchParams.delete('profile');
 if(handle!==null){url.searchParams.delete('url');url.searchParams.set('profile',validateHandle(handle));}
 return url.toString();
}

/** Only a uniqueness race should trigger a retry after a product insert fails. */
export function isUniqueViolation(error) {
 return error?.code==='23505';
}

/** Normalize a deep-linked profile handle; reject malformed values safely. */
export function requestedProfileHandle(value) {
 if(typeof value!=='string')return null;
 try{return validateHandle(value)}catch{return null}
}
