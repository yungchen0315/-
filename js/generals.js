/* ============================================================================
 * generals.js — 武將養成：招募（劇情／探索）、升級、指派領軍、「武將」分頁畫面。
 * 武將皆透過劇情任務解鎖或酒館派遣探索取得，完全不使用抽卡機率機制。
 * ==========================================================================*/

const EXPLORE_BASE_MS = 6 * 60000;
const SLOT_LABELS = { weapon: '武器', armor: '甲冑', mount: '坐騎', accessory: '寶物' };

function ownedGeneralIds(faction) { return new Set(faction.generals.map((g) => g.id)); }

function availableExploreTargets(faction) {
  const owned = ownedGeneralIds(faction);
  return GENERALS.filter((g) => g.faction === faction.id && g.source.type === 'explore' && !owned.has(g.id));
}

function startExplore(faction, generalId) {
  const eff = factionEffects(faction);
  if (faction.buildings.tavern.level <= 0) return { ok: false, reason: '需先建造酒館' };
  if (faction.exploreSlots.length >= eff.exploreSlots) return { ok: false, reason: '探索隊已全數派出' };
  const target = GENERALS.find((g) => g.id === generalId && g.faction === faction.id);
  if (!target || target.source.type !== 'explore') return { ok: false, reason: '此武將無法探索取得' };
  if (ownedGeneralIds(faction).has(generalId)) return { ok: false, reason: '已擁有此武將' };
  const cost = { gold: 150 };
  if (!canAfford(faction.resources, cost)) return { ok: false, reason: '銀兩不足' };
  payCost(faction.resources, cost);
  const now = nowMs();
  const timeMs = Math.round(EXPLORE_BASE_MS / (eff.exploreSpeedMul || 1));
  faction.exploreSlots.push({ id: uid('explore'), generalId, startAt: now, completeAt: now + timeMs });
  return { ok: true };
}

function makeGeneralInstance(generalId) {
  return { id: generalId, level: 1, exp: 0, assignedArmyId: null, equipment: { weapon: null, armor: null, mount: null, accessory: null } };
}

function unlockGeneralFromCampaign(faction, generalId) {
  if (!generalId) return;
  if (faction.generals.some((g) => g.id === generalId)) return;
  const def = generalById(generalId);
  if (!def) return;
  faction.generals.push(makeGeneralInstance(generalId));
}

function expNeededForLevel(level) { return 80 + level * 40; }
const GENERAL_MAX_LEVEL = 30;

function awardGeneralExp(faction, generalId, amount) {
  const inst = faction.generals.find((g) => g.id === generalId);
  if (!inst || inst.level >= GENERAL_MAX_LEVEL) return;
  inst.exp += amount;
  let needed = expNeededForLevel(inst.level);
  while (inst.exp >= needed && inst.level < GENERAL_MAX_LEVEL) {
    inst.exp -= needed;
    inst.level += 1;
    needed = expNeededForLevel(inst.level);
  }
}

function generalEffectiveStats(inst) {
  const def = generalById(inst.id);
  const mul = 1 + (inst.level - 1) * 0.05 * def.growth;
  return {
    force: Math.round(def.baseStats.force * mul),
    cmd: Math.round(def.baseStats.cmd * mul),
    intel: Math.round(def.baseStats.intel * mul)
  };
}

function assignGeneralToArmy(faction, generalId, armyId) {
  const inst = faction.generals.find((g) => g.id === generalId);
  if (!inst) return { ok: false, reason: '找不到武將' };
  const army = faction.armies.find((a) => a.id === armyId);
  if (!army) return { ok: false, reason: '找不到部隊' };
  if (army.status !== 'garrison') return { ok: false, reason: '部隊行軍中，無法更換主將' };
  faction.armies.forEach((a) => { if (a.generalId === generalId) a.generalId = null; });
  faction.generals.forEach((g) => { if (g.assignedArmyId === armyId) g.assignedArmyId = null; });
  army.generalId = generalId;
  inst.assignedArmyId = armyId;
  return { ok: true };
}

