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

test('coarse-pointer Android controls have minimum 44px touch targets',()=>{
 const css=read('toolya-buddy.css');
 assert.match(css,/@media\(pointer:coarse\)/);
 assert.match(css,/\.tb-close,\.tb-dialog button\{min-height:44px;min-width:44px\}/);
 assert.match(css,/@media\(prefers-reduced-transparency:reduce\)/);
});

test('calm mode reduces amplitude independently for all four original poses',()=>{
 const css=read('toolya-buddy.css');
 for(const pose of ['greet','success','tip','error'])assert.ok(css.includes('@keyframes tb-'+pose+'-calm'));
 for(const pose of ['welcome','success','tip','error'])assert.ok(css.includes('[data-motion="calm"][data-pose="'+pose+'"] .tb-avatar'));
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('Android preview exercises warning and form-error without backend access',()=>{
 const html=read('toolya-mobile-preview.html');
 assert.match(html,/data-type="warning"/);
 assert.match(html,/data-type="form-error"/);
 assert.match(html,/simulierter Eingabefehler/);
 assert.doesNotMatch(html,/createClient\(|supabase\.co/);
});

test('landscape Android and increased contrast retain accessible dialog controls',()=>{
 const css=read('toolya-buddy.css');
 assert.match(css,/@media\(max-height:440px\) and \(orientation:landscape\)/);
 assert.match(css,/\.tb-overlay\{align-items:flex-start;overflow-y:auto\}/);
 assert.match(css,/@media\(prefers-contrast:more\)/);
});

test('Android preview refreshes reduced-motion status when system settings change',()=>{
 const html=read('toolya-mobile-preview.html');
 assert.match(html,/motionQuery\.addEventListener\?\.\('change',updateViewport\)/);
 assert.match(html,/prefers-reduced-motion: reduce/);
});

test('ultra-narrow Android screens retain a full-width dismiss control',()=>{
 const css=read('toolya-buddy.css');
 assert.match(css,/@media\(max-width:320px\)/);
 assert.match(css,/\.tb-message-box\{flex-direction:column;align-items:stretch\}/);
 assert.match(css,/\.tb-close\{width:100%\}/);
});

test('mascot motion pauses during keyboard focus and pointer inspection',()=>{
 const css=read('toolya-buddy.css');
 assert.match(css,/\.toolya-buddy:focus-within \.tb-avatar\{animation-play-state:paused\}/);
 assert.match(css,/@media\(hover:hover\)/);
 assert.match(css,/\.toolya-buddy:hover \.tb-avatar\{animation-play-state:paused\}/);
});

test('Android reduced-data preference disables decorative mascot motion',()=>{
 const css=read('toolya-buddy.css');
 assert.match(css,/@media\(prefers-reduced-data:reduce\)/);
 assert.match(css,/\.toolya-buddy \.tb-avatar\{animation:none!important;transition:none!important\}/);
});

test('Android buttons use manipulation touch action and reduced motion disables animation',()=>{
 const css=read('toolya-buddy.css');
 assert.match(css,/\.tb-close,\.tb-dialog button\{touch-action:manipulation/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.toolya-buddy \.tb-avatar\{animation:none!important;transition:none!important\}/);
});

test('decorative mascots do not intercept Android taps or selection',()=>{
 const css=read('toolya-buddy.css');
 assert.match(css,/\.tb-avatar,\.tb-dialog-avatar\{pointer-events:none;user-select:none;-webkit-user-select:none\}/);
 assert.match(css,/@media\(prefers-reduced-transparency:reduce\)/);
 assert.match(css,/\.tb-overlay\{backdrop-filter:none!important;-webkit-backdrop-filter:none!important\}/);
});

test('Android virtual keyboard leaves confirmation modal scrollable in dynamic viewport',()=>{
 const css=read('toolya-buddy.css');
 assert.match(css,/@supports\(height:100dvh\)/);
 assert.match(css,/\.tb-overlay\{max-height:100dvh;overflow-y:auto;overscroll-behavior:contain\}/);
 assert.match(css,/\.tb-dialog\{max-height:calc\(100dvh - 2rem\);overflow-y:auto;overscroll-behavior:contain\}/);
 assert.match(css,/\.tb-dialog,\.tb-overlay\{animation:none!important;transition:none!important\}/);
});

test('Android hardware keyboard focus remains visible in forced colors',()=>{
 const css=read('toolya-buddy.css');
 assert.match(css,/\.tb-close:focus-visible,\.tb-dialog button:focus-visible\{/);
 assert.match(css,/outline:3px solid currentColor;outline-offset:3px/);
 assert.match(css,/@media\(forced-colors:active\)/);
 assert.match(css,/outline-color:Highlight/);
});
