/* ============================================================================
 * achievements.js — 成就追蹤與獎勵發放。
 * ==========================================================================*/

function checkAchievements(state, faction) {
  faction.unlockedAchievements = faction.unlockedAchievements || [];
  const unlocked = new Set(faction.unlockedAchievements);
  ACHIEVEMENTS.forEach((a) => {
    if (unlocked.has(a.id)) return;
    let met = false;
    try { met = !!a.check(faction, state); } catch (e) { met = false; }
    if (!met) return;
    faction.unlockedAchievements.push(a.id);
    const eff = factionEffects(faction);
    if (a.reward && a.reward.resources) {
      Object.keys(a.reward.resources).forEach((r) => {
        faction.resources[r] = clamp(faction.resources[r] + a.reward.resources[r], 0, eff.storageCap[r]);
      });
    }
    if (faction.isPlayer && window.__pushToast) window.__pushToast('達成成就「' + a.name + '」');
  });
}

function renderAchievementsPanel(container, faction) {
  const panel = el('div', 'panel');
  faction.unlockedAchievements = faction.unlockedAchievements || [];
  panel.appendChild(el('div', 'panelTitle', '成就（' + faction.unlockedAchievements.length + ' / ' + ACHIEVEMENTS.length + '）'));
  const unlocked = new Set(faction.unlockedAchievements);
  ACHIEVEMENTS.forEach((a) => {
    const done = unlocked.has(a.id);
    const row = el('div', 'achievementRow' + (done ? ' achievementDone' : ''));
    row.appendChild(el('span', 'achievementName', (done ? '✔ ' : '☐ ') + a.name));
    row.appendChild(el('span', 'achievementDesc', a.desc));
    panel.appendChild(row);
  });
  container.appendChild(panel);
}
