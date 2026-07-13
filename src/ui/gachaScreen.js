/* ============================================================================
 * gachaScreen.js — 「招募」分頁：酒館招募，元寶餘額、銅/銀/金三個獎池的
 * 單抽/十連與結果揭示。需先建成酒館才能招募。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;
  const Dlg = window.Game.UI.Dialog;
  const HP = window.Game.UI.HeroPortrait;

  const RARITY_BORDER_COLOR = { 5: '#d4af37', 4: '#a15ec5', 3: '#3a6bb0', 2: '#7a7a7a', 1: '#5a5a5a' };

  function resultCard(entry) {
    if (entry.kind === 'hero') {
      const def = D.heroDefById(entry.id);
      const card = U.el('div', 'gachaResultCard');
      card.appendChild(HP.heroPortraitEl(def, 'gachaResultPortrait'));
      card.appendChild(U.el('div', 'gachaResultName', def.name));
      if (entry.duplicate) card.appendChild(U.el('div', 'gachaResultDup', '重複，返還元寶 x' + entry.refund));
      return card;
    }
    if (entry.kind === 'tactic') {
      const t = D.tacticDefById(entry.id);
      const card = U.el('div', 'gachaResultCard');
      const box = U.el('div', 'gachaResultItemBox');
      box.style.borderColor = RARITY_BORDER_COLOR[t.rarity] || '#5a5a5a';
      box.textContent = '📜';
      card.appendChild(box);
      card.appendChild(U.el('div', 'gachaResultName', t.name));
      card.appendChild(U.el('div', 'gachaResultDup', D.describeSkillEffects(t.effects)));
      if (entry.duplicate) card.appendChild(U.el('div', 'gachaResultDup', '已習得，返還元寶 x' + entry.refund));
      return card;
    }
    const item = D.itemDefById(entry.id);
    const card = U.el('div', 'gachaResultCard');
    const box = U.el('div', 'gachaResultItemBox');
    box.style.borderColor = RARITY_BORDER_COLOR[item.tier] || '#5a5a5a';
    box.textContent = '⚔️';
    card.appendChild(box);
    card.appendChild(U.el('div', 'gachaResultName', item.name));
    return card;
  }

  function render(container, saveGame, playerState) {
    U.clearNode(container);
    const Gacha = window.Game.Systems.Gacha;
    const tavernBuilt = Gacha.tavernLevel(playerState) > 0;

    const balancePanel = U.el('div', 'panel');
    balancePanel.appendChild(U.el('div', 'panelTitle', '元寶餘額：🧧 ' + (playerState.resources.ingot || 0)));
    balancePanel.appendChild(U.el('div', 'subHint', '元寶透過戰役獎勵、成就、事件與每日簽到取得，可用來在酒館招募武將與裝備。'));
    if (!tavernBuilt) balancePanel.appendChild(U.el('div', 'subHint', '需先在城池分頁建造酒館，才能開始招募。'));
    container.appendChild(balancePanel);

    D.GACHA_POOLS.forEach((pool) => {
      const panel = U.el('div', 'panel gachaPoolPanel gachaPoolPanel_' + pool.id);
      panel.appendChild(U.el('div', 'panelTitle', pool.name));
      if (pool.kind === 'tactic') {
        panel.appendChild(U.el('div', 'subHint', '戰法星級 ' + pool.tacticRarityRange[0] + '~' + pool.tacticRarityRange[1] +
          '　只會抽到不綁武將的獨立戰法，武將專屬招牌戰法無法透過獎池取得'));
      } else {
        panel.appendChild(U.el('div', 'subHint', '武將稀有度 ' + pool.heroRarityRange[0] + '~' + pool.heroRarityRange[1] +
          '　裝備 tier ' + pool.itemTierRange[0] + '~' + pool.itemTierRange[1]));
      }

      const row = U.el('div', 'gachaDrawRow');
      const singleBtn = U.el('button', 'smallBtn' + (tavernBuilt ? '' : ' disabled'), '單抽 🧧' + pool.costSingle);
      const tenBtn = U.el('button', 'smallBtn' + (tavernBuilt ? '' : ' disabled'), '十連 🧧' + pool.costTen);
      row.appendChild(singleBtn);
      row.appendChild(tenBtn);
      panel.appendChild(row);

      function doDraw(count) {
        const r = Gacha.draw(playerState, pool.id, count);
        if (!r.ok) { Dlg.toast(r.reason); return; }
        window.Game.UI.TopBar.refresh(playerState);
        render(container, saveGame, playerState);
        showResults(pool, r.draws);
      }
      U.onTap(singleBtn, () => doDraw(1));
      U.onTap(tenBtn, () => doDraw(10));

      container.appendChild(panel);
    });
  }

  function showResults(pool, draws) {
    const overlay = U.el('div', 'gachaResultOverlay');
    const box = U.el('div', 'gachaResultBox');
    box.appendChild(U.el('div', 'gachaResultTitle', pool.name + '　招募結果'));
    const grid = U.el('div', 'gachaResultGrid');
    draws.forEach((entry) => grid.appendChild(resultCard(entry)));
    box.appendChild(grid);
    const closeBtn = U.el('button', 'setupBtn gachaResultCloseBtn', '確定');
    box.appendChild(closeBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    U.onTap(closeBtn, () => document.body.removeChild(overlay));
  }

  window.Game.UI.GachaScreen = { render };
})();
