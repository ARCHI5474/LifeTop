import assert from 'node:assert/strict';

const nodes = new Map();
const element = id => {
    if (!nodes.has(id)) nodes.set(id, {value:'',innerText:'',textContent:'',hidden:true,style:{}});
    return nodes.get(id);
};
globalThis.document = {getElementById:element,querySelector:()=>element('notice-tag')};
let raw = null, quota = false;
globalThis.localStorage = {
    getItem:()=>raw,
    setItem:(_key,value)=>{if(quota)throw Error('quota');raw=value;},
};
const config = await import('../js/config.js?v=9.0');
const storage = await import('../js/storage.js?v=9.0');
const defaults = structuredClone(config.userConfig);
const reset = () => {raw=JSON.stringify(defaults);quota=false;storage.loadData();};
const originalError = console.error;
console.error = () => {};
try {
    for (const invalid of ['null', '[]', '{broken']) {
        raw=invalid;
        storage.loadData();
        assert.equal(storage.save(),false);
        assert.equal(raw,invalid,'malformed stored content must remain recoverable');
    }
    for (const invalid of [null,[],42]) {
        const previous=raw;
        assert.throws(()=>storage.writeStoredConfig(invalid));
        assert.equal(raw,previous,'invalid explicit replacements are rejected before writing');
    }
    reset();
    const other = JSON.parse(raw);
    other.todoList = [{id:100,text:'他のタブのタスク',completed:false}];
    raw = JSON.stringify(other);
    config.userConfig.memo = 'このタブのメモ';
    config.userConfig.memoHtml = '<p>このタブのメモ</p>';
    assert.equal(storage.save(),true);
    assert.equal(JSON.parse(raw).todoList[0].text,'他のタブのタスク');
    config.userConfig.todoList.push({id:200,text:'古いリストへの追記',completed:false});
    const beforeConflict = raw;
    assert.equal(storage.save(),false);
    assert.equal(raw,beforeConflict,'conflicts preserve stored content');

    reset();
    const external = JSON.parse(raw);
    external.memo = '外部メモ';external.memoHtml='<b>外部メモ</b>';
    raw=JSON.stringify(external);
    config.userConfig.memoHtml='<i>古い本文の書式変更</i>';
    assert.equal(storage.save(),false,'memo text and HTML are one conflict group');

    reset();
    config.userConfig.username='再試行';quota=true;
    assert.equal(storage.save(),false);
    quota=false;
    assert.equal(storage.save(),true,'failed writes must not advance the baseline');
    assert.equal(JSON.parse(raw).username,'再試行');

    reset();
    const themeStored=JSON.parse(raw);
    themeStored.todoList=[{id:300,text:'新しいタスク',completed:false}];
    raw=JSON.stringify(themeStored);
    config.userConfig.colorMode='light';
    storage.writeStoredConfig({...themeStored,colorMode:'light'});
    config.userConfig.memo='テーマ変更後のメモ';
    assert.equal(storage.save(),true);
    assert.equal(JSON.parse(raw).todoList[0].text,'新しいタスク');
    config.userConfig.todoList.push({id:400,text:'古いタスクへの追記',completed:false});
    assert.equal(storage.save(),false,'a preference write must not silently adopt an unseen task list');

    reset();
    const cloud=JSON.parse(raw);
    cloud.todoList=[{id:500,text:'ダウンロードした旧形式タスク',completed:false}];
    storage.writeStoredConfig(cloud,false);
    config.mergeUserConfig(cloud);
    storage.acceptStoredConfig(cloud);
    config.userConfig.memo='同期後のメモ';
    assert.equal(storage.save(),true,'explicitly loaded cloud data uses the sanitized in-memory baseline');
    assert.equal(JSON.parse(raw).todoList[0].id,500);
} finally {
    console.error=originalError;
}
console.log('PASS: cross-tab field merge/conflicts, atomic memo group, quota retry, preference writes and cloud refresh baseline');
