import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../icons/material/',import.meta.url);
const b=fs.readFileSync(new URL('material-symbols-outlined.ttf',root));
assert.equal(b.readUInt32BE(0),0x00010000,'official subset is a TrueType font');
let cmap;
for(let i=0;i<b.readUInt16BE(4);i++){const at=12+i*16;if(b.toString('ascii',at,at+4)==='cmap')cmap=b.readUInt32BE(at+8);}
assert.ok(cmap);
const tables=[];for(let i=0;i<b.readUInt16BE(cmap+2);i++){const at=cmap+4+i*8;tables.push(cmap+b.readUInt32BE(at+4));}
function glyph(cp){
 for(const t of tables){const format=b.readUInt16BE(t);
  if(format===4){const n=b.readUInt16BE(t+6)/2;for(let i=0;i<n;i++){const end=b.readUInt16BE(t+14+2*i),start=b.readUInt16BE(t+16+2*n+2*i);if(cp<start||cp>end)continue;const delta=b.readInt16BE(t+16+4*n+2*i),at=t+16+6*n+2*i,range=b.readUInt16BE(at);if(!range)return(cp+delta)&65535;const index=b.readUInt16BE(at+range+2*(cp-start));return index?(index+delta)&65535:0;}}
  if(format===12)for(let i=0;i<b.readUInt32BE(t+12);i++){const at=t+16+i*12,start=b.readUInt32BE(at),end=b.readUInt32BE(at+4);if(cp>=start&&cp<=end)return b.readUInt32BE(at+8)+cp-start;}
 }return 0;
}
const glyphs=JSON.parse(fs.readFileSync(new URL('glyphs.json',root),'utf8'));
for(const [name,cp]of Object.entries(glyphs))assert.ok(glyph(parseInt(cp,16)),'official glyph exists: '+name);
console.log('PASS: official Material Symbols font contains all '+Object.keys(glyphs).length+' application glyphs');
