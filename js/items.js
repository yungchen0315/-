/* ============================================================================
 * items.js — 武將裝備：取得、裝備／卸下、庫存管理。
 * 裝備僅透過戰役獎勵與擊破野外據點取得，無任何機率抽取機制。
 * ==========================================================================*/

function grantItem(faction, itemId, qty) {
  if (!itemId) return;
  qty = qty || 1;
  faction.inventory = faction.inventory || {};
  faction.inventory[itemId] = (faction.inventory[itemId] || 0) + qty;
}

function inventoryList(faction) {
  faction.inventory = faction.inventory || {};
  return Object.keys(faction.inventory).filter((id) => faction.inventory[id] > 0).map((id) => ({ item: itemById(id), qty: faction.inventory[id] }));
}

function equipItem(faction, generalId, itemId) {
  const inst = faction.generals.find((g) => g.id === generalId);
  if (!inst) return { ok: false, reason: '找不到武將' };
  faction.inventory = faction.inventory || {};
  if (!faction.inventory[itemId] || faction.inventory[itemId] <= 0) return { ok: false, reason: '庫存中沒有此裝備' };
  const item = itemById(itemId);
  if (!item) return { ok: false, reason: '未知裝備' };
  inst.equipment = inst.equipment || { weapon: null, armor: null, mount: null, accessory: null };
  const prev = inst.equipment[item.slot];
  if (prev) grantItem(faction, prev, 1);
  inst.equipment[item.slot] = itemId;
  faction.inventory[itemId] -= 1;
  return { ok: true };
}

function unequipItem(faction, generalId, slot) {
  const inst = faction.generals.find((g) => g.id === generalId);
  if (!inst || !inst.equipment || !inst.equipment[slot]) return { ok: false, reason: '該部位沒有裝備' };
  grantItem(faction, inst.equipment[slot], 1);
  inst.equipment[slot] = null;
  return { ok: true };
}

function itemInventoryValue(item) {
  return item ? item.tier : 0;
}
