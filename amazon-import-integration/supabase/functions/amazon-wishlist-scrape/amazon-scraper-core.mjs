// Shared, dependency-free Amazon.de wishlist parsing. No login, bypass or proxies.
const ASIN = /^[A-Z0-9]{10}$/;
const decodeEntities = value => String(value || '').replace(/&#(x[0-9a-f]+|\d+);/gi, (_,n)=>{const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return code>0&&code<=0x10ffff?String.fromCodePoint(code):'';}).replace(/&(?:amp|#38);/gi,'&').replace(/&(?:quot|#34);/gi,'\"').replace(/&(?:apos|#39);/gi,"'").replace(/&nbsp;/gi,' ');
const htmlText = value => decodeEntities(String(value || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
export class ScrapeError extends Error { constructor(code, message) { super(message); this.name='ScrapeError'; this.code=code; } }
export function normalizeWishlistUrl(raw) {
  if (typeof raw !== 'string' || raw.length > 2048 || /[\x00-\x20\x7f\\]/.test(raw)) throw new ScrapeError('INVALID_URL','Ungültige Listenadresse.');
  let url; try { url = new URL(raw); } catch { throw new ScrapeError('INVALID_URL','Ungültige Listenadresse.'); }
  if (url.protocol !== 'https:' || !['www.amazon.de','amazon.de','m.amazon.de'].includes(url.hostname.toLowerCase()) || url.username || url.password || url.port) throw new ScrapeError('INVALID_URL','Nur HTTPS-Wunschlisten von Amazon.de sind erlaubt.');
  const match = url.pathname.match(/^\/(?:hz\/wishlist\/ls|gp\/registry\/wishlist)\/([A-Z0-9]{8,40})(?:\/|$)/i);
  if (!match) throw new ScrapeError('INVALID_URL','Bitte einen Amazon.de-Wunschlistenlink verwenden.');
  return `https://www.amazon.de/hz/wishlist/ls/${match[1].toUpperCase()}`;
}
// Parse only wishlist item containers, never unrelated recommendation links.
const attr=(tag,name)=>{const m=tag.match(new RegExp(`(?:\\s|^)${name}\\s*=\\s*([\"'])([\\s\\S]*?)\\1`,'i'));return m?.[2]||null;};
const itemStart=/<(?:li|div)\b(?=[^>]{0,4000}\b(?:data-itemid|data-id|data-asin)\s*=\s*["'][^"']+["'])[^>]{0,4000}>/gi;
const productHref=/(?:href|data-href)\s*=\s*["']([^"']+)["']/gi;
const asinFromProductLinks=chunk=>{for(const match of chunk.matchAll(productHref)){try{const u=new URL(decodeEntities(match[1]),'https://www.amazon.de');if(u.protocol!=='https:'||!['amazon.de','www.amazon.de','m.amazon.de'].includes(u.hostname)||u.username||u.password||u.port)continue;const found=u.pathname.match(/^\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i);if(found)return found[1].toUpperCase();}catch{}}return null;};
const validImage=url=>{try{const u=new URL(url);return u.protocol==='https:'&&['m.media-amazon.com','images-na.ssl-images-amazon.com','images-eu.ssl-images-amazon.com','images.ssl-images-amazon.com'].includes(u.hostname)?u.href:null}catch{return null}};
export function parseWishlistPage(html,maxProducts=100,currentPage=1,expectedWishlistId=null){
 if(typeof html!=='string'||html.length>1500000)throw new ScrapeError('BAD_RESPONSE','Amazon-Antwort ist zu groß.');
 if(/captcha|enter the characters you see|robot check|automatisierte zugriffe/i.test(html.slice(0,150000)))throw new ScrapeError('BLOCKED','Amazon fordert eine zusätzliche Prüfung.');
 const found=new Map();const starts=[...html.matchAll(itemStart)];
 for(let i=0;i<starts.length&&found.size<maxProducts;i++){
  const start=starts[i];const tag=start[0];
  const chunk=html.slice(start.index,Math.min(html.length,start.index+24000,starts[i+1]?.index??html.length));
  const fromAttr=(attr(tag,'data-asin')||'').toUpperCase();
  const fromHref=asinFromProductLinks(chunk);
  const asin=ASIN.test(fromAttr)?fromAttr:fromHref;
  if(!ASIN.test(asin||'')||found.has(asin))continue;
  const titleMatch=chunk.match(/<(?:a|span|h2)\b[^>]{0,1200}(?:id|class)\s*=\s*["'][^"']*(?:itemName|item-name|product-title|a-size-base-plus)[^"']*["'][^>]*>([\s\S]{1,3000}?)<\/(?:a|span|h2)>/i);
  const title=Array.from(htmlText(titleMatch?.[1]||'')).slice(0,250).join('');if(!title||/[\u0000-\u001f\u007f]/.test(title))continue;
  const imgTag=chunk.match(/<img\b[^>]{0,2500}>/i)?.[0]||'';
  const imageUrl=validImage(decodeEntities(attr(imgTag,'data-src')||attr(imgTag,'src')||''));
  const priceMatch=chunk.match(/<(?:span|div)\b[^>]{0,1000}(?:a-price-whole|itemPrice)[^>]*>([\s\S]{1,120}?)<\/(?:span|div)>/i);
  const priceText=htmlText(priceMatch?.[1]||'').match(/[\d.,]+/)?.[0]||null;
  found.set(asin,{asin,marketplace:'amazon.de',title,productUrl:`https://www.amazon.de/dp/${asin}`,imageUrl,priceText});
 }
 // Pagination links must explicitly point to the same wishlist path. Never crawl arbitrary URLs.
 const candidates=[...html.matchAll(/<a\b[^>]{0,1200}href\s*=\s*["']([^"']+)["'][^>]*>/gi)];
 const pages=[];
 for(const match of candidates){const href=decodeEntities(match[1]);try{const u=new URL(href,'https://www.amazon.de');if(!['amazon.de','www.amazon.de'].includes(u.hostname)||!/^\/hz\/wishlist\/ls\/[A-Z0-9]{8,40}(?:\/|$)/i.test(u.pathname))continue;const linkedId=u.pathname.match(/^\/hz\/wishlist\/ls\/([A-Z0-9]{8,40})(?:\/|$)/i)?.[1];if(expectedWishlistId&&linkedId?.toUpperCase()!==expectedWishlistId.toUpperCase())continue;const n=Number(u.searchParams.get('page')||u.searchParams.get('pageNumber'));if(Number.isInteger(n)&&n>currentPage&&n<=20)pages.push(n);}catch{}}
 return {products:[...found.values()],nextPage:pages.length?Math.min(...pages):null};
}
export function combineProducts(pages, max=200){const seen=new Map();for(const p of pages)for(const item of p.products){if(!seen.has(item.asin))seen.set(item.asin,item);if(seen.size>=max)return [...seen.values()];}return [...seen.values()];}
