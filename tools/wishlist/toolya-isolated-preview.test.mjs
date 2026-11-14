import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
test('isolated preview uses local originals without external dependencies',()=>{
 const html=read('toolya-mobile-preview.html');
 assert.match(html,/lang="de"/);
 assert.match(html,/name="viewport"/);
 assert.match(html,/toolya-buddy\.css/);
 assert.match(html,/import \{ToolyaBuddy\} from '\.\/toolya-buddy\.mjs'/);
 assert.match(html,/toolya_wishlist_turquoise_welcome_1024\.png/);
 assert.match(html,/toolya_wishlist_purple_welcome_1024\.png/);
 assert.match(html,/image-gallery/);
 assert.match(html,/buddy\.setQuiet/);
 assert.doesNotMatch(html,/<script[^>]+src=["']https?:/i);
 assert.doesNotMatch(html,/supabase\.co|createClient\(/i);
});
test('four original poses animate only when motion is allowed',()=>{
 const css=read('toolya-buddy.css');
 const js=read('toolya-buddy.mjs');
 for(const pose of ['greet','success','tip','error'])assert.ok(css.includes('@keyframes tb-'+pose),pose+' animation exists');
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/data-motion="off"/);
 assert.match(js,/setAttribute\('data-pose',POSE\[type\]\)/);
 assert.match(js,/setAttribute\('data-motion'/);
});

test('Android preview exposes viewport and explicit motion simulation',()=>{
 const html=read('toolya-mobile-preview.html');
 assert.match(html,/id="simulate-reduced"/);
 assert.match(html,/id="viewport-info"/);
 assert.match(html,/prefers-reduced-motion: reduce/);
 assert.match(html,/buddy\.host\.setAttribute\('data-motion'/);
});
test('idle remains still and each pose has its own short animation',()=>{
 const css=read('toolya-buddy.css');
 for(const pose of ['welcome','success','tip','error'])assert.ok(css.includes('[data-pose="'+pose+'"] .tb-avatar{animation:'));
 assert.match(css,/\[data-pose="idle"\] \.tb-avatar\{animation:none\}/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\[data-motion="off"\] \.tb-avatar\{animation:none!important/);
});

test('Android preview can inspect the isolated confirmation dialog',()=>{
 const html=read('toolya-mobile-preview.html');
 assert.match(html,/id="preview-confirm"/);
 assert.match(html,/buddy\.confirm\(/);
 assert.match(html,/keine Daten verändert/);
 assert.match(html,/id="intensity"/);
 assert.match(html,/id="tips-enabled"/);
 assert.match(html,/id="hide-buddy"/);
});

test('Android high contrast, text zoom and reduced motion have CSS fallbacks',()=>{
 const css=read('toolya-buddy.css');
 assert.match(css,/@media\(forced-colors:active\)/);
 assert.match(css,/outline:3px solid Highlight/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/max-height:calc\(100dvh - 16px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
