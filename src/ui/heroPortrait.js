/* ============================================================================
 * heroPortrait.js — 依 HeroData 決定性地產生風格化 SVG 半身像。
 * 沒有美術素材／圖像生成工具可用（純前端、離線 file:// 執行，無法連外抓圖），
 * 改用向量圖形拼出每位武將獨特但一致風格的畫面：陣營色（甲冑/頭冠）＋稀有度色
 * （外框）＋依三圍數值判斷的「武將／統帥／謀士」造型原型＋以 id 雜湊決定的
 * 髮色/膚色/瞳色/臉型/鬍鬚等小變化。這次美術優化的重點是用漸層＋分層light/
 * shadow（髮色高光、皮膚立體感、盔甲光澤、眼睛虹膜＋反光）取代原本純色塊
 * 平塗，讓畫面更接近手繪立繪的質感，而不是單純的向量小圖示。
 * ==========================================================================*/

(function () {
  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  const SKIN_TONES = ['#e8c39e', '#dba874', '#f2d3ab', '#c98f5e', '#eecfae'];
  const HAIR_COLORS = ['#1b1b1b', '#2c2320', '#3a3a3a', '#54443a', '#241a14'];
  const EYE_COLORS = ['#3a2a1a', '#1c1712', '#4a3524', '#2a2018'];

  let instanceCounter = 0;

  /** @param {HeroData} heroDef @returns {'warrior'|'commander'|'strategist'} */
  function archetypeOf(heroDef) {
    const { force, cmd, intel } = heroDef.baseStats;
    if (intel >= force && intel >= cmd) return 'strategist';
    if (cmd >= force && cmd >= intel) return 'commander';
    return 'warrior';
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amt));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
    const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /**
   * @param {HeroData} heroDef
   * @returns {string} 一段可直接塞進 innerHTML 的 <svg> 標記字串。
   */
  function buildHeroPortraitSvg(heroDef) {
    const h = hashStr(heroDef.id);
    const uid = heroDef.id + '_' + (instanceCounter++);
    const faction = window.Game.Data.factionDefById(heroDef.factionId);
    const factionColor = faction ? faction.color : '#888';
    const rarityColor = heroDef.portraitColor || '#7a7a7a';
    const gender = heroDef.gender || 'm';
    const archetype = archetypeOf(heroDef);
    const skin = SKIN_TONES[h % SKIN_TONES.length];
    const skinLight = shade(skin, 22);
    const skinShadow = shade(skin, -28);
    const hairColor = HAIR_COLORS[(h >> 2) % HAIR_COLORS.length];
    const hairHighlight = shade(hairColor, 45);
    const eyeColor = EYE_COLORS[(h >> 8) % EYE_COLORS.length];
    const armorDark = shade(factionColor, -35);
    const armorLight = shade(factionColor, 30);
    const hasBeard = gender === 'm' && archetype !== 'strategist' && (h >> 4) % 5 < 3;
    const faceWide = (h >> 6) % 2 === 0;
    const headRx = faceWide ? 21 : 18;
    const browTilt = ((h >> 10) % 3) - 1; // -1/0/1，讓眉形略有變化，避免所有武將表情都一模一樣

    const p = [];
    p.push('<defs>');
    p.push('<radialGradient id="bg_' + uid + '" cx="45%" cy="35%" r="75%">' +
      '<stop offset="0%" stop-color="#2a231a"/><stop offset="100%" stop-color="#141009"/></radialGradient>');
    p.push('<linearGradient id="armor_' + uid + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
      '<stop offset="0%" stop-color="' + armorLight + '"/><stop offset="55%" stop-color="' + factionColor + '"/><stop offset="100%" stop-color="' + armorDark + '"/></linearGradient>');
    p.push('<radialGradient id="face_' + uid + '" cx="38%" cy="32%" r="70%">' +
      '<stop offset="0%" stop-color="' + skinLight + '"/><stop offset="65%" stop-color="' + skin + '"/><stop offset="100%" stop-color="' + skinShadow + '"/></radialGradient>');
    p.push('<linearGradient id="hair_' + uid + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
      '<stop offset="0%" stop-color="' + hairHighlight + '"/><stop offset="45%" stop-color="' + hairColor + '"/><stop offset="100%" stop-color="' + shade(hairColor, -15) + '"/></linearGradient>');
    p.push('</defs>');

    p.push('<rect x="3" y="3" width="90" height="114" rx="10" fill="url(#bg_' + uid + ')" stroke="' + rarityColor + '" stroke-width="3"/>');

    const shoulderWidth = faceWide ? 32 : 28;
    p.push('<path d="M ' + (48 - shoulderWidth) + ' 118 Q 48 ' + (archetype === 'strategist' ? 90 : 84) + ' ' + (48 + shoulderWidth) + ' 118 Z" fill="url(#armor_' + uid + ')" stroke="' + rarityColor + '" stroke-width="2"/>');
    p.push('<path d="M ' + (48 - shoulderWidth + 4) + ' 116 Q 48 ' + (archetype === 'strategist' ? 94 : 88) + ' ' + (48 + shoulderWidth - 4) + ' 116" stroke="' + armorLight + '" stroke-width="1.5" fill="none" opacity="0.55"/>');
    p.push('<rect x="40" y="66" width="16" height="20" fill="' + skinShadow + '"/>');
    p.push('<rect x="41" y="66" width="14" height="18" fill="' + skin + '"/>');

    // 髮型底層：先鋪一層完整的頭髮輪廓，headwear／臉部五官會疊在上面，
    // 讓盔甲/頭冠邊緣能看到一圈頭髮，而不是光禿禿地直接扣在頭皮上。
    p.push('<path d="M ' + (48 - headRx - 3) + ' 48 Q ' + (48 - headRx - 5) + ' 20 48 16 Q ' + (48 + headRx + 5) + ' 20 ' + (48 + headRx + 3) + ' 48 Q ' + (48 + headRx + 1) + ' 62 ' + (48 + headRx - 4) + ' 58 Q 48 70 ' + (48 - headRx + 4) + ' 58 Q ' + (48 - headRx - 1) + ' 62 ' + (48 - headRx - 3) + ' 48 Z" fill="url(#hair_' + uid + ')"/>');

    if (gender === 'f') {
      p.push('<path d="M ' + (48 - headRx - 2) + ' 46 Q ' + (48 - headRx - 9) + ' 84 ' + (48 - headRx + 2) + ' 106" stroke="url(#hair_' + uid + ')" stroke-width="8" fill="none" stroke-linecap="round"/>');
      p.push('<path d="M ' + (48 + headRx + 2) + ' 46 Q ' + (48 + headRx + 9) + ' 84 ' + (48 + headRx - 2) + ' 106" stroke="url(#hair_' + uid + ')" stroke-width="8" fill="none" stroke-linecap="round"/>');
    }

    // 臉：立體漸層取代平塗，加上顴骨/下顎兩側的陰影橢圓做臉型輪廓。
    p.push('<ellipse cx="48" cy="53" rx="' + headRx + '" ry="24" fill="url(#face_' + uid + ')"/>');
    p.push('<ellipse cx="' + (48 - headRx * 0.55) + '" cy="60" rx="' + (headRx * 0.32) + '" ry="7" fill="' + skinShadow + '" opacity="0.35"/>');
    p.push('<ellipse cx="' + (48 + headRx * 0.55) + '" cy="60" rx="' + (headRx * 0.32) + '" ry="7" fill="' + skinShadow + '" opacity="0.35"/>');
    p.push('<ellipse cx="' + (48 - headRx + 2) + '" cy="55" rx="3" ry="5.5" fill="' + skin + '" stroke="' + skinShadow + '" stroke-width="0.6"/>');
    p.push('<ellipse cx="' + (48 + headRx - 2) + '" cy="55" rx="3" ry="5.5" fill="' + skin + '" stroke="' + skinShadow + '" stroke-width="0.6"/>');

    // 眉毛：兩端粗細不同的錐形，比單純一條等寬線條更有神韻。
    const browY = 44 + browTilt;
    p.push('<path d="M 35 ' + (browY + 1) + ' Q 39 ' + (browY - 2) + ' 44 ' + browY + ' L 44 ' + (browY + 2) + ' Q 39 ' + browY + ' 35 ' + (browY + 2.5) + ' Z" fill="' + hairColor + '"/>');
    p.push('<path d="M 61 ' + (browY + 1) + ' Q 57 ' + (browY - 2) + ' 52 ' + browY + ' L 52 ' + (browY + 2) + ' Q 57 ' + browY + ' 61 ' + (browY + 2.5) + ' Z" fill="' + hairColor + '"/>');

    // 眼睛：眼白＋虹膜＋高光反光點＋上眼瞼線，取代單一色塊。
    [40, 56].forEach((ex) => {
      p.push('<ellipse cx="' + ex + '" cy="51" rx="3.4" ry="2.6" fill="#f2ece0"/>');
      p.push('<circle cx="' + ex + '" cy="51" r="2" fill="' + eyeColor + '"/>');
      p.push('<circle cx="' + (ex + 0.6) + '" cy="50.3" r="0.6" fill="#fff"/>');
      p.push('<path d="M ' + (ex - 3.6) + ' 49.8 Q ' + ex + ' 47.8 ' + (ex + 3.6) + ' 49.8" stroke="' + skinShadow + '" stroke-width="0.8" fill="none" stroke-linecap="round"/>');
    });

    // 鼻子：一道鼻樑陰影線＋鼻尖淺影，避免臉部只有眉眼嘴而顯得扁平。
    p.push('<path d="M 47 53 Q 45.5 58 46.5 61" stroke="' + skinShadow + '" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.6"/>');
    p.push('<ellipse cx="47" cy="61.5" rx="2.6" ry="1.4" fill="' + skinShadow + '" opacity="0.3"/>');

    // 嘴唇：用偏暖的唇色＋淺色下唇高光取代深咖啡色雙線（深色雙線在小尺寸下
    // 容易被誤認成鬍子，尤其是女性武將沒有鬍子時特別明顯）。
    const lipColor = '#8a4a42';
    p.push(archetype === 'warrior'
      ? '<path d="M 41 64 Q 48 61.5 55 64" stroke="' + lipColor + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
      : '<path d="M 42 64 Q 48 66.5 54 64" stroke="' + lipColor + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>');
    p.push('<path d="M 44 65.3 Q 48 66.2 52 65.3" stroke="' + shade(lipColor, 35) + '" stroke-width="0.7" fill="none" stroke-linecap="round" opacity="0.6"/>');

    if (hasBeard) {
      p.push('<path d="M 34 60 Q 48 84 62 60 L 58 68 Q 48 78 38 68 Z" fill="' + hairColor + '"/>');
      p.push('<path d="M 38 62 Q 48 78 58 62" stroke="' + hairHighlight + '" stroke-width="1" fill="none" opacity="0.4"/>');
      p.push('<path d="M 36 61 Q 48 81 60 61" stroke="' + shade(hairColor, -12) + '" stroke-width="0.8" fill="none" opacity="0.5"/>');
    }

    if (archetype === 'warrior') {
      p.push('<path d="M ' + (48 - headRx - 1) + ' 39 Q 48 10 ' + (48 + headRx + 1) + ' 39 L ' + (48 + headRx - 3) + ' 33 Q 48 21 ' + (48 - headRx + 3) + ' 33 Z" fill="url(#armor_' + uid + ')" stroke="' + rarityColor + '" stroke-width="2"/>');
      p.push('<path d="M ' + (48 - headRx + 2) + ' 35 Q 48 24 ' + (48 + headRx - 2) + ' 35" stroke="' + armorLight + '" stroke-width="1.2" fill="none" opacity="0.6"/>');
      p.push('<path d="M 48 12 L 44.5 5 L 51.5 5 Z" fill="' + rarityColor + '"/>');
    } else if (archetype === 'commander') {
      p.push('<path d="M ' + (48 - headRx) + ' 38 Q 48 15 ' + (48 + headRx) + ' 38 Z" fill="url(#hair_' + uid + ')"/>');
      p.push('<rect x="' + (48 - headRx) + '" y="30" width="' + (headRx * 2) + '" height="8" rx="4" fill="url(#armor_' + uid + ')" stroke="' + rarityColor + '" stroke-width="1.5"/>');
      p.push('<circle cx="48" cy="30" r="4" fill="' + rarityColor + '"/>');
    } else {
      p.push('<path d="M ' + (48 - headRx - 2) + ' 42 Q 48 9 ' + (48 + headRx + 2) + ' 42 Q ' + (48 + headRx - 2) + ' 50 48 46 Q ' + (48 - headRx + 2) + ' 50 ' + (48 - headRx - 2) + ' 42 Z" fill="#e9e2d0" stroke="' + factionColor + '" stroke-width="2"/>');
      p.push('<path d="M ' + (48 - headRx + 1) + ' 40 Q 48 14 ' + (48 + headRx - 1) + ' 40" stroke="#fff" stroke-width="1" fill="none" opacity="0.5"/>');
    }

    return '<svg viewBox="0 0 96 120" xmlns="http://www.w3.org/2000/svg" class="heroPortraitSvg">' + p.join('') + '</svg>';
  }

  /** 建立一個已套用武將立繪的 DOM 節點，附上稀有度外框樣式。 @returns {HTMLElement} */
  function heroPortraitEl(heroDef, className) {
    const U = window.Game.Utils;
    const box = U.el('div', 'heroPortraitBox' + (className ? ' ' + className : ''));
    box.innerHTML = buildHeroPortraitSvg(heroDef);
    return box;
  }

  window.Game.UI.HeroPortrait = { buildHeroPortraitSvg, archetypeOf, heroPortraitEl };
})();
