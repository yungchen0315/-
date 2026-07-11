/* ============================================================================
 * battleScreen.js — 回合制戰鬥動畫全螢幕疊層。
 * 讀取 combatSystem.resolveBattle() 產生的 timeline，逐回合播放攻防、技能特效與
 * 血量變化，播放完畢顯示勝負結果。純表演層，不做任何戰鬥計算或存檔異動
 * （勝負、掠奪、經驗等早已在呼叫方的 systems 層結算完畢）。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;
  const HP = window.Game.UI.HeroPortrait;

  const SPEED_MS = { 1: 900, 2: 420 };
  const TOKENS_PER_SIDE = 10;

  function deriveHeroDisplay(heroStateId, units, playerState, fallbackName, fallbackFactionId) {
    if (heroStateId) {
      const def = D.heroDefById(heroStateId);
      if (def) {
        let force = def.baseStats.force, cmd = def.baseStats.cmd, intel = def.baseStats.intel, level = 1;
        if (playerState && playerState.heroes && playerState.heroes[heroStateId]) {
          const heroState = playerState.heroes[heroStateId];
          const eff = window.Game.Systems.Hero.effectiveStats(heroState);
          force = eff.force; cmd = eff.cmd; intel = eff.intel; level = heroState.level;
        }
        return { name: def.name, level, force, cmd, intel, portraitDef: def };
      }
    }
    let atkSum = 0, defSum = 0, hpSum = 0, qtySum = 0;
    Object.keys(units || {}).forEach((t) => {
      const qty = units[t] || 0;
      if (!qty) return;
      const d = D.unitDefById(t);
      if (!d) return;
      atkSum += qty * d.stats.atk; defSum += qty * d.stats.def; hpSum += qty * d.stats.hp; qtySum += qty;
    });
    const avgAtk = qtySum ? atkSum / qtySum : 10, avgDef = qtySum ? defSum / qtySum : 8, avgHp = qtySum ? hpSum / qtySum : 50;
    const force = U.clamp(Math.round(avgAtk * 4.5), 30, 99);
    const cmd = U.clamp(Math.round(avgDef * 6 + Math.sqrt(qtySum) * 2), 30, 99);
    const intel = U.clamp(Math.round(35 + avgHp / 2.8), 20, 90);
    const rarity = qtySum >= 90 ? 4 : qtySum >= 40 ? 3 : 2;
    const portraitDef = {
      id: 'npc_' + (fallbackName || 'enemy'), name: fallbackName || '敵軍', factionId: fallbackFactionId || 'wei',
      rarity, baseStats: { force, cmd, intel }, gender: 'm',
      portraitColor: rarity >= 4 ? '#a15ec5' : rarity === 3 ? '#3a6bb0' : '#7a7a7a'
    };
    return { name: fallbackName || '敵軍', level: 1, force, cmd, intel, portraitDef };
  }

  function unitRow(units) {
    return Object.keys(units || {})
      .filter((t) => (units[t] || 0) > 0)
      .map((t) => ({ def: D.unitDefById(t), qty: units[t] }))
      .filter((e) => e.def)
      .sort((a, b) => b.qty - a.qty);
  }

  function pressureRow(label, atkVal, defVal) {
    const pct = defVal > 0 ? Math.round((atkVal / defVal) * 100) : 100;
    const row = U.el('div', 'battlePressureRow');
    row.appendChild(U.el('span', 'battlePressureVal', atkVal));
    row.appendChild(U.el('span', 'battlePressureLabel', label + '壓制'));
    row.appendChild(U.el('span', 'battlePressurePct' + (pct >= 100 ? ' battlePressureUp' : ' battlePressureDown'), pct + '%'));
    row.appendChild(U.el('span', 'battlePressureVal', defVal));
    return row;
  }

  /**
   * 依兵種組成按比例抽出最多 TOKENS_PER_SIDE 個圖示，用於沙場畫面上實際排開的
   * 一格格小兵，純視覺呈現（不影響戰鬥計算，計算仍以 combatSystem 的數值為準）。
   */
  function buildTokenIcons(units) {
    const rows = unitRow(units);
    if (rows.length === 0) return ['⚔'];
    const total = rows.reduce((s, e) => s + e.qty, 0) || 1;
    const icons = [];
    rows.forEach((e) => {
      const count = Math.max(1, Math.round((e.qty / total) * TOKENS_PER_SIDE));
      for (let i = 0; i < count && icons.length < TOKENS_PER_SIDE; i++) icons.push(e.def.icon);
    });
    while (icons.length < Math.min(TOKENS_PER_SIDE, total)) icons.push(rows[0].def.icon);
    return icons.slice(0, TOKENS_PER_SIDE);
  }

  function buildTokenCluster(units, extraClass) {
    const wrap = U.el('div', 'battleArmyCluster' + (extraClass ? ' ' + extraClass : ''));
    const tokenEls = buildTokenIcons(units).map((icon) => {
      const el = U.el('span', 'battleToken', icon);
      wrap.appendChild(el);
      return el;
    });
    return { wrap, tokenEls };
  }

  /** 依目前血量百分比，讓沙場上的小兵圖示逐漸消失，呈現「打到剩幾個人」的臨場感。 */
  function updateTokenLoss(tokenEls, hpPct) {
    const remaining = U.clamp(Math.round(tokenEls.length * hpPct / 100), 0, tokenEls.length);
    tokenEls.forEach((el, i) => { el.classList.toggle('battleTokenGone', i >= remaining); });
  }

  function replay(el, className) {
    el.classList.remove(className);
    // eslint-disable-next-line no-unused-expressions
    void el.offsetWidth;
    el.classList.add(className);
  }

  /**
   * @param {PlayerState} playerState 攻擊方（一定是玩家自己）。
   * @param {Object} opts
   * @param {string} opts.title
   * @param {string} [opts.attackerHeroStateId]
   * @param {Object<string,number>} opts.attackerUnitsBefore
   * @param {string} [opts.defenderHeroStateId]
   * @param {Object<string,number>} opts.defenderUnitsBefore
   * @param {string} opts.defenderName
   * @param {string} [opts.defenderFactionId]
   * @param {Array<Object>} opts.timeline
   * @param {boolean} opts.win
   * @param {string} opts.resultText
   * @param {() => void} onDone
   */
  function play(playerState, opts, onDone) {
    const attacker = deriveHeroDisplay(opts.attackerHeroStateId, opts.attackerUnitsBefore, playerState, '我軍', playerState.factionId);
    const defender = deriveHeroDisplay(opts.defenderHeroStateId, opts.defenderUnitsBefore, null, opts.defenderName, opts.defenderFactionId);
    const attackerTotalQty = Object.values(opts.attackerUnitsBefore || {}).reduce((a, b) => a + b, 0);
    const defenderTotalQty = Object.values(opts.defenderUnitsBefore || {}).reduce((a, b) => a + b, 0);

    const overlay = U.el('div', 'battleOverlay');
    const box = U.el('div', 'battleBox');

    const header = U.el('div', 'battleHeader');
    header.appendChild(U.el('span', 'battleTitle', opts.title));
    box.appendChild(header);

    const vsRow = U.el('div', 'battleVsRow');
    const atkCard = U.el('div', 'battleSideCard');
    atkCard.appendChild(HP.heroPortraitEl(attacker.portraitDef, 'battleSidePortrait'));
    atkCard.appendChild(U.el('div', 'battleSideName', attacker.name + (attacker.level > 1 ? ' Lv.' + attacker.level : '')));
    const atkHpBarWrap = U.el('div', 'battleHpBarWrap');
    const atkHpBar = U.el('div', 'battleHpBar');
    atkHpBarWrap.appendChild(atkHpBar);
    atkCard.appendChild(atkHpBarWrap);
    vsRow.appendChild(atkCard);

    const turnBox = U.el('div', 'battleTurnBox');
    const turnLabel = U.el('div', 'battleTurnLabel', '回合 0');
    turnBox.appendChild(U.el('div', 'battleVsText', 'VS'));
    turnBox.appendChild(turnLabel);
    vsRow.appendChild(turnBox);

    const defCard = U.el('div', 'battleSideCard battleSideCardRight');
    defCard.appendChild(HP.heroPortraitEl(defender.portraitDef, 'battleSidePortrait battleSidePortraitFlip'));
    defCard.appendChild(U.el('div', 'battleSideName', defender.name));
    const defHpBarWrap = U.el('div', 'battleHpBarWrap');
    const defHpBar = U.el('div', 'battleHpBar');
    defHpBarWrap.appendChild(defHpBar);
    defCard.appendChild(defHpBarWrap);
    vsRow.appendChild(defCard);
    box.appendChild(vsRow);

    const pressurePanel = U.el('div', 'battlePressurePanel');
    pressurePanel.appendChild(pressureRow('智力', attacker.intel, defender.intel));
    pressurePanel.appendChild(pressureRow('武力', attacker.force, defender.force));
    pressurePanel.appendChild(pressureRow('統帥', attacker.cmd, defender.cmd));
    box.appendChild(pressurePanel);

    // 沙場畫面：兩軍以小兵圖示實際排開，每回合攻方會朝中線衝刺、中線閃現交鋒
    // 特效，被攻擊的一方畫面震動並依傷害比例減少存活的小兵圖示。
    const stage = U.el('div', 'battleFieldStage');
    const atkCluster = buildTokenCluster(opts.attackerUnitsBefore, 'battleArmyClusterLeft');
    const impactSpark = U.el('div', 'battleImpactSpark', '💥');
    const defCluster = buildTokenCluster(opts.defenderUnitsBefore, 'battleArmyClusterRight');
    stage.appendChild(atkCluster.wrap);
    stage.appendChild(impactSpark);
    stage.appendChild(defCluster.wrap);
    box.appendChild(stage);

    const field = U.el('div', 'battleField');
    const atkTroops = U.el('div', 'battleTroopRow');
    unitRow(opts.attackerUnitsBefore).forEach((e) => {
      atkTroops.appendChild(U.el('span', 'battleTroopIcon', e.def.icon + '×' + e.qty +
        '<br><span class="battleTroopStat">攻' + e.def.stats.atk + ' 防' + e.def.stats.def + '</span>'));
    });
    field.appendChild(atkTroops);
    const flash = U.el('div', 'battleFlashText');
    field.appendChild(flash);
    const defTroops = U.el('div', 'battleTroopRow battleTroopRowRight');
    unitRow(opts.defenderUnitsBefore).forEach((e) => {
      defTroops.appendChild(U.el('span', 'battleTroopIcon', e.def.icon + '×' + e.qty +
        '<br><span class="battleTroopStat">攻' + e.def.stats.atk + ' 防' + e.def.stats.def + '</span>'));
    });
    field.appendChild(defTroops);
    box.appendChild(field);

    const defeatedCounter = U.el('div', 'battleDefeatedCounter', '累計擊敗部隊：0 / ' + defenderTotalQty);
    box.appendChild(defeatedCounter);

    const controls = U.el('div', 'battleControls');
    const speedBtn = U.el('button', 'battleSpeedBtn', 'x1');
    const skipBtn = U.el('button', 'battleSkipBtn', '跳過');
    controls.appendChild(speedBtn);
    controls.appendChild(skipBtn);
    box.appendChild(controls);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    let speed = 1;
    U.onTap(speedBtn, () => { speed = speed === 1 ? 2 : 1; speedBtn.textContent = 'x' + speed; });

    let idx = 0;
    let timer = null;
    const timeline = opts.timeline || [];

    function showFlash(text) {
      flash.textContent = text;
      replay(flash, 'battleFlashPlay');
    }

    /** 播放一次「攻方衝向中線→中線交鋒閃光→守方畫面震動」的沙場交戰動畫。 */
    function playClash(side) {
      const chargingCluster = side === 'attacker' ? atkCluster.wrap : defCluster.wrap;
      const hitCluster = side === 'attacker' ? defCluster.wrap : atkCluster.wrap;
      replay(chargingCluster, 'battleCharging');
      replay(impactSpark, 'battleImpactPlay');
      replay(hitCluster, 'battleShaking');
    }

    function renderResult() {
      const resultBox = U.el('div', 'battleResultBox');
      resultBox.appendChild(U.el('div', 'battleResultTitle' + (opts.win ? ' battleResultWin' : ' battleResultLose'), opts.win ? '勝利' : '戰敗'));
      resultBox.appendChild(U.el('div', 'battleResultText', opts.resultText || ''));
      const closeBtn = U.el('button', 'setupBtn battleResultCloseBtn', '確定');
      resultBox.appendChild(closeBtn);
      box.appendChild(resultBox);
      U.onTap(closeBtn, () => {
        document.body.removeChild(overlay);
        if (onDone) onDone();
      });
    }

    function step() {
      const ev = timeline[idx];
      idx++;
      if (ev.type === 'skill') {
        showFlash('【' + ev.skillName + '】');
      } else if (ev.type === 'attack') {
        turnLabel.textContent = '回合 ' + ev.turn;
        showFlash((ev.side === 'attacker' ? '我軍' : defender.name) + ' 造成 ' + ev.damage + ' 傷害');
        playClash(ev.side);
        atkHpBar.style.width = Math.max(0, ev.atkHpPct) + '%';
        defHpBar.style.width = Math.max(0, ev.defHpPct) + '%';
        atkTroops.style.opacity = Math.max(0.25, ev.atkHpPct / 100);
        defTroops.style.opacity = Math.max(0.25, ev.defHpPct / 100);
        updateTokenLoss(atkCluster.tokenEls, ev.atkHpPct);
        updateTokenLoss(defCluster.tokenEls, ev.defHpPct);
        defeatedCounter.textContent = '累計擊敗部隊：' + Math.round(defenderTotalQty * (1 - ev.defHpPct / 100)) + ' / ' + defenderTotalQty;
      } else if (ev.type === 'victory') {
        showFlash(ev.side === 'attacker' ? '我軍獲勝！' : defender.name + ' 獲勝！');
      }
      if (idx >= timeline.length) {
        controls.style.display = 'none';
        renderResult();
      }
    }

    function tick() {
      step();
      if (idx < timeline.length) timer = setTimeout(tick, SPEED_MS[speed] || 900);
    }
    tick();

    U.onTap(skipBtn, () => {
      clearTimeout(timer);
      while (idx < timeline.length) {
        const ev = timeline[idx];
        idx++;
        if (ev.type === 'attack') {
          atkHpBar.style.width = Math.max(0, ev.atkHpPct) + '%';
          defHpBar.style.width = Math.max(0, ev.defHpPct) + '%';
          turnLabel.textContent = '回合 ' + ev.turn;
          updateTokenLoss(atkCluster.tokenEls, ev.atkHpPct);
          updateTokenLoss(defCluster.tokenEls, ev.defHpPct);
          defeatedCounter.textContent = '累計擊敗部隊：' + Math.round(defenderTotalQty * (1 - ev.defHpPct / 100)) + ' / ' + defenderTotalQty;
        }
      }
      controls.style.display = 'none';
      renderResult();
    });
  }

  window.Game.UI.BattleScreen = { play, deriveHeroDisplay };
})();
