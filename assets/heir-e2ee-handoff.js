/* Local-only, explicitly irreversible encrypted estate handoff. No network requests. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const enc = new TextEncoder(), dec = new TextDecoder('utf-8', {fatal:true});
  const MAX = 5 * 1024 * 1024;
  const B64 = bytes => btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
  const unb64 = value => {
    if (typeof value !== 'string' || value.length > 8_000_000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw Error('Ungültiges Dateiformat.');
    return Uint8Array.from(atob(value), c => c.charCodeAt(0));
  };
  const download = (name, data) => {
    const blob = new Blob([JSON.stringify(data)], {type:'application/json'});
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  const read = async file => {
    if (!file || file.size > MAX || file.size < 2) throw Error('Datei fehlt oder ist zu groß (max. 5 MB).');
    return JSON.parse(await file.text());
  };
  const show = (id, message) => { $(id).textContent = message; };
  const validPublic = obj => obj && obj.kind === 'helferlein-heir-public-key' && obj.version === 1 &&
    obj.algorithm === 'RSA-OAEP-3072-SHA256' && obj.publicKey?.kty === 'RSA' &&
    obj.publicKey?.alg === 'RSA-OAEP-256' && obj.publicKey?.key_ops?.includes('encrypt') &&
    typeof obj.publicKey.n === 'string' && obj.publicKey.n.length >= 500 && obj.publicKey.n.length < 1500 &&
    obj.publicKey.e === 'AQAB';
  $('createKey').addEventListener('click', async () => {
    $('createKey').disabled = true;
    try {
      const pair = await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:3072,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);
      const publicKey = await crypto.subtle.exportKey('jwk',pair.publicKey);
      const privateKey = await crypto.subtle.exportKey('jwk',pair.privateKey);
      download('helferlein-erbe-privatschluessel-GEHEIM.json',{kind:'helferlein-heir-private-key',version:1,algorithm:'RSA-OAEP-3072-SHA256',privateKey});
      download('helferlein-erbe-oeffentlicher-schluessel.json',{kind:'helferlein-heir-public-key',version:1,algorithm:'RSA-OAEP-3072-SHA256',publicKey});
      show('keyStatus','Zwei Dateien erstellt. Nur den öffentlichen Schlüssel an den Nachlassbesitzer geben. Den Privatschlüssel geheim und sicher aufbewahren; bei Verlust sind damit verschlüsselte Übergaben nicht mehr lesbar.');
    } catch { show('keyStatus','Schlüsselerstellung fehlgeschlagen.'); }
    finally { $('createKey').disabled = false; }
  });
  $('exportEstate').addEventListener('click', async () => {
    $('exportEstate').disabled = true;
    try {
      if (!$('confirmRelease').checked) throw Error('Bitte die unwiderrufliche Übergabe ausdrücklich bestätigen.');
      const recipient = await read($('publicKeyFile').files[0]);
      if (!validPublic(recipient)) throw Error('Ungültiger öffentlicher Erbenschlüssel.');
      const publicKey = await crypto.subtle.importKey('jwk',recipient.publicKey,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
      const raw = localStorage.getItem('digital_estate_vault');
      if (!raw || raw.length > MAX) throw Error('Kein geeigneter lokaler Tresor vorhanden.');
      const cfg = JSON.parse(raw);
      if (!/^[a-f0-9]{64}$/i.test(cfg.masterKeyHex || '') ||
          typeof cfg.encryptedData?.iv !== 'string' || typeof cfg.encryptedData?.ciphertext !== 'string')
        throw Error('Lokaler Tresor unvollständig.');
      const masterBytes = Uint8Array.from(cfg.masterKeyHex.match(/.{2}/g), x => parseInt(x,16));
      const master = await crypto.subtle.importKey('raw',masterBytes,{name:'AES-GCM'},false,['decrypt']);
      masterBytes.fill(0);
      const plaintext = await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(cfg.encryptedData.iv)},master,unb64(cfg.encryptedData.ciphertext));
      const vault = JSON.parse(dec.decode(plaintext));
      if (!Array.isArray(vault.entries)) throw Error('Tresorinhalt ungültig.');
      const payload = enc.encode(JSON.stringify({version:1,createdAt:new Date().toISOString(),entries:vault.entries}));
      if (payload.length > MAX) throw Error('Nachlass zu groß für diese Übergabe.');
      const aes = await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv},aes,payload);
      const rawAes = new Uint8Array(await crypto.subtle.exportKey('raw',aes));
      const wrapped = await crypto.subtle.encrypt({name:'RSA-OAEP'},publicKey,rawAes);
      rawAes.fill(0);
      download('helferlein-nachlass-fuer-erbe-verschluesselt.json',{
        kind:'helferlein-heir-estate-package',version:1,algorithm:'RSA-OAEP-3072-SHA256+AES-256-GCM',
        iv:B64(iv),wrappedKey:B64(new Uint8Array(wrapped)),ciphertext:B64(new Uint8Array(ciphertext))
      });
      show('exportStatus','Verschlüsseltes Nachlasspaket erstellt. Nur der passende private Erbenschlüssel kann es öffnen. Bereits übergebene Kopien lassen sich später nicht zurückrufen.');
    } catch(e) { show('exportStatus',e instanceof Error?e.message:'Übergabe fehlgeschlagen.'); }
    finally { $('exportEstate').disabled = false; }
  });
  $('openEstate').addEventListener('click', async () => {
    $('openEstate').disabled = true;
    $('estateOutput').replaceChildren();
    try {
      const secret = await read($('privateKeyFile').files[0]);
      const pkg = await read($('estateFile').files[0]);
      if (secret?.kind !== 'helferlein-heir-private-key' || secret.version !== 1 ||
          secret.algorithm !== 'RSA-OAEP-3072-SHA256' || secret.privateKey?.kty !== 'RSA' ||
          pkg?.kind !== 'helferlein-heir-estate-package' || pkg.version !== 1 ||
          pkg.algorithm !== 'RSA-OAEP-3072-SHA256+AES-256-GCM')
        throw Error('Schlüssel oder Nachlassdatei haben ein ungültiges Format.');
      const privateKey = await crypto.subtle.importKey('jwk',secret.privateKey,{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']);
      const wrapped = unb64(pkg.wrappedKey), iv = unb64(pkg.iv), ciphertext = unb64(pkg.ciphertext);
      if (wrapped.length !== 384 || iv.length !== 12 || ciphertext.length > MAX) throw Error('Ungültiges Paket.');
      const rawKey = new Uint8Array(await crypto.subtle.decrypt({name:'RSA-OAEP'},privateKey,wrapped));
      if (rawKey.length !== 32) throw Error('Ungültiger Schlüssel.');
      const aes = await crypto.subtle.importKey('raw',rawKey,{name:'AES-GCM'},false,['decrypt']);
      rawKey.fill(0);
      const plaintext = await crypto.subtle.decrypt({name:'AES-GCM',iv},aes,ciphertext);
      const vault = JSON.parse(dec.decode(plaintext));
      if (vault.version !== 1 || !Array.isArray(vault.entries)) throw Error('Nachlassinhalt ungültig.');
      // Show text only; never inject untrusted estate contents as HTML.
      const pre = document.createElement('pre');
      pre.className = 'whitespace-pre-wrap break-words text-sm bg-slate-950 p-4 rounded-xl max-h-96 overflow-auto';
      pre.textContent = JSON.stringify(vault.entries,null,2);
      $('estateOutput').append(pre);
      show('openStatus','Nachlass lokal entschlüsselt. Die Daten werden nicht in Supabase gespeichert.');
    } catch { show('openStatus','Entschlüsselung fehlgeschlagen. Bitte passenden privaten Schlüssel und Nachlassdatei prüfen.'); }
    finally { $('openEstate').disabled = false; }
  });
  window.addEventListener('pagehide',() => $('estateOutput').replaceChildren());
})();
