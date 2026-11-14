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
 for(const pose of ['greet','success','tip','error'])assert.match(css,new RegExp('@keyframes tb-'+pose+'\\\\b'));
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/data-motion="off"/);
 assert.match(js,/setAttribute\('data-pose',POSE\[type\]\)/);
 assert.match(js,/setAttribute\('data-motion'/);
});
