// Pipo, o mascote. Gera o SVG como string a partir do humor e do estágio.
// Fonte única: usado pelo Mascot.tsx (SvgXml) e pelo script que exporta os .svg.

export type MascotMood =
  | 'happy'
  | 'thinking'
  | 'worried'
  | 'celebrating'
  | 'sleeping'
  | 'listening'
  | 'sad';

// 1 = broto (uma folha), 2 = plantinha (duas folhas), 3 = florzinha
export type MascotStage = 1 | 2 | 3;

export const mascotColors = {
  bodyTop: '#FFB27A',
  bodyBottom: '#FF8A5C',
  bodyShade: '#F0703F',
  belly: '#FFE6CF',
  feet: '#E8653A',
  ink: '#2B2340',
  mouth: '#7A2E3B',
  tongue: '#FF8FA3',
  cheek: '#FF6F8E',
  leaf: '#2FBF8F',
  leafDark: '#1E9E73',
  flower: '#FFC94D',
  flowerCenter: '#FF7A59',
  drop: '#7CC4FF',
  purple: '#7C6CF2',
  white: '#FFFFFF',
};

const c = mascotColors;
const stroke = (w = 4.5) =>
  `stroke="${c.ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;

function sprout(stage: MascotStage, droop: number) {
  const right =
    stage >= 2
      ? `<path d="M102 27 C110 13 126 12 131 18 C123 29 111 31 102 27 Z" fill="${c.leaf}"/>
         <path d="M104 26 C112 20 120 18 127 18" ${stroke(1.6).replace(c.ink, c.leafDark)}/>`
      : '';
  const flower =
    stage === 3
      ? `<g transform="translate(101 16)">
           ${[0, 72, 144, 216, 288]
             .map((a) => `<ellipse cx="0" cy="-7" rx="5" ry="7" fill="${c.flower}" transform="rotate(${a})"/>`)
             .join('')}
           <circle r="4.5" fill="${c.flowerCenter}"/>
         </g>`
      : '';
  return `<g transform="rotate(${droop} 100 46)">
    <path d="M100 47 Q98 34 101 22" stroke="${c.leafDark}" stroke-width="4" stroke-linecap="round" fill="none"/>
    <path d="M100 32 C88 19 73 22 70 30 C82 38 93 38 100 32 Z" fill="${c.leaf}"/>
    <path d="M98 32 C90 27 82 26 75 29" ${stroke(1.6).replace(c.ink, c.leafDark)}/>
    ${right}${flower}
  </g>`;
}

function body() {
  return `
  <ellipse cx="100" cy="176" rx="58" ry="7" fill="${c.ink}" opacity="0.08"/>
  <ellipse cx="78" cy="170" rx="15" ry="8" fill="${c.feet}"/>
  <ellipse cx="122" cy="170" rx="15" ry="8" fill="${c.feet}"/>
  <path d="M100 44 C141 44 167 75 168 113 C169 150 142 171 100 171 C58 171 31 150 32 113 C33 75 59 44 100 44 Z" fill="url(#pipoBody)"/>
  <path d="M60 64 C70 54 84 49 96 49" stroke="${c.white}" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.45"/>
  <ellipse cx="100" cy="140" rx="40" ry="25" fill="${c.belly}"/>`;
}

function arms(pose: 'rest' | 'up' | 'chin' | 'ear') {
  const arm = (cx: number, cy: number, rot: number) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="9" ry="14" fill="${c.bodyShade}" transform="rotate(${rot} ${cx} ${cy})"/>`;
  switch (pose) {
    case 'up':
      return arm(36, 82, 35) + arm(164, 82, -35);
    case 'chin':
      return arm(35, 124, 20) + arm(126, 146, -65);
    case 'ear':
      return arm(35, 124, 20) + arm(163, 96, -15);
    default:
      return arm(35, 124, 20) + arm(165, 124, -20);
  }
}

const cheeks = `
  <ellipse cx="60" cy="118" rx="10" ry="6" fill="${c.cheek}" opacity="0.45"/>
  <ellipse cx="140" cy="118" rx="10" ry="6" fill="${c.cheek}" opacity="0.45"/>`;

