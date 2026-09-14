/* LifeTop - visual style application */


// スタイルの適用
export function applyStyles() {
    document.documentElement.style.setProperty('--p', userConfig.theme);
    const rgb = hexToRgb(userConfig.theme);
    if (rgb) {
        document.documentElement.style.setProperty('--p-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
    document.documentElement.style.setProperty('--clock-f', userConfig.fontFamily);
    

}

export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}
// 背景デザイン選択ボタンの動的レンダリング
export function renderBgSelector() {
    const container = document.getElementById('bg-selector-grid');
    if (!container) return;
    
    let html = "";
    Object.keys(bgGradients).forEach(key => {
        const activeClass = (userConfig.bgType === key) ? 'active' : '';
        html += `<div class="bg-option ${activeClass}" style="background: ${bgGradients[key]}" onclick="setBg('${key}', this)"></div>`;
    });
    

    
    container.innerHTML = html;
}

