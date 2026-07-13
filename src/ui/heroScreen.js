/* ============================================================================
 * heroScreen.js — 「武將」分頁：名錄、裝備庫。對應舊版 js/generals.js。
 * 武將的取得（劇情解鎖／酒館招募）改到「招募」分頁（src/ui/gachaScreen.js）。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;
  const Dlg = window.Game.UI.Dialog;
  const SLOT_LABELS = { weapon: '武器', armor: '甲冑', mount: '坐騎', accessory: '寶物' };
  const RARITY_LABELS = { 2: '一般', 3: '精良', 4: '名將', 5: '絕世' };

  function rarityStars(rarity) { return '★'.repeat(rarity) + '☆'.repeat(5 - rarity); }

  /**
   * 戰法區塊：顯示武將自帶戰法（唯讀）＋已裝配的傳授戰法（可點擊卸下），以及在還有
   * 空欄時提供一個下拉選單，把其他已擁有武將的招牌戰法傳授過來。
   */
  function buildTacticSection(body, container, saveGame, playerState, heroState, def) {
    const Hero = window.Game.Systems.Hero;
    const line = U.el('div', 'tacticLine');
    line.appendChild(U.el('span', 'tacticChip tacticChipInnate', '自帶【' + def.skill.name + '】'));
    (heroState.tactics || []).forEach((tid) => {
      const t = D.tacticDefById(tid);
      if (!t) return;
      const chip = U.el('span', 'tacticChip tacticChipFilled', '戰法【' + t.name + '】✕');
      U.onTap(chip, () => { Hero.unequipTactic(playerState, heroState.heroDataId, tid); render(container, saveGame, playerState); });
      line.appendChild(chip);
    });
    body.appendChild(line);

    if ((heroState.tactics || []).length >= Hero.TACTIC_SLOTS) return;
    const avail = Hero.availableTacticsForHero(playerState, heroState.heroDataId);
    if (avail.length === 0) return;
    const row = U.el('div', 'tacticEquipRow');
    const select = document.createElement('select');
    select.className = 'armySelect';
    avail.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.id;
      const eff = D.describeSkillEffects(t.effects);
      opt.textContent = t.name + (eff ? '（' + eff + '）' : '');
      select.appendChild(opt);
    });
    row.appendChild(select);
    const btn = U.el('button', 'smallBtn', '裝配戰法');
    U.onTap(btn, () => {
      const r = Hero.equipTactic(playerState, heroState.heroDataId, select.value);
      if (r.ok) render(container, saveGame, playerState); else Dlg.toast(r.reason);
    });
    row.appendChild(btn);
    body.appendChild(row);
  }

  /** 戰法庫總覽：列出玩家目前擁有的全部戰法（招牌＋已習得獨立），顯示效果與裝配狀態。 */
  function buildTacticLibraryPanel(playerState) {
    const Hero = window.Game.Systems.Hero;
    const panel = U.el('div', 'panel');
    const owned = (D.TACTIC_DEFS || []).filter((t) => Hero.ownsTactic(playerState, t.id));
    panel.appendChild(U.el('div', 'panelTitle', '戰法庫（' + owned.length + ' / ' + (D.TACTIC_DEFS || []).length + ' 種）'));
    panel.appendChild(U.el('div', 'subHint', '獨立戰法靠擊破據點掉落兵書習得；招牌戰法擁有該武將即可傳授。於上方各武將卡裝配（每名武將最多 ' + Hero.TACTIC_SLOTS + ' 個）。'));

    // 建立「戰法 -> 目前裝配在哪位武將」對照。
    const equippedOn = {};
    Object.values(playerState.heroes).forEach((h) => (h.tactics || []).forEach((tid) => { equippedOn[tid] = h.heroDataId; }));

    owned.slice().sort((a, b) => (b.rarity - a.rarity) || a.name.localeCompare(b.name)).forEach((t) => {
      const row = U.el('div', 'tacticLibRow');
      const star = U.el('span', 'tacticLibStar', '★' + t.rarity);
      row.appendChild(star);
      row.appendChild(U.el('span', 'tacticLibName', t.name));
      row.appendChild(U.el('span', 'tacticLibEff', D.describeSkillEffects(t.effects)));
      const wearer = equippedOn[t.id];
      row.appendChild(U.el('span', 'tacticLibState' + (wearer ? ' tacticLibEquipped' : ''),
        wearer ? '裝於 ' + (D.heroDefById(wearer) || {}).name : (t.sourceHeroId ? '招牌' : '可裝配')));
      panel.appendChild(row);
    });
    if (owned.length === 0) panel.appendChild(U.el('div', 'emptyHint', '尚無戰法，擊破據點可掉落兵書習得。'));
    return panel;
  }

  function render(container, saveGame, playerState) {
    U.clearNode(container);
    const Hero = window.Game.Systems.Hero;

    const rosterPanel = U.el('div', 'panel');
    const heroList = Object.values(playerState.heroes);
    rosterPanel.appendChild(U.el('div', 'panelTitle', '武將名錄（' + heroList.length + '）'));
    const rosterListEl = U.el('div', 'generalList');
    heroList.forEach((heroState) => {
      const def = D.heroDefById(heroState.heroDataId);
      if (!def) return;
      const stats = Hero.effectiveStats(heroState);
      const card = U.el('div', 'generalCard');
      card.appendChild(window.Game.UI.HeroPortrait.heroPortraitEl(def));
      const body = U.el('div', 'generalBody');
      const head = U.el('div', 'generalHead');
      head.appendChild(U.el('span', 'generalName', def.name));
      head.appendChild(U.el('span', 'generalLevel', 'Lv.' + heroState.level));
      body.appendChild(head);
      const rarityRow = U.el('div', 'generalRarity', rarityStars(def.rarity) + '　' + (RARITY_LABELS[def.rarity] || ''));
      rarityRow.style.color = def.portraitColor;
      body.appendChild(rarityRow);
      body.appendChild(U.el('div', 'generalStats', '武力 ' + stats.force + '　統率 ' + stats.cmd + '　智力 ' + stats.intel));
      body.appendChild(U.el('div', 'subHint', '武力：自身戰力 +' + stats.force + '%　智力：壓制敵軍戰力（上限 70%，超出部分轉為自身戰力加成）'));
      body.appendChild(U.el('div', 'generalCap', '統率上限：可率領兵力總統率需求 ' + Hero.leadershipCap(heroState) + ' 以內（跟戰力無關，只決定能帶多少兵出征）'));
      body.appendChild(U.el('div', 'generalSkill', '【' + def.skill.name + '】' + def.skill.desc));
      const effectText = D.describeSkillEffects(def.skill.effects);
      if (effectText) body.appendChild(U.el('div', 'generalSkillEffect', effectText));
      const expNeeded = Hero.expNeededForLevel(heroState.level);
      const expBarWrap = U.el('div', 'expBarWrap');
      const expBar = U.el('div', 'expBar');
      expBar.style.width = Math.min(100, (heroState.exp / expNeeded) * 100) + '%';
      expBarWrap.appendChild(expBar);
      body.appendChild(expBarWrap);
      const assignedArmy = playerState.armies[heroState.assignedArmyId];
      body.appendChild(U.el('div', 'generalAssign', assignedArmy ? '領軍：' + assignedArmy.name : '未領軍'));

      const equipLine = U.el('div', 'equipLine');
      D.ITEM_SLOTS.forEach((slot) => {
        const itemId = heroState.equipment[slot];
        const chip = U.el('span', 'equipChip' + (itemId ? ' equipChipFilled' : ''), itemId ? D.itemDefById(itemId).name : SLOT_LABELS[slot] + '(空)');
        if (itemId) {
          U.onTap(chip, () => { Hero.unequipItem(playerState, heroState.heroDataId, slot); render(container, saveGame, playerState); });
        }
        chip.title = itemId ? D.describeItemEffect(D.itemDefById(itemId)) : '';
        equipLine.appendChild(chip);
      });
      body.appendChild(equipLine);
      // 已裝備物品的實際作用逐項標示。
      D.ITEM_SLOTS.forEach((slot) => {
        const itemId = heroState.equipment[slot];
        if (!itemId) return;
        const item = D.itemDefById(itemId);
        body.appendChild(U.el('div', 'equipEffLine', item.name + '：' + D.describeItemEffect(item)));
      });
      buildTacticSection(body, container, saveGame, playerState, heroState, def);
      card.appendChild(body);
      rosterListEl.appendChild(card);
    });
    if (heroList.length === 0) rosterListEl.appendChild(U.el('div', 'emptyHint', '尚無武將，請完成戰役解鎖，或前往「招募」分頁在酒館招募。'));
    rosterPanel.appendChild(rosterListEl);
    container.appendChild(rosterPanel);

    container.appendChild(buildTacticLibraryPanel(playerState));

    const invPanel = U.el('div', 'panel');
    invPanel.appendChild(U.el('div', 'panelTitle', '裝備庫（戰役獎勵／擊破據點取得）'));
    const invEntries = Object.keys(playerState.inventory).filter((id) => playerState.inventory[id] > 0);
    if (invEntries.length === 0 || heroList.length === 0) {
      invPanel.appendChild(U.el('div', 'emptyHint', '目前沒有可裝備的物品。'));
    } else {
      invEntries.forEach((itemId) => {
        const item = D.itemDefById(itemId);
        const qty = playerState.inventory[itemId];
        const row = U.el('div', 'exploreTargetRow');
        row.appendChild(U.el('span', 'invItemLabel', item.name + '（' + SLOT_LABELS[item.slot] + '）x' + qty +
          '<br><span class="invItemEff">' + D.describeItemEffect(item) + '</span>'));
        const select = document.createElement('select');
        select.className = 'armySelect';
        heroList.forEach((h) => {
          const opt = document.createElement('option');
          opt.value = h.heroDataId;
          opt.textContent = D.heroDefById(h.heroDataId).name;
          select.appendChild(opt);
        });
        row.appendChild(select);
        const btn = U.el('button', 'smallBtn', '裝備');
        U.onTap(btn, () => {
          const r = Hero.equipItem(playerState, select.value, itemId);
          if (r.ok) { Dlg.toast('已裝備' + item.name); render(container, saveGame, playerState); }
          else Dlg.toast(r.reason);
        });
        row.appendChild(btn);
        invPanel.appendChild(row);
      });
    }
    container.appendChild(invPanel);
  }

  window.Game.UI.HeroScreen = { render };
})();