function eye(x: number, y: number, rx = 9, ry = 12, lookX = 0, lookY = 0) {
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c.ink}"/>
    <circle cx="${x + 3 + lookX}" cy="${y - 4 + lookY}" r="${rx * 0.38}" fill="${c.white}"/>
    <circle cx="${x - 3 + lookX}" cy="${y + 4 + lookY}" r="${rx * 0.16}" fill="${c.white}"/>`;
}

function face(mood: MascotMood) {
  switch (mood) {
    case 'celebrating':
      return `
        <path d="M67 101 Q78 86 89 101" ${stroke(5)}/>
        <path d="M111 101 Q122 86 133 101" ${stroke(5)}/>
        <path d="M84 114 Q100 114 116 114 Q114 136 100 136 Q86 136 84 114 Z" fill="${c.mouth}"/>
        <path d="M91 129 Q100 122 109 129 Q105 136 100 136 Q95 136 91 129 Z" fill="${c.tongue}"/>`;
    case 'thinking':
      return `
        ${eye(80, 98, 8, 11, 2, -3)}${eye(120, 98, 8, 11, 2, -3)}
        <path d="M70 80 L88 78" ${stroke(4)}/>
        <path d="M112 76 L130 80" ${stroke(4)}/>
        <path d="M98 122 Q106 119 112 123" ${stroke(4)}/>`;
    case 'worried':
      return `
        ${eye(78, 102, 8, 11)}${eye(122, 102, 8, 11)}
        <path d="M68 86 L88 80" ${stroke(4)}/>
        <path d="M112 80 L132 86" ${stroke(4)}/>
        <path d="M86 124 Q93 117 100 124 Q107 131 114 124" ${stroke(4)}/>`;
    case 'sleeping':
      return `
        <path d="M67 103 Q78 112 89 103" ${stroke(4.5)}/>
        <path d="M111 103 Q122 112 133 103" ${stroke(4.5)}/>
        <ellipse cx="100" cy="124" rx="5" ry="4" fill="${c.mouth}"/>`;
    case 'listening':
      return `
        ${eye(78, 99, 10, 14)}${eye(122, 99, 10, 14)}
        <ellipse cx="100" cy="125" rx="7" ry="8" fill="${c.mouth}"/>
        <ellipse cx="100" cy="129" rx="4" ry="3" fill="${c.tongue}"/>`;
    case 'sad':
      return `
        ${eye(78, 102, 8, 11, 0, 2)}${eye(122, 102, 8, 11, 0, 2)}
        <path d="M66 88 L86 84" ${stroke(4)}/>
        <path d="M114 84 L134 88" ${stroke(4)}/>
        <path d="M89 127 Q100 117 111 127" ${stroke(4.5)}/>
        <path d="M70 116 C66 124 66 129 70 131 C74 129 74 124 70 116 Z" fill="${c.drop}"/>`;
    default:
      return `
        ${eye(78, 100)}${eye(122, 100)}
        <path d="M87 116 Q100 116 113 116 Q111 131 100 131 Q89 131 87 116 Z" fill="${c.mouth}"/>
        <path d="M93 126 Q100 121 107 126 Q104 131 100 131 Q96 131 93 126 Z" fill="${c.tongue}"/>`;
  }
}

function extras(mood: MascotMood) {
  switch (mood) {
    case 'celebrating':
      return `
        <rect x="22" y="40" width="9" height="5" rx="2" fill="${c.purple}" transform="rotate(-25 26 42)"/>
        <rect x="170" y="50" width="9" height="5" rx="2" fill="${c.leaf}" transform="rotate(30 174 52)"/>
        <rect x="150" y="22" width="8" height="5" rx="2" fill="${c.flowerCenter}" transform="rotate(-15 154 24)"/>
        <circle cx="48" cy="22" r="4" fill="${c.flower}"/>
        <circle cx="182" cy="92" r="3.5" fill="${c.purple}"/>
        <circle cx="16" cy="96" r="3.5" fill="${c.flowerCenter}"/>
        <path d="M60 10 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" fill="${c.flower}"/>
        <path d="M176 120 l2.5 5.5 5.5 2.5 -5.5 2.5 -2.5 5.5 -2.5 -5.5 -5.5 -2.5 5.5 -2.5 Z" fill="${c.flower}"/>`;
    case 'thinking':
      return `
        <circle cx="150" cy="62" r="5" fill="${c.white}" stroke="${c.ink}" stroke-width="2.5"/>
        <circle cx="162" cy="45" r="8" fill="${c.white}" stroke="${c.ink}" stroke-width="2.5"/>
        <rect x="150" y="6" width="44" height="28" rx="14" fill="${c.white}" stroke="${c.ink}" stroke-width="2.5"/>
        <circle cx="162" cy="20" r="3" fill="${c.ink}"/><circle cx="172" cy="20" r="3" fill="${c.ink}"/><circle cx="182" cy="20" r="3" fill="${c.ink}"/>`;
    case 'worried':
      return `<path d="M152 70 C146 80 146 87 152 90 C158 87 158 80 152 70 Z" fill="${c.drop}"/>`;
    case 'sleeping':
      return `
        <text x="140" y="44" font-family="Baloo 2, Nunito, sans-serif" font-weight="800" font-size="22" fill="${c.purple}">Z</text>
        <text x="160" y="26" font-family="Baloo 2, Nunito, sans-serif" font-weight="800" font-size="16" fill="${c.purple}" opacity="0.7">z</text>
        <text x="174" y="12" font-family="Baloo 2, Nunito, sans-serif" font-weight="800" font-size="12" fill="${c.purple}" opacity="0.45">z</text>`;
    case 'listening':
      return `
        <path d="M178 84 Q186 96 178 108" stroke="${c.purple}" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M188 76 Q200 96 188 116" stroke="${c.purple}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.55"/>`;
    default:
      return '';
  }
}

const armPose: Record<MascotMood, 'rest' | 'up' | 'chin' | 'ear'> = {
  happy: 'rest',
  thinking: 'chin',
  worried: 'rest',
  celebrating: 'up',
  sleeping: 'rest',
  listening: 'ear',
  sad: 'rest',
};

const sproutDroop: Record<MascotMood, number> = {
  happy: 0,
  thinking: 0,
  worried: -8,
  celebrating: 6,
  sleeping: -32,
  listening: 0,
  sad: -26,
};

export function mascotSvg(mood: MascotMood = 'happy', stage: MascotStage = 2): string {
  const showCheeks = mood !== 'sad';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="pipoBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c.bodyTop}"/>
      <stop offset="1" stop-color="${c.bodyBottom}"/>
    </linearGradient>
  </defs>
  ${sprout(stage, sproutDroop[mood])}
  ${body()}
  ${arms(armPose[mood])}
  ${showCheeks ? cheeks : ''}
  ${face(mood)}
  ${extras(mood)}
</svg>`;
}

export const mascotMoods: MascotMood[] = [
  'happy',
  'thinking',
  'worried',
  'celebrating',
  'sleeping',
  'listening',
  'sad',
];
