import {escapeHTML as esc} from './mini-model.js?v=1';
export const iconAliases={account_tree:'dashboard_customize',apps:'grid_view',arrow_downward:'keyboard_arrow_down',arrow_upward:'keyboard_arrow_up',calendar_month:'schedule',description:'edit_note',forum:'newspaper',insert_drive_file:'edit_note',more_horiz:'keyboard_arrow_down',restore:'replay',slideshow:'smart_display',table_chart:'grid_on',tune:'settings'};
export const icon=name=>`<span class="material-symbols-outlined cc-icon-svg" aria-hidden="true">${iconAliases[name]||name}</span>`;

export function uiButton(label,action,id='',style='quiet',glyph='') {return `<button type="button" class="cc-control cc-${style}" data-cc="${action}" data-id="${esc(id)}" ${style==='icon'?`aria-label="${esc(label)}" title="${esc(label)}"`: ''}>${glyph?icon(glyph):''}<span>${esc(label)}</span></button>`;}
