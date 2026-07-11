/* ============================================================================
 * heroPortrait.js — 依 HeroData 決定性地產生風格化 SVG 半身像。
 * 沒有美術素材／圖像生成工具可用，改用向量圖形（幾何色塊）拼出每位武將
 * 獨特但一致風格的畫面：陣營色（甲冑/頭冠）＋稀有度色（外框）＋依三圍數值
 * 判斷的「武將／統帥／謀士」造型原型＋以 id 雜湊決定的髮色/膚色/鬍鬚等小變化。
 * ==========================================================================*/

(function () {
  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  const SKIN_TONES = ['#e8c39e', '#dba874', '#f2d3ab', '#c98f5e'];
  const HAIR_COLORS = ['#1b1b1b', '#2c2320', '#3a3a3a', '#54443a'];

  /** @param {HeroData} heroDef @returns {'warrior'|'commander'|'strategist'} */
  function archetypeOf(heroDef) {
    const { force, cmd, intel } = heroDef.baseStats;
    if (intel >= force && intel >= cmd) return 'strategist';
    if (cmd >= force && cmd >= intel) return 'commander';
    return 'warrior';
  }

  /**
   * @param {HeroData} heroDef
   * @returns {string} 一段可直接塞進 innerHTML 的 <svg> 標記字串。
   */
  function buildHeroPortraitSvg(heroDef) {
    const h = hashStr(heroDef.id);
    const faction = window.Game.Data.factionDefById(heroDef.factionId);
    const factionColor = faction ? faction.color : '#888';
    const rarityColor = heroDef.portraitColor || '#7a7a7a';
    const gender = heroDef.gender || 'm';
    const archetype = archetypeOf(heroDef);
    const skin = SKIN_TONES[h % SKIN_TONES.length];
    const hairColor = HAIR_COLORS[(h >> 2) % HAIR_COLORS.length];
    const hasBeard = gender === 'm' && archetype !== 'strategist' && (h >> 4) % 5 < 3;
    const faceWide = (h >> 6) % 2 === 0;
    const headRx = faceWide ? 21 : 18;

    const p = [];
    p.push('<rect x="3" y="3" width="90" height="114" rx="10" fill="#1c1712" stroke="' + rarityColor + '" stroke-width="3"/>');

    const shoulderWidth = faceWide ? 32 : 28;
    p.push('<path d="M ' + (48 - shoulderWidth) + ' 118 Q 48 ' + (archetype === 'strategist' ? 90 : 84) + ' ' + (48 + shoulderWidth) + ' 118 Z" fill="' + factionColor + '" stroke="' + rarityColor + '" stroke-width="2"/>');
    p.push('<rect x="41" y="68" width="14" height="18" fill="' + skin + '"/>');

    if (gender === 'f') {
      p.push('<path d="M ' + (48 - headRx) + ' 44 Q ' + (48 - headRx - 7) + ' 82 ' + (48 - headRx + 3) + ' 104" stroke="' + hairColor + '" stroke-width="7" fill="none" stroke-linecap="round"/>');
      p.push('<path d="M ' + (48 + headRx) + ' 44 Q ' + (48 + headRx + 7) + ' 82 ' + (48 + headRx - 3) + ' 104" stroke="' + hairColor + '" stroke-width="7" fill="none" stroke-linecap="round"/>');
    }

    p.push('<ellipse cx="48" cy="52" rx="' + headRx + '" ry="23" fill="' + skin + '"/>');
    p.push('<ellipse cx="' + (48 - headRx + 2) + '" cy="54" rx="3" ry="5" fill="' + skin + '"/>');
    p.push('<ellipse cx="' + (48 + headRx - 2) + '" cy="54" rx="3" ry="5" fill="' + skin + '"/>');

    if (archetype === 'warrior') {
      p.push('<path d="M 35 43 L 43 40" stroke="' + hairColor + '" stroke-width="2.5" stroke-linecap="round"/>');
      p.push('<path d="M 53 40 L 61 43" stroke="' + hairColor + '" stroke-width="2.5" stroke-linecap="round"/>');
    } else {
      p.push('<path d="M 37 42 L 44 41.5" stroke="' + hairColor + '" stroke-width="2" stroke-linecap="round"/>');
      p.push('<path d="M 52 41.5 L 59 42" stroke="' + hairColor + '" stroke-width="2" stroke-linecap="round"/>');
    }
    p.push('<ellipse cx="40" cy="50" rx="2.6" ry="2" fill="#1c1712"/>');
    p.push('<ellipse cx="56" cy="50" rx="2.6" ry="2" fill="#1c1712"/>');
    p.push(archetype === 'warrior'
      ? '<path d="M 41 61 Q 48 58 55 61" stroke="#5a2e1f" stroke-width="2" fill="none" stroke-linecap="round"/>'
      : '<path d="M 42 60 Q 48 63 54 60" stroke="#5a2e1f" stroke-width="1.6" fill="none" stroke-linecap="round"/>');

    if (hasBeard) {
      p.push('<path d="M 34 58 Q 48 80 62 58 L 58 65 Q 48 74 38 65 Z" fill="' + hairColor + '"/>');
    }

    if (archetype === 'warrior') {
      p.push('<path d="M ' + (48 - headRx - 1) + ' 39 Q 48 10 ' + (48 + headRx + 1) + ' 39 L ' + (48 + headRx - 3) + ' 33 Q 48 21 ' + (48 - headRx + 3) + ' 33 Z" fill="' + factionColor + '" stroke="' + rarityColor + '" stroke-width="2"/>');
      p.push('<path d="M 48 11 L 44 2 L 52 2 Z" fill="' + rarityColor + '"/>');
    } else if (archetype === 'commander') {
      p.push('<path d="M ' + (48 - headRx) + ' 38 Q 48 15 ' + (48 + headRx) + ' 38 Z" fill="' + hairColor + '"/>');
      p.push('<rect x="' + (48 - headRx) + '" y="30" width="' + (headRx * 2) + '" height="8" rx="4" fill="' + factionColor + '" stroke="' + rarityColor + '" stroke-width="1.5"/>');
      p.push('<circle cx="48" cy="30" r="4" fill="' + rarityColor + '"/>');
    } else {
      p.push('<path d="M ' + (48 - headRx - 2) + ' 42 Q 48 9 ' + (48 + headRx + 2) + ' 42 Q ' + (48 + headRx - 2) + ' 50 48 46 Q ' + (48 - headRx + 2) + ' 50 ' + (48 - headRx - 2) + ' 42 Z" fill="#e9e2d0" stroke="' + factionColor + '" stroke-width="2"/>');
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
