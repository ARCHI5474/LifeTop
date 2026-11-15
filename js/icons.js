/* Google Material Symbols, official font glyphs, self-hosted. See icons/material/LICENSE. */
const glyphs = {
  "ac_unit": "eb3b",
  "account_balance": "e84f",
  "add": "e145",
  "add_link": "e178",
  "air": "efd8",
  "arrow_back": "e5c4",
  "arrow_forward": "e5c8",
  "bookmark_add": "e598",
  "bookmarks": "e98b",
  "check": "e668",
  "check_box": "e9de",
  "check_circle": "f0be",
  "chevron_left": "e5cb",
  "chevron_right": "e5cc",
  "close": "e5cd",
  "cloud": "f15c",
  "cloud_off": "e2c1",
  "cloud_sync": "eb5a",
  "cloudy_snowing": "e810",
  "content_copy": "e14d",
  "contrast": "eb37",
  "conversion_path": "f0c1",
  "create_new_folder": "e2cc",
  "dashboard_customize": "e99b",
  "delete": "e92e",
  "drive_file_move": "e9a1",
  "drive_file_move_rtl": "e9a1",
  "eco": "ea35",
  "edit": "f097",
  "edit_note": "e745",
  "edit_square": "f88d",
  "face": "f008",
  "favorite": "e87e",
  "filter_drama": "e3dd",
  "flag": "f0c6",
  "foggy": "e818",
  "folder": "e2c7",
  "folder_open": "e2c8",
  "format_bold": "e238",
  "format_clear": "e239",
  "format_color_text": "e23c",
  "format_italic": "e23f",
  "format_list_bulleted": "e241",
  "format_list_numbered": "e242",
  "format_quote": "e244",
  "format_underlined": "e249",
  "glyphs": "f8a3",
  "grid_on": "e3ec",
  "grid_view": "e9b0",
  "info": "e88e",
  "ink_highlighter": "e6d1",
  "keyboard_arrow_down": "e313",
  "keyboard_arrow_left": "e314",
  "keyboard_arrow_right": "e315",
  "keyboard_arrow_up": "e316",
  "lightbulb": "e90f",
  "newspaper": "eb81",
  "notifications_active": "e7f7",
  "open_in_new": "e89e",
  "pace": "f6b8",
  "partly_cloudy_day": "f172",
  "pause": "e034",
  "person": "f0d3",
  "pets": "e91d",
  "pin": "f045",
  "play_arrow": "e037",
  "rainy": "f176",
  "rainy_light": "f61e",
  "refresh": "e5d5",
  "replay": "e042",
  "restart_alt": "f053",
  "rocket_launch": "eb9b",
  "schedule": "efd6",
  "search": "ef7a",
  "settings": "e8b8",
  "shuffle": "e043",
  "smart_display": "f06a",
  "snowing": "e80f",
  "sports_esports": "ea28",
  "star": "f09a",
  "star_border": "f09a",
  "star_outline": "f09a",
  "strikethrough_s": "e257",
  "sunny": "e81a",
  "task_alt": "e2e6",
  "thunderstorm": "ebdb",
  "timer": "e425",
  "title": "e264",
  "trending_up": "e8e5",
  "umbrella": "f1ad",
  "undo": "e166",
  "upload": "f09b",
  "water_drop": "e798",
  "wb_sunny": "e430",
  "wb_twilight": "e1c6",
  "weather_snowy": "e2cd"
};
const outlinePaths={photo_camera:'M8 5l1.5-2h5L16 5h4v15H4V5z M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',forum:'M4 4h16v12H9l-5 4z M8 8h8 M8 12h6',calendar_month:'M4 5h16v15H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2',fullscreen:'M8 3H3v5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5',auto_awesome:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z M20 2v4 M18 4h4',celebration:'m3 21 4-13 9 9z M13 3l1 4 M19 5l-3 4 M21 11l-4 1 M9 3l1 2'};
export function outlineIcon(name){return outlinePaths[name]?`<svg class="cc-icon-svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${outlinePaths[name]}"/></svg>`:'';}
export function createMaterialIcon(name) {
    if(outlinePaths[name]){const holder=document.createElement('span');holder.className='ui-outline-icon';holder.innerHTML=outlineIcon(name);holder.setAttribute('aria-hidden','true');return holder;}
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.setAttribute('aria-hidden', 'true');
    icon.dataset.icon = name;
    icon.dataset.symbol = name;
    icon.textContent = String.fromCodePoint(parseInt(glyphs[name] || glyphs.info, 16));
    return icon;
}
function renderIcon(icon) {
    const name = icon.textContent.trim();
    if (!glyphs[name]) return;
    icon.dataset.symbol = name;
    icon.textContent = String.fromCodePoint(parseInt(glyphs[name], 16));
}
export function initIcons() {
    document.querySelectorAll('.material-symbols-outlined').forEach(renderIcon);
    new MutationObserver(records => {
        const icons = new Set();
        for (const record of records) {
            const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
            if (target?.matches('.material-symbols-outlined')) icons.add(target);
            for (const node of record.addedNodes || []) if (node.nodeType === 1) {
                if (node.matches('.material-symbols-outlined')) icons.add(node);
                node.querySelectorAll('.material-symbols-outlined').forEach(icon => icons.add(icon));
            }
        }
        icons.forEach(renderIcon);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
}
