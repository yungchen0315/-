/* ============================================================================
 * skills.js — 武將技能對戰鬥的實際數值影響（取代純敘述文字）。
 * 每位武將對應一組加成，於 army.js 的 resolveBattle 中套用。
 * ==========================================================================*/

function emptyCombatBonus() {
  return {
    atkPct: 0, defPct: 0, hpPct: 0,
    unitAtkPct: {},
    lossReductionPct: 0,
    lootBonusPct: 0,
    enemyAtkPct: 0,
    enemyDefPct: 0,
    firstStrikePct: 0
  };
}

const SKILL_HANDLERS = {
  guanyu: (b) => { b.unitAtkPct.infantry = (b.unitAtkPct.infantry || 0) + 15; b.unitAtkPct.spearman = (b.unitAtkPct.spearman || 0) + 15; },
  zhangfei: (b) => { b.enemyDefPct -= 12; },
  zhaoyun: (b) => { b.lossReductionPct += 10; },
  machao: (b) => { b.unitAtkPct.cavalry = (b.unitAtkPct.cavalry || 0) + 18; },
  huangzhong: (b) => { b.unitAtkPct.crossbowman = (b.unitAtkPct.crossbowman || 0) + 16; b.unitAtkPct.horsearcher = (b.unitAtkPct.horsearcher || 0) + 16; },
  zhugeliang: (b) => { b.lossReductionPct += 12; b.lootBonusPct += 15; },
  jiangwei: (b) => { b.atkPct += 8; },
  weiyan: (b) => { b.firstStrikePct += 15; },
  pangtong: (b) => { b.enemyAtkPct -= 12; },
  liyan: (b) => { b.lootBonusPct += 10; },

  caocao: (b) => { b.atkPct += 10; },
  simayi: (b, isDefender) => { if (isDefender) b.enemyAtkPct -= 15; },
  xiahoudun: (b) => { b.hpPct += 12; },
  zhangliao: (b, isDefender, isAttacker) => { if (isAttacker) b.firstStrikePct += 18; },
  xuhuang: (b) => { b.atkPct += 8; },
  dianwei: (b) => { b.defPct += 15; },
  xuchu: (b) => { b.hpPct += 15; },
  guojia: (b, isDefender, isAttacker) => { if (isAttacker) b.firstStrikePct += 10; },
  zhangjunyi: (b) => { b.defPct += 8; },
  caoren: (b, isDefender) => { if (isDefender) b.defPct += 15; },

  sunquan: (b) => { b.atkPct += 6; b.defPct += 6; },
  zhouyu: (b, isDefender, isAttacker) => { if (isAttacker) b.enemyDefPct -= 10; },
  luxun: (b, isDefender) => { if (isDefender) b.enemyAtkPct -= 12; },
  ganning: (b, isDefender, isAttacker) => { if (isAttacker) b.atkPct += 14; },
  taishici: (b) => { b.atkPct += 10; },
  lumeng: (b) => { b.lossReductionPct += 10; },
  huanggai: (b, isDefender) => { if (isDefender) b.enemyAtkPct -= 8; },
  lusu: (b) => { b.lossReductionPct += 6; },
  sunshangxiang: (b) => { b.unitAtkPct.horsearcher = (b.unitAtkPct.horsearcher || 0) + 16; },
  zhoutai: (b) => { b.hpPct += 10; }
};

function applyGeneralSkill(bonus, generalId, isAttacker, isDefender) {
  const handler = SKILL_HANDLERS[generalId];
  if (handler) handler(bonus, isDefender, isAttacker);
}

/* ---------------------------------------------------------------------- */
/* 綜合戰鬥加成：技能 + 已裝備物品                                            */
/* ---------------------------------------------------------------------- */
function combatBonusFor(faction, generalId, isAttacker) {
  const bonus = emptyCombatBonus();
  if (!generalId || !faction) return bonus;
  applyGeneralSkill(bonus, generalId, isAttacker, !isAttacker);
  const inst = faction.generals.find((g) => g.id === generalId);
  if (inst && inst.equipment) {
    ITEM_SLOTS.forEach((slot) => {
      const itemId = inst.equipment[slot];
      if (!itemId) return;
      const item = itemById(itemId);
      if (!item) return;
      const e = item.effect;
      if (e.atkPct) bonus.atkPct += e.atkPct;
      if (e.defPct) bonus.defPct += e.defPct;
      if (e.hpPct) bonus.hpPct += e.hpPct;
      if (e.lossReductionPct) bonus.lossReductionPct += e.lossReductionPct;
      if (e.lootBonusPct) bonus.lootBonusPct += e.lootBonusPct;
      if (e.unitAtkPct) Object.keys(e.unitAtkPct).forEach((r) => { bonus.unitAtkPct[r] = (bonus.unitAtkPct[r] || 0) + e.unitAtkPct[r]; });
    });
  }
  return bonus;
}
