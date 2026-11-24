const BLACK = [0, 0, 0];
const WHITE = [255, 255, 255];

const rgb = color => color.slice(1).match(/../g).map(channel => parseInt(channel, 16));
const hex = color => '#' + color.map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('');
const mix = (a, b, amount) => a.map((channel, index) => Math.round(channel * (1 - amount) + b[index] * amount));

function luminance(color) {
    const [r, g, b] = color.map(channel => {
        const value = channel / 255;
        return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    });
    return .2126 * r + .7152 * g + .0722 * b;
}

export function contrastRatio(a, b) {
    const first = luminance(rgb(a));
    const second = luminance(rgb(b));
    return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}

function ensureContrast(color, toward, surfaces, minimum) {
    for (let step = 0; step <= 100; step++) {
        const candidate = hex(mix(color, toward, step / 100));
        if (surfaces.every(surface => contrastRatio(candidate, surface) >= minimum)) return candidate;
    }
    return hex(toward);
}

export function createColorPalette({theme, mode, base}) {
    const light = mode === 'light';
    const contrastDirection = light ? BLACK : WHITE;
    const standard = !/^#[0-9a-f]{6}$/i.test(theme ?? '') || theme.toLowerCase() === '#2b5bb5';
    const accent = rgb(standard ? base.primary : theme);
    const tint = (color, amount) => standard ? color : hex(mix(rgb(color), accent, amount));
    const background = tint(base.background, .035);
    const surface = tint(base.surface, .065);
    const muted = tint(base.muted, .09);
    const soft = tint(base.surface, .16);
    const surfaces = [background, surface, muted, standard ? base.soft : soft];
    const primary = standard ? base.primary : ensureContrast(accent, contrastDirection, surfaces, 4.8);
    return {
        background,
        surface,
        muted,
        primary,
        hover: hex(mix(rgb(primary), contrastDirection, .13)),
        pressed: hex(mix(rgb(primary), contrastDirection, .23)),
        soft: standard ? base.soft : soft,
        onPrimary: standard ? base.onPrimary : hex(light ? WHITE : BLACK),
        onSoft: standard ? base.onSoft : base.text,
        outline: ensureContrast(rgb(base.outline), contrastDirection, [background, surface, muted], 3.2)
    };
}
