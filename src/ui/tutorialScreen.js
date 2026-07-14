/* ============================================================================
 * tutorialScreen.js — 新手教學：開新遊戲後第一次進入時，用聚光燈提示＋卡片文字
 * 依序帶玩家看過頂部資源列與底部七個分頁，介紹各分頁的基本用途。純 UI 導覽，
 * 不碰任何遊戲規則，結束後在 SaveGame.tutorialSeen 記一筆，避免下次重複彈出。
 * 頂部列的 ❓ 按鈕（見 topBar.js）可以隨時重新觀看一次。
 * ==========================================================================*/

(function () {
  const U = window.Game.Utils;

  /** @typedef {{screen?:string, target?:string, title:string, desc:string}} TutorialStep */

  /** @type {TutorialStep[]} */
  const STEPS = [
    {
      title: '歡迎來到皇者天下',
      desc: '你將帶領一方勢力，在三國亂世中經營城池、培養武將、率軍征戰，最終統一天下。接下來會快速帶你看過畫面上的幾個重點，隨時可以按「跳過教學」直接開始遊玩。'
    },
    {
      screen: 'city', target: '#topBarRes',
      title: '資源列',
      desc: '糧食、木材、石材、黃金會由城池自動產出，元寶則是招募武將用的貨幣。每種資源都有倉庫上限，存滿了記得花掉或升級倉庫，以免產出被浪費。'
    },
    {
      screen: 'city', target: '.navBtn[data-screen="city"]',
      title: '城池',
      desc: '管理主城的各項建築：倉庫（提升存量上限）、兵營／校場／工坊（訓練部隊）、酒館（招募武將）、學院（研究科技）、城牆（提升防禦）。主城等級決定其他建築能升到的等級上限。'
    },
    {
      screen: 'map', target: '.navBtn[data-screen="map"]',
      title: '地圖',
      desc: '單指拖曳可平移視角，輕點地塊能查看詳情、派兵佔領資源地、或出兵攻打敵方勢力。地圖上的戰鬥會在背景自動結算，之後可在「戰報」查看結果。'
    },
    {
      screen: 'hero', target: '.navBtn[data-screen="hero"]',
      title: '武將',
      desc: '每位武將都有專屬技能與戰法，會實際影響戰鬥數值。幫武將裝備武器、甲冑、坐騎、寶物，並指派到部隊帶兵出征吧。'
    },
    {
      screen: 'army', target: '.navBtn[data-screen="army"]',
      title: '軍隊',
      desc: '在兵營、校場、工坊訓練士兵，編成部隊並指派武將帶隊，就能派去駐守、探索或出征攻城。'
    },
    {
      screen: 'mission', target: '.navBtn[data-screen="mission"]',
      title: '戰役',
      desc: '主線關卡採真正的逐回合戰鬥，雙方武將立繪對戰、比拚壓制與傷害，官渡、赤壁、夷陵等經典戰役都在等你重演。'
    },
    {
      screen: 'gacha', target: '.navBtn[data-screen="gacha"]',
      title: '招募',
      desc: '用元寶在酒館招募新武將，銅／銀／金三個獎池依稀有度分級，元寶可透過戰役獎勵、成就、事件與每日簽到取得。'
    },
    {
      screen: 'report', target: '.navBtn[data-screen="report"]',
      title: '戰報',
      desc: '所有戰鬥的勝負與傷亡都會記錄在這裡，方便隨時回顧交戰結果。'
    },
    {
      screen: 'city',
      title: '開始你的霸業！',
      desc: '關掉分頁或離線一段時間後，先前設定的建造／練兵／研究／行軍都會依實際經過的時間自動繼續推進。祝你早日三分歸一統！'
    }
  ];

  let els = null;
  let stepIndex = 0;
  let onDone = null;

  function start(onFinish) {
    if (els) return;
    stepIndex = 0;
    onDone = onFinish || null;
    build();
    renderStep();
  }

  function build() {
    const root = U.el('div', 'tutorialOverlay');
    const spotlight = U.el('div', 'tutorialSpotlight');
    const card = U.el('div', 'tutorialCard');
    const titleEl = U.el('div', 'tutorialTitle');
    const descEl = U.el('div', 'tutorialDesc');
    const stepEl = U.el('div', 'tutorialStepCount');
    const btnRow = U.el('div', 'tutorialBtnRow');
    const skipBtn = U.el('button', 'smallBtn tutorialSkipBtn', '跳過教學');
    const prevBtn = U.el('button', 'smallBtn tutorialPrevBtn', '上一步');
    const nextBtn = U.el('button', 'upgradeBtn tutorialNextBtn', '下一步');

    btnRow.appendChild(skipBtn);
    btnRow.appendChild(prevBtn);
    btnRow.appendChild(nextBtn);
    card.appendChild(stepEl);
    card.appendChild(titleEl);
    card.appendChild(descEl);
    card.appendChild(btnRow);
    root.appendChild(spotlight);
    root.appendChild(card);
    document.body.appendChild(root);

    U.onTap(skipBtn, finish);
    U.onTap(prevBtn, () => { if (stepIndex > 0) { stepIndex--; renderStep(); } });
    U.onTap(nextBtn, () => {
      if (stepIndex < STEPS.length - 1) { stepIndex++; renderStep(); } else finish();
    });

    els = { root, spotlight, card, titleEl, descEl, stepEl, prevBtn, nextBtn };
  }

  function renderStep() {
    const step = STEPS[stepIndex];
    if (step.screen && window.Game.UI.Bootstrap) window.Game.UI.Bootstrap.switchScreen(step.screen);
    els.titleEl.textContent = step.title;
    els.descEl.textContent = step.desc;
    els.stepEl.textContent = (stepIndex + 1) + ' / ' + STEPS.length;
    els.prevBtn.style.visibility = stepIndex === 0 ? 'hidden' : 'visible';
    els.nextBtn.textContent = stepIndex === STEPS.length - 1 ? '開始遊戲' : '下一步';
    // 換頁後畫面要多一個 frame 才會完成排版，等下一輪再量測目標位置。
    requestAnimationFrame(() => positionSpotlight(step.target));
  }

  function positionSpotlight(selector) {
    if (!els) return;
    const target = selector && document.querySelector(selector);
    if (!target) {
      // 沒有指定目標的步驟（開場／結尾）：整個畫面均勻壓暗，僅在正中央留一個
      // 沒有邊框的零尺寸聚光點，維持「背景仍被完全遮蔽」的效果。
      els.spotlight.classList.add('tutorialSpotlightHidden');
      els.spotlight.style.left = (window.innerWidth / 2) + 'px';
      els.spotlight.style.top = (window.innerHeight / 2) + 'px';
      els.spotlight.style.width = '0px';
      els.spotlight.style.height = '0px';
      positionCard(null);
      return;
    }
    els.spotlight.classList.remove('tutorialSpotlightHidden');
    const rect = target.getBoundingClientRect();
    const pad = 6;
    els.spotlight.style.left = (rect.left - pad) + 'px';
    els.spotlight.style.top = (rect.top - pad) + 'px';
    els.spotlight.style.width = (rect.width + pad * 2) + 'px';
    els.spotlight.style.height = (rect.height + pad * 2) + 'px';
    positionCard(rect);
  }

  function positionCard(rect) {
    const card = els.card;
    card.classList.remove('tutorialCardTop', 'tutorialCardBottom', 'tutorialCardCenter');
    if (!rect) {
      card.classList.add('tutorialCardCenter');
      card.style.top = '';
      card.style.bottom = '';
      return;
    }
    const viewportH = window.innerHeight;
    if (rect.top > viewportH / 2) {
      card.classList.add('tutorialCardBottom');
      card.style.bottom = (viewportH - rect.top + 12) + 'px';
      card.style.top = '';
    } else {
      card.classList.add('tutorialCardTop');
      card.style.top = (rect.bottom + 12) + 'px';
      card.style.bottom = '';
    }
  }

  function finish() {
    if (!els) return;
    document.body.removeChild(els.root);
    els = null;
    if (onDone) onDone();
  }

  window.Game.UI.Tutorial = { start };
})();
