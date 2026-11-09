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

/** Enforce the public profile limits before sending data to Supabase. */
export function validateProfileFields(displayName,bio) {
 const display_name=typeof displayName==='string'?displayName.trim():'';
 const description=typeof bio==='string'?bio.trim():'';
 if(!display_name||display_name.length>80)throw Error('Profilname muss 1 bis 80 Zeichen enthalten');
 if(description.length>500)throw Error('Profilbeschreibung darf maximal 500 Zeichen enthalten');
 return {display_name,bio:description};
}

/** Fetch one lookahead row to know whether another feed page exists. */
export function feedPage(rows,pageSize=20) {
 if(!Array.isArray(rows)||!Number.isInteger(pageSize)||pageSize<1)throw Error('Ungültige Feed-Seite');
 return {items:rows.slice(0,pageSize),hasMore:rows.length>pageSize};
}

/** Reject empty credentials before invoking the remote auth endpoint. */
export function validateCredentials(email,password) {
 const address=typeof email==='string'?email.trim():'';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)||address.length>254)throw Error('Bitte eine gültige E-Mail-Adresse eingeben');
 if(typeof password!=='string'||password.length<8)throw Error('Passwort muss mindestens 8 Zeichen enthalten');
 return {email:address,password};
}