/* ---------------------------------------------------------------------- */
/* 畫面渲染                                                                 */
/* ---------------------------------------------------------------------- */
function renderGeneralsScreen(container, faction) {
  clearNode(container);

  const rosterPanel = el('div', 'panel');
  rosterPanel.appendChild(el('div', 'panelTitle', '武將名錄（' + faction.generals.length + '）'));
  const rosterList = el('div', 'generalList');
  faction.generals.forEach((inst) => {
    const def = generalById(inst.id);
    if (!def) return;
    const stats = generalEffectiveStats(inst);
    const card = el('div', 'generalCard');
    card.style.borderLeftColor = def.portraitColor;
    const head = el('div', 'generalHead');
    head.appendChild(el('span', 'generalName', def.name));
    head.appendChild(el('span', 'generalLevel', 'Lv.' + inst.level));
    card.appendChild(head);
    card.appendChild(el('div', 'generalStats', '武力 ' + stats.force + '　統率 ' + stats.cmd + '　智力 ' + stats.intel));
    card.appendChild(el('div', 'generalSkill', '【' + def.skill.name + '】' + def.skill.desc));
    const expNeeded = expNeededForLevel(inst.level);
    const expBarWrap = el('div', 'expBarWrap');
    const expBar = el('div', 'expBar');
    expBar.style.width = Math.min(100, (inst.exp / expNeeded) * 100) + '%';
    expBarWrap.appendChild(expBar);
    card.appendChild(expBarWrap);
    const assignedArmy = faction.armies.find((a) => a.generalId === inst.id);
    card.appendChild(el('div', 'generalAssign', assignedArmy ? '領軍：' + assignedArmy.name : '未領軍'));

    inst.equipment = inst.equipment || { weapon: null, armor: null, mount: null, accessory: null };
    const equipLine = el('div', 'equipLine');
    ITEM_SLOTS.forEach((slot) => {
      const itemId = inst.equipment[slot];
      const chip = el('span', 'equipChip' + (itemId ? ' equipChipFilled' : ''), itemId ? itemById(itemId).name : SLOT_LABELS[slot] + '(空)');
      if (itemId) {
        onTap(chip, () => { unequipItem(faction, inst.id, slot); renderGeneralsScreen(container, faction); });
      }
      equipLine.appendChild(chip);
    });
    card.appendChild(equipLine);
    rosterList.appendChild(card);
  });
  if (faction.generals.length === 0) rosterList.appendChild(el('div', 'emptyHint', '尚無武將，請完成戰役或派遣探索。'));
  rosterPanel.appendChild(rosterList);
  container.appendChild(rosterPanel);

  const explorePanel = el('div', 'panel');
  explorePanel.appendChild(el('div', 'panelTitle', '酒館探索（每次 150 銀兩，非抽卡機率，保證取得指定武將）'));
  const eff = factionEffects(faction);
  explorePanel.appendChild(el('div', 'subHint', '探索隊：' + faction.exploreSlots.length + ' / ' + eff.exploreSlots));

  faction.exploreSlots.forEach((slot) => {
    const def = generalById(slot.generalId);
    const row = el('div', 'exploreRow');
    row.appendChild(el('span', '', '探索中：' + def.name));
    row.appendChild(el('span', 'timerText', formatDuration(Math.max(0, slot.completeAt - nowMs()))));
    explorePanel.appendChild(row);
  });

  const targets = availableExploreTargets(faction);
  const targetList = el('div', 'exploreTargetList');
  targets.forEach((def) => {
    const row = el('div', 'exploreTargetRow');
    row.appendChild(el('span', '', def.name + '（' + exploreTileByTag(def.source.tileTag).name + '）'));
    const btn = el('button', 'smallBtn', '派遣');
    onTap(btn, () => {
      const r = startExplore(faction, def.id);
      if (r.ok) { toast('已派出探索隊前往' + exploreTileByTag(def.source.tileTag).name); renderGeneralsScreen(container, faction); refreshTopBar(); }
      else toast(r.reason);
    });
    row.appendChild(btn);
    targetList.appendChild(row);
  });
  if (targets.length === 0) targetList.appendChild(el('div', 'emptyHint', '暫無可探索的武將，請推進主線劇情解鎖更多據點。'));
  explorePanel.appendChild(targetList);
  container.appendChild(explorePanel);

  const invPanel = el('div', 'panel');
  invPanel.appendChild(el('div', 'panelTitle', '裝備庫（戰役獎勵／擊破據點取得）'));
  const items = inventoryList(faction);
  if (items.length === 0 || faction.generals.length === 0) {
    invPanel.appendChild(el('div', 'emptyHint', '目前沒有可裝備的物品。'));
  } else {
    items.forEach(({ item, qty }) => {
      const row = el('div', 'exploreTargetRow');
      row.appendChild(el('span', '', item.name + '（' + SLOT_LABELS[item.slot] + '）x' + qty));
      const select = document.createElement('select');
      select.className = 'armySelect';
      faction.generals.forEach((g) => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = generalById(g.id).name;
        select.appendChild(opt);
      });
      row.appendChild(select);
      const btn = el('button', 'smallBtn', '裝備');
      onTap(btn, () => {
        const r = equipItem(faction, select.value, item.id);
        if (r.ok) { toast('已裝備' + item.name); renderGeneralsScreen(container, faction); }
        else toast(r.reason);
      });
      row.appendChild(btn);
      invPanel.appendChild(row);
    });
  }
  container.appendChild(invPanel);
}
