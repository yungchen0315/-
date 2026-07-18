/* ============================================================================
 * sprites.js — 全部像素圖資料。每張 sprite 是一個 w×h 的色鍵網格（值為
 * PALETTE 的 key 字串，null 表示透明），在載入時用幾何輔助函式建構一次，
 * 之後由 ui/pixelRenderer.js 純粹讀取繪製，不重算。
 * 動畫：需要 2 幀交替的 sprite 額外提供 frame1（第二幀），沒有則靜態。
 * ==========================================================================*/
(function () {
  function makeGrid(w, h) { return Array.from({ length: h }, () => new Array(w).fill(null)); }
  function setPx(g, x, y, c) { const h = g.length, w = g[0].length; if (y >= 0 && y < h && x >= 0 && x < w) g[y][x] = c; }
  function rect(g, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) setPx(g, x + i, y + j, c); }
  function circle(g, cx, cy, r, c) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 0.6) setPx(g, cx + x, cy + y, c); }
  function ellipse(g, cx, cy, rx, ry, c) { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) setPx(g, cx + x, cy + y, c); }
  function hline(g, x, y, len, c) { for (let i = 0; i < len; i++) setPx(g, x + i, y, c); }
  function vline(g, x, y, len, c) { for (let i = 0; i < len; i++) setPx(g, x, y + i, c); }
  function dots(g, pts, c) { pts.forEach(([x, y]) => setPx(g, x, y, c)); }
  function clone(g) { return g.map((row) => row.slice()); }

  const SPRITES = {};

  /* ---------------------------------------------------------------- 核心 */

  SPRITES.hull = (() => {
    const w = 24, h = 24;
    const g = makeGrid(w, h);
    // 圓角膠囊船身，底部陰影，頂部纜繩接點，正面舷窗，下方探照燈斗。
    ellipse(g, 12, 11, 8, 7, 'HULL');
    rect(g, 4, 11, 16, 6, 'HULL');
    ellipse(g, 12, 16, 8, 5, 'HULL2');
    rect(g, 4, 13, 16, 3, 'HULL2');
    vline(g, 12, 0, 4, 'BORDER');
    rect(g, 9, 8, 6, 5, 'GLOW2');
    rect(g, 10, 9, 4, 3, 'GLOW');
    rect(g, 9, 19, 6, 4, 'HULL2');
    rect(g, 10, 20, 4, 3, 'GLOW');
    return { w, h, colors: ['HULL', 'HULL2', 'BORDER', 'GLOW', 'GLOW2'], grid: g };
  })();

  function iconSprite(build) {
    const w = 8, h = 8;
    const g = makeGrid(w, h);
    build(g);
    return { w, h, grid: g };
  }

  SPRITES.icon_glow = iconSprite((g) => {
    dots(g, [[3, 0], [4, 0], [2, 1], [5, 1], [1, 2], [6, 2], [1, 3], [6, 3], [1, 4], [6, 4], [2, 5], [5, 5], [3, 6], [4, 6]], 'GLOW');
    rect(g, 3, 3, 2, 2, 'GLOW2');
  });
  SPRITES.icon_sample = iconSprite((g) => {
    rect(g, 3, 0, 2, 2, 'BORDER');
    vline(g, 2, 2, 4, 'BORDER'); vline(g, 5, 2, 4, 'BORDER');
    rect(g, 2, 4, 4, 2, 'AMBER');
    hline(g, 2, 6, 4, 'BORDER');
  });
  SPRITES.icon_core = iconSprite((g) => {
    dots(g, [[3, 0], [4, 0]], 'VIOLET');
    rect(g, 2, 1, 4, 5, 'VIOLET');
    dots(g, [[3, 6], [4, 6]], 'VIOLET');
    dots(g, [[2, 2], [3, 1]], 'PEARL');
  });
  SPRITES.icon_pearl = iconSprite((g) => {
    circle(g, 4, 4, 3, 'PEARL');
    dots(g, [[3, 2]], 'TEXT');
  });
  SPRITES.icon_anchor = iconSprite((g) => {
    hline(g, 2, 1, 4, 'BORDER');
    vline(g, 4, 1, 5, 'BORDER');
    dots(g, [[2, 5], [6, 5], [2, 6], [6, 6], [3, 6], [5, 6]], 'BORDER');
  });

  /* ------------------------------------------------------------ 模組圖示 */

  function modSprite(build) {
    const w = 16, h = 16;
    const g = makeGrid(w, h);
    build(g);
    return { w, h, grid: g };
  }

  SPRITES.mod_jelly = modSprite((g) => {
    ellipse(g, 8, 4, 5, 3, 'PINK');
    rect(g, 3, 4, 10, 2, 'PINK');
    for (let t = 0; t < 3; t++) { vline(g, 5 + t * 3, 7, 3, 'PINK'); vline(g, 5 + t * 3, 11, 2, 'PINK'); }
    dots(g, [[8, 4]], 'GLOW2');
  });
  SPRITES.mod_moss = modSprite((g) => {
    rect(g, 2, 5, 12, 7, 'BORDER');
    dots(g, [[4, 7], [7, 6], [10, 8], [5, 9], [9, 10], [12, 7], [3, 10], [11, 9]], 'GLOW');
  });
  SPRITES.mod_buoy = modSprite((g) => {
    circle(g, 7, 6, 4, 'HULL');
    ellipse(g, 7, 11, 3, 3, 'HULL2');
    dots(g, [[12, 4], [13, 5], [12, 6]], 'FOAM');
    dots(g, [[13, 7], [14, 8], [13, 9]], 'FOAM');
  });
  SPRITES.mod_coral = modSprite((g) => {
    vline(g, 4, 6, 8, 'PINK'); vline(g, 8, 4, 10, 'PINK'); vline(g, 12, 7, 7, 'PINK');
    hline(g, 3, 6, 2, 'PINK'); hline(g, 7, 4, 2, 'PINK'); hline(g, 11, 7, 2, 'PINK');
    dots(g, [[4, 5], [8, 3], [12, 6]], 'GLOW');
  });
  SPRITES.mod_vent = modSprite((g) => {
    const g2 = g;
    // 錐形煙囪。
    for (let row = 0; row < 8; row++) { const width = 10 - row; hline(g2, 8 - Math.floor(width / 2), 14 - row, width, row < 2 ? 'BORDER' : 'INK'); }
    dots(g2, [[7, 4], [8, 2], [9, 5]], 'RED');
    dots(g2, [[8, 0], [7, 1]], 'AMBER');
  });
  SPRITES.mod_whalefall = modSprite((g) => {
    for (let i = 0; i < 5; i++) { const cx = 2 + i * 3; ellipse(g, cx, 8, 2, 5, 'DIM'); }
    dots(g, [[3, 8], [7, 7], [11, 9]], 'GLOW');
  });

  /* -------------------------------------------------------------- 生物 */

  function creatureSprite(w, h, build) {
    const g = makeGrid(w, h);
    build(g);
    return { w, h, grid: g };
  }

  SPRITES.c_moonjelly = creatureSprite(16, 16, (g) => {
    ellipse(g, 8, 5, 6, 4, 'FOAM');
    for (let x = 3; x <= 13; x += 2) for (let y = 2; y <= 8; y += 2) if (Math.random() < 0.4) setPx(g, x, y, null);
    for (let t = 0; t < 4; t++) vline(g, 4 + t * 3, 9, 5, 'FOAM');
    dots(g, [[8, 4]], 'GLOW2');
  });
  SPRITES.c_sardine = creatureSprite(24, 16, (g) => {
    const rows = [3, 5, 8, 10, 6, 12, 4];
    rows.forEach((y, i) => { const x = 2 + i * 3; rect(g, x, y, 3, 1, 'BLUE'); setPx(g, x - 1, y, 'DIM'); });
  });
  SPRITES.c_turtle = creatureSprite(16, 16, (g) => {
    ellipse(g, 8, 8, 6, 4, 'HULL2');
    dots(g, [[5, 6], [8, 6], [11, 6], [5, 10], [8, 10], [11, 10]], 'BORDER');
    rect(g, 1, 8, 3, 2, 'DIM');
    rect(g, 12, 8, 3, 2, 'DIM');
    rect(g, 6, 3, 4, 2, 'DIM');
  });
  SPRITES.c_sunfish = creatureSprite(16, 16, (g) => {
    circle(g, 8, 8, 6, 'BLUE');
    rect(g, 7, 0, 2, 3, 'BLUE');
    rect(g, 7, 13, 2, 3, 'BLUE');
    dots(g, [[10, 6]], 'VIOLET');
  });
  SPRITES.c_hatchet = creatureSprite(16, 16, (g) => {
    for (let row = 0; row < 10; row++) { const width = 12 - Math.abs(row - 4); rect(g, 8 - Math.floor(width / 2), 3 + row, width, 1, 'INK'); }
    dots(g, [[5, 9], [7, 10], [9, 10], [11, 9]], 'GLOW');
    dots(g, [[9, 5]], 'PEARL');
  });
  SPRITES.c_krill = creatureSprite(16, 16, (g) => {
    const pts = [[4, 4], [7, 3], [9, 5], [6, 6], [8, 7], [10, 8], [5, 9], [7, 10], [9, 11], [6, 12], [8, 5], [11, 6]];
    dots(g, pts, 'PINK');
  });
  SPRITES.c_siphon = creatureSprite(24, 8, (g) => {
    for (let i = 0; i < 6; i++) { ellipse(g, 2 + i * 4, 4, 2, 3, i % 2 === 0 ? 'FOAM' : 'PINK'); }
  });
  SPRITES.c_vampsquid = creatureSprite(16, 16, (g) => {
    ellipse(g, 8, 5, 5, 4, 'INK');
    for (let t = 0; t < 8; t++) setPx(g, 3 + t, 9, 'INK');
    dots(g, [[5, 4], [11, 4]], 'RED');
  });
  SPRITES.c_angler = creatureSprite(16, 16, (g) => {
    ellipse(g, 9, 9, 6, 5, 'INK');
    dots(g, [[5, 12], [7, 13], [9, 12]], 'PEARL');
    vline(g, 12, 4, 5, 'INK');
    dots(g, [[13, 3]], 'GLOW2');
  });
  SPRITES.c_gulper = creatureSprite(24, 8, (g) => {
    for (let i = 0; i < 18; i++) { const y = 4 + Math.round(Math.sin(i / 3) * 1.5); setPx(g, i, y, 'INK'); }
    ellipse(g, 20, 4, 3, 3, 'INK');
    dots(g, [[19, 4]], 'RED');
    dots(g, [[0, 4]], 'GLOW');
  });
  SPRITES.c_isopod = creatureSprite(16, 16, (g) => {
    ellipse(g, 8, 8, 6, 5, 'DIM');
    for (let x = 3; x <= 13; x += 2) vline(g, x, 4, 8, 'BORDER');
    dots(g, [[2, 7], [2, 9], [14, 7], [14, 9]], 'BORDER');
    dots(g, [[6, 6], [10, 6]], 'AMBER');
  });
  SPRITES.c_barreleye = creatureSprite(16, 16, (g) => {
    ellipse(g, 9, 8, 6, 4, 'INK');
    for (let x = 4; x <= 8; x++) for (let y = 5; y <= 11; y++) if ((x + y) % 2 === 0) setPx(g, x, y, 'FOAM');
    dots(g, [[5, 7], [5, 9]], 'GLOW');
  });

  window.App.Data.SPRITES = SPRITES;
})();
