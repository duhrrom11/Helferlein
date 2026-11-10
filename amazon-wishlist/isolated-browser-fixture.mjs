import {readFile} from 'node:fs/promises';

const origin='https://wishes.test';
const allowedModules=new Set(['/lists-dashboard.mjs','/bulk-helpers.mjs','/list-features.mjs']);

// Never filter HTML with a regular expression: the browser's HTML parser has
// many equivalent spellings of script tags. Serve the original fixture under
// a restrictive CSP and block all unapproved requests instead.
export async function loadIsolatedWishesPage(page,{dashboardModules=false,htmlOverride=null}={}){
 const html=htmlOverride??await readFile(new URL('./index.html',import.meta.url),'utf8');
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url);
  if(url.origin!==origin)return route.abort();
  if(url.pathname==='/index.html'){
   const csp=[
    "default-src 'none'",
    "script-src "+(dashboardModules?"'self'":"'none'"),
    "style-src 'unsafe-inline'",
    'img-src data:',
    "connect-src 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'"
   ].join('; ');
   return route.fulfill({
    status:200,
    contentType:'text/html; charset=utf-8',
    headers:{'Content-Security-Policy':csp,'X-Content-Type-Options':'nosniff'},
    body:html
   });
  }
  if(dashboardModules&&allowedModules.has(url.pathname)){
   const filename=url.pathname.slice(1);
   return route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:await readFile(new URL('./'+filename,import.meta.url),'utf8')});
  }
  return route.abort();
 });
 await page.goto(origin+'/index.html');
}
