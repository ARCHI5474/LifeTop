const assert = require('node:assert/strict');
const { withApp } = require('./helpers/browser.cjs');

withApp(async page => {
    const result = await page.evaluate(async () => {
        const { sanitizeMemoHtml, syncMemoFromConfig } = await import('./js/memo.js?v=9.0');
        const { sanitizeDocument } = await import('./js/mini-common.js?v=1');
        const { userConfig } = await import('./js/config.js?v=9.0');
        window.sanitizerExecuted = 0;
        const payloads = [
            '<img src=x onerror="window.sanitizerExecuted++"><b>本文</b>',
            '<svg onload="window.sanitizerExecuted++"><foreignObject><div onclick="window.sanitizerExecuted++">本文</div></foreignObject></svg>',
            '<iframe srcdoc="<script>parent.sanitizerExecuted++</script>"></iframe><p>本文</p>',
            '<div style="background:url(https://invalid.example/);position:fixed" onclick="window.sanitizerExecuted++"><span id="clobber" data-value="x">本文</span></div>',
            '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=window.sanitizerExecuted++>"></table></mtext></math>',
        ];
        const unsafe = [];
        for (const [name, sanitize] of [['memo',sanitizeMemoHtml],['document',sanitizeDocument]]) {
            for (const [index,payload] of payloads.entries()) {
                const host = document.createElement('div');
                host.innerHTML = sanitize(payload);
                document.body.append(host);
                for (const node of host.querySelectorAll('*')) {
                    if (['SCRIPT','IFRAME','OBJECT','SVG','IMG','MATH'].includes(node.tagName) || [...node.attributes].some(attribute => /^on|^(?:src|srcdoc|href|id)$/i.test(attribute.name))) unsafe.push(`${name}:${index}:${node.outerHTML}`);
                }
                host.remove();
            }
        }
        userConfig.memoHtml = payloads.join('');
        syncMemoFromConfig();
        await new Promise(requestAnimationFrame);
        const memo = sanitizeMemoHtml('<h3>見出し</h3><b>太字</b><span style="color:rgb(255,0,0);background-color:#ff0">強調</span>');
        const documentHTML = sanitizeDocument('<h1>見出し</h1><table><tbody><tr><td>表</td></tr></tbody></table>');
        return {unsafe,executed:window.sanitizerExecuted,memo,documentHTML,memoUnsafe:document.querySelector('#memo-editor script,#memo-editor iframe,#memo-editor img,#memo-editor [onclick]')!==null};
    });
    assert.deepEqual(result.unsafe,[]);
    assert.equal(result.executed,0);
    assert.equal(result.memoUnsafe,false,'restoring rich memo also sanitizes the live editor');
    assert.match(result.memo,/<h3>見出し<\/h3><b>太字<\/b>/);
    assert.match(result.memo,/background-color/);
    assert.match(result.documentHTML,/<table><tbody><tr><td>表<\/td><\/tr><\/tbody><\/table>/);
    console.log('PASS: memo/document sanitization, SVG/MathML/iframe/event injection, safe rich formatting and memo restoration');
}).catch(error => { console.error(error); process.exitCode = 1; });
