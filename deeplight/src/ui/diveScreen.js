/* ============================================================================
 * diveScreen.js — 「潛航」主畫面：海域場景、點擊採光、路過生物點擊收集、
 * 錨點閘門按鈕。生物用個別 canvas sprite + CSS transition 橫向漂過畫面，
 * 不用單一大 canvas 手刻動畫迴圈，較不容易出現碰撞判定錯誤。
 * ==========================================================================*/
(function () {
  const U = window.App.Utils;
  const D = window.App.Data;
  const PR = window.App.UI.PixelRenderer;
  const Econ = window.App.Systems.Economy;
  const Descent = window.App.Systems.Descent;
  const Creature = window.App.Systems.Creature;
  const Modals = window.App.UI.Modals;
  const Toast = window.App.UI.Toast;

  let sceneEl = null;
  let hudRefs = null;
  let spawnTimeoutId = null;
  let saveRef = null;
  let onChangeRef = null;
  let active = false;

  function render(container, save, onChange) {
    saveRef = save;
    onChangeRef = onChange;
    active = true;
    U.clearNode(container);

    const scene = U.el('div', 'diveScene');
    sceneEl = scene;
    container.appendChild(scene);

    // 海洋雪：固定數量的漂浮粒子，CSS 動畫各自隨機延遲/速度。
    for (let i = 0; i < 14; i++) {
      const snow = U.el('div', 'oceanSnow');
      snow.style.left = Math.random() * 100 + '%';
      snow.style.animationDelay = (Math.random() * 8) + 's';
      snow.style.animationDuration = (6 + Math.random() * 6) + 's';
      scene.appendChild(snow);
    }

    // 燈暈：3 圈同心方環，半徑依螢光/秒對數映射（不用平滑漸層，維持像素感）。
    const haloWrap = U.el('div', 'haloWrap');
    for (let i = 0; i < 3; i++) haloWrap.appendChild(U.el('div', 'haloRing haloRing' + i));
    scene.appendChild(haloWrap);

    // 潛燈號本體。
    const hullWrap = U.el('div', 'hullWrap');
    hullWrap.appendChild(PR.spriteCanvasEl('hull', 4));
    scene.appendChild(hullWrap);

    // 待領取的離線生物徽章。
    const pendingBadge = U.el('div', 'pendingBadge');
    scene.appendChild(pendingBadge);
    U.onTap(pendingBadge, () => claimPending());

    // 錨點閘門按鈕。
    const gateBtn = U.el('button', 'gateBtn', '');
    scene.appendChild(gateBtn);
    U.onTap(gateBtn, () => passGate());

    // 深度尺 + 海域名稱。
    const depthLabel = U.el('div', 'depthLabel', '');
    scene.appendChild(depthLabel);

    hudRefs = { haloWrap, pendingBadge, gateBtn, depthLabel };

    // 點擊水域＝手動採光（點在生物/按鈕上時各自的 handler 會 stopPropagation）。
    U.onTap(scene, (e) => {
      if (e && e.target && e.target.closest && (e.target.closest('.creatureSprite') || e.target.closest('.gateBtn') || e.target.closest('.pendingBadge'))) return;
      tapWater();
    });

    scheduleSpawn();
    tick(save);
  }

  function tapWater() {
    const B = D.BALANCE;
    saveRef.glow += B.CLICK_TAP_GLOW;
    saveRef.stats.totalTaps += 1;
    spawnTapParticle();
    if (onChangeRef) onChangeRef();
  }

  function spawnTapParticle() {
    if (!sceneEl) return;
    const p = U.el('div', 'tapParticle', '+' + D.BALANCE.CLICK_TAP_GLOW);
    p.style.left = (40 + Math.random() * 20) + '%';
    p.style.top = (55 + Math.random() * 10) + '%';
    sceneEl.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }

  function scheduleSpawn() {
    if (!active) return;
    const delay = Creature.nextSpawnDelayMs(saveRef);
    spawnTimeoutId = setTimeout(spawnCreature, delay);
  }

  function spawnCreature() {
    if (!active || !sceneEl) return;
    const def = Creature.rollSpecies(saveRef);
    if (!def) { scheduleSpawn(); return; }
    const sprite = D.SPRITES[def.icon];
    const scale = 3;
    const wrap = U.el('div', 'creatureSprite' + (def.rare ? ' creatureRare' : ''));
    wrap.appendChild(PR.spriteCanvasEl(def.icon, scale));
    const topPct = 20 + Math.random() * 45;
    wrap.style.top = topPct + '%';
    const goingRight = Math.random() < 0.5;
    wrap.style.left = goingRight ? '-15%' : '110%';
    sceneEl.appendChild(wrap);

    const lifespanMs = 9000 + Math.random() * 3000;
    requestAnimationFrame(() => {
      wrap.style.transition = 'left ' + (lifespanMs / 1000) + 's linear';
      wrap.style.left = goingRight ? '110%' : '-15%';
    });

    let collected = false;
    U.onTap(wrap, () => {
      if (collected) return;
      collected = true;
      const result = Creature.collect(saveRef, def.id);
      wrap.remove();
      if (result.ok) {
        Toast.toast('+' + U.formatNum(result.burst) + ' 螢光' + (result.gotSample ? '　+1 樣本' : ''));
        if (result.isFirst) Modals.showDiscoveryCard(def);
        checkAchievements();
        if (onChangeRef) onChangeRef();
      }
    });

    const timeoutId = setTimeout(() => { if (!collected) wrap.remove(); }, lifespanMs + 200);
    wrap.addEventListener('transitionend', () => { clearTimeout(timeoutId); if (!collected) wrap.remove(); });

    scheduleSpawn();
  }

  function claimPending() {
    const result = Creature.claimPending(saveRef);
    if (!result.ok) { Toast.toast(result.reason || '沒有待領取的生物'); return; }
    Toast.toast('+' + U.formatNum(result.burst) + ' 螢光' + (result.gotSample ? '　+1 樣本' : ''));
    if (result.isFirst) Modals.showDiscoveryCard(result.def);
    checkAchievements();
    if (onChangeRef) onChangeRef();
    tick(saveRef);
  }

  function passGate() {
    const result = Descent.passGate(saveRef);
    if (!result.ok) { Toast.toast(result.reason); return; }
    Toast.toast('已加固艙體，進入「' + result.zone.name + '」');
    if (onChangeRef) onChangeRef();
    tick(saveRef);
  }

  function checkAchievements() {
    const newly = window.App.Systems.Achievement.checkAchievements(saveRef);
    newly.forEach((a) => Toast.toast('成就解鎖：' + a.name + (a.pearl ? '　+' + a.pearl + ' 珍珠' : '')));
  }

  /** 由 bootstrap 每個 tick 呼叫，只更新數字/樣式，不重建生物節點（避免打斷 CSS transition）。 */
  function tick(save) {
    if (!active || !hudRefs) return;
    saveRef = save;
    const gps = Econ.glowPerSec(save);
    const radius = 24 + 8 * Math.log10(1 + gps);
    hudRefs.haloWrap.querySelectorAll('.haloRing').forEach((ring, i) => {
      const r = radius + i * 14;
      ring.style.width = (r * 2) + 'px';
      ring.style.height = (r * 2) + 'px';
      ring.style.marginLeft = (-r) + 'px';
      ring.style.marginTop = (-r) + 'px';
    });

    hudRefs.pendingBadge.textContent = save.pendingCreatures > 0 ? ('🔔 ' + save.pendingCreatures) : '';
    hudRefs.pendingBadge.style.display = save.pendingCreatures > 0 ? 'block' : 'none';

    const zone = D.zoneForDepth(save.depth) || D.ZONE_DEFS[0];
    sceneEl.style.background = D.PALETTE[zone.bg];
    hudRefs.depthLabel.textContent = Math.floor(save.depth) + ' m　' + zone.name;

    if (Descent.atGate(save)) {
      const z = D.zoneById(save.currentZone);
      hudRefs.gateBtn.textContent = '加固艙體 · ' + U.formatNum(z.gateCost) + ' 螢光';
      hudRefs.gateBtn.style.display = 'block';
      hudRefs.gateBtn.classList.toggle('gateBtnReady', save.glow >= z.gateCost);
    } else {
      hudRefs.gateBtn.style.display = 'none';
    }
  }

  function deactivate() {
    active = false;
    if (spawnTimeoutId) clearTimeout(spawnTimeoutId);
    spawnTimeoutId = null;
  }

  window.App.UI.DiveScreen = { render, tick, deactivate };
})();
