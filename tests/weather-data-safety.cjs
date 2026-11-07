const assert = require('node:assert/strict');
const { withApp } = require('./helpers/browser.cjs');

withApp(async page => {
    await page.evaluate(() => {
        localStorage.setItem('lifetop_weather_cache_v1', JSON.stringify({
            timestamp:Date.now(),
            data:{
                current_weather:{time:'2026-11-07T12:00',temperature:20,weathercode:0},
                hourly:{time:['2026-11-07T12:00'],temperature_2m:[20]},
                timezone:'<img src="data:," onerror="window.weatherCodeExecuted=true">',
            },
        }));
    });
    await page.reload();
    await page.locator('#weather-widget').click();
    assert.equal(await page.locator('#weather-detail-content img').count(), 0, 'weather metadata is rendered as text');
    assert.equal(await page.evaluate(() => Boolean(window.weatherCodeExecuted)), false);
    assert.match(await page.locator('.weather-data-time').innerText(), /<img/);
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
        const cache = JSON.parse(localStorage.getItem('lifetop_weather_cache_v1'));
        cache.data.hourly.time = [null, {invalid:true}];
        localStorage.setItem('lifetop_weather_cache_v1', JSON.stringify(cache));
    });
    await page.reload();
    await page.locator('#weather-widget').click();
    await page.locator('.weather-empty-state').filter({hasText:'形式が正しくありません'}).waitFor();
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
        const cache = JSON.parse(localStorage.getItem('lifetop_weather_cache_v1'));
        cache.data.hourly.time = ['2026-11-07T12:00'];
        cache.data.daily = {temperature_2m_max:[{toString:1}],temperature_2m_min:['invalid'],uv_index_max:[{toString:1}]};
        localStorage.setItem('lifetop_weather_cache_v1', JSON.stringify(cache));
    });
    await page.reload();
    await page.locator('#weather-widget').click();
    await page.locator('.detail-high-low').filter({hasText:'最高 --'}).waitFor();
    assert.match(await page.locator('.detail-high-low').innerText(), /最低 --/);
    for (const field of ['timezone', 'time']) {
        await page.keyboard.press('Escape');
        await page.evaluate(field => {
            const cache=JSON.parse(localStorage.getItem('lifetop_weather_cache_v1'));
            cache.data.timezone='Asia/Tokyo';
            cache.data.current_weather.time='2026-11-07T12:00';
            if(field==='timezone')cache.data.timezone={toString:1};
            else cache.data.current_weather.time={toString:1};
            localStorage.setItem('lifetop_weather_cache_v1',JSON.stringify(cache));
        },field);
        await page.reload();
        await page.locator('#weather-widget').click();
        await page.locator('.weather-empty-state').filter({hasText:'形式が正しくありません'}).waitFor();
    }
    console.log('PASS: weather text injection prevention and malformed cached forecast recovery');
}).catch(error => {console.error(error); process.exitCode = 1;});
