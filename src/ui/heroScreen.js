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
      body.appendChild(U.el('div', 'generalCap', '統率上限：可率領兵力總統率需求 ' + Hero.leadershipCap(heroState) + ' 以內'));
      body.appendChild(U.el('div', 'generalSkill', '【' + def.skill.name + '】' + def.skill.desc));
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
        equipLine.appendChild(chip);
      });
      body.appendChild(equipLine);
      card.appendChild(body);
      rosterListEl.appendChild(card);
    });
    if (heroList.length === 0) rosterListEl.appendChild(U.el('div', 'emptyHint', '尚無武將，請完成戰役解鎖，或前往「招募」分頁在酒館招募。'));
    rosterPanel.appendChild(rosterListEl);
    container.appendChild(rosterPanel);

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
        row.appendChild(U.el('span', '', item.name + '（' + SLOT_LABELS[item.slot] + '）x' + qty));
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
