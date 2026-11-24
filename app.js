(function () {
  "use strict";

  const DATA = window.VOCAB_DATA;
  if (!DATA || !Array.isArray(DATA.chapters)) {
    document.body.innerHTML = "<div style='padding:40px;font-family:sans-serif;'><h2>無法載入單字資料 (vocab_data.js)</h2><p>請確認 vocab_data.js 與 index.html 位於同一個資料夾內。</p></div>";
    return;
  }

  const LOCAL_WAV_FILES = new Set([
    "adult.wav", "angel.wav", "baby.wav", "beauty.wav", "born.wav", "boy.wav",
    "castle.wav", "child.wav", "childhood.wav", "common.wav", "dear.wav", "Dr..wav",
    "farmer.wav", "female.wav", "first name.wav", "gentleman.wav", "girl.wav",
    "god.wav", "guy.wav", "human.wav", "kid.wav", "king.wav", "kingdom.wav",
    "lady.wav", "last name.wav", "madam.wav", "male.wav", "man.wav", "married.wav",
    "master.wav", "Miss.wav", "Mr..wav", "Mrs..wav", "Ms..wav", "name.wav",
    "people.wav", "person.wav", "prince.wav", "princess.wav", "queen.wav",
    "servant.wav", "sir.wav", "teenager.wav", "title.wav", "woman.wav", "youth.wav"
  ]);

  const CHAPTERS = DATA.chapters;
  const UNITS = [];
  const UNIT_BY_NUM = new Map();
  const CHAPTER_BY_UNIT = new Map();

  for (const ch of CHAPTERS) {
    for (const u of ch.units) {
      UNITS.push(u);
      UNIT_BY_NUM.set(u.unit_num, u);
      CHAPTER_BY_UNIT.set(u.unit_num, ch);
    }
  }

  const state = {
    unitNum: 1,
    mode: "mindmap", // "mindmap" | "flashcard" | "table"
    mmLang: "zh",    // "zh" | "en"
    mmZoom: 100,
    mmShowZhChips: true,
    fcIndex: 0,
    fcFlipped: false,
    fcDisplayMode: "flip", // "flip" | "sync"
    fcRepeat: 1,
    fcDelayMs: 2000,
    fcRate: 1.0,
    fcOnEnd: "stop",       // "stop" | "loop" | "next"
    fcSpeakEx: false,
    ttsEngine: "web_speech",
    maskMode: "none",      // "none" | "hide-zh" | "hide-en"
    autoPlaying: false,
    tableAutoPlaying: false,
    mmVoicePlaying: false,
    playSessionId: 0,
    openChapters: new Set([1]),
    searchQuery: "",
    sidebarCollapsed: false,
  };

  // DOM References
  const $ = (id) => document.getElementById(id);
  const el = {
    appShell: $("app"),
    sidebar: $("sidebar"),
    bookStatsLabel: $("book-stats-label"),
    sidebarSearch: $("sidebar-search"),
    btnClearSearch: $("btn-clear-search"),
    wordSearchResults: $("word-search-results"),
    chapterNav: $("chapter-nav"),

    btnToggleSidebar: $("btn-toggle-sidebar"),
    btnCloseSidebarMobile: $("btn-close-sidebar-mobile"),
    btnPrevUnit: $("btn-prev-unit"),
    btnNextUnit: $("btn-next-unit"),
    hdrChBadge: $("hdr-ch-badge"),
    hdrUnitBadge: $("hdr-unit-badge"),
    hdrUnitTitle: $("hdr-unit-title"),
    modeTabs: Array.from(document.querySelectorAll(".mode-tab")),
    ttsEngineSelect: $("tts-engine-select"),
    btnFullscreen: $("btn-fullscreen"),

    viewMindmap: $("view-mindmap"),
    viewFlashcard: $("view-flashcard"),
    viewTable: $("view-table"),

    mmBannerImg: $("mm-banner-img"),
    mmUnitMeta: $("mm-unit-meta"),
    mmUnitHeading: $("mm-unit-heading"),
    btnMmStartFlashcards: $("btn-mm-start-flashcards"),
    btnMmEn: $("btn-mm-en"),
    btnMmZh: $("btn-mm-zh"),
    zoomBtns: Array.from(document.querySelectorAll(".zoom-btn")),
    btnMmLightbox: $("btn-mm-lightbox"),
    mmSlideImg: $("mm-slide-img"),
    mmWordCount: $("mm-word-count"),
    mmWordChips: $("mm-word-chips"),
    btnToggleMmZh: $("btn-toggle-mm-zh"),
    btnMmToTable: $("btn-mm-to-table"),

    unitMp3Audio: $("unit-mp3-audio"),
    btnMp3Play: $("btn-mp3-play"),
    mp3Seek: $("mp3-seek"),
    mp3Time: $("mp3-time"),
    mp3Speed: $("mp3-speed"),
    btnMp3Loop: $("btn-mp3-loop"),

    btnAutoplay: $("btn-autoplay"),
    autoplayStatusPill: $("autoplay-status-pill"),
    fcDisplayMode: $("fc-display-mode"),
    fcRepeat: $("fc-repeat"),
    fcDelay: $("fc-delay"),
    fcRate: $("fc-rate"),
    fcOnEnd: $("fc-on-end"),
    fcSpeakEx: $("fc-speak-ex"),
    fcProgressText: $("fc-progress-text"),
    fcProgressFill: $("fc-progress-fill"),
    flashcardEl: $("flashcard-el"),
    fcNumFront: $("fc-num-front"),
    fcPosFront: $("fc-pos-front"),
    fcUnitMiniFront: $("fc-unit-mini-front"),
    fcEnFront: $("fc-en-front"),
    btnSpeakFront: $("btn-speak-front"),
    fcSyncDetails: $("fc-sync-details"),
    fcZhSync: $("fc-zh-sync"),
    fcExSync: $("fc-ex-sync"),
    fcExEnSync: $("fc-ex-en-sync"),
    fcExZhSync: $("fc-ex-zh-sync"),
    fcFlipHint: $("fc-flip-hint"),
    fcNumBack: $("fc-num-back"),
    fcEnBack: $("fc-en-back"),
    fcPosBack: $("fc-pos-back"),
    btnSpeakBack: $("btn-speak-back"),
    fcUnitMiniBack: $("fc-unit-mini-back"),
    fcZhBack: $("fc-zh-back"),
    fcExBack: $("fc-ex-back"),
    fcExEnBack: $("fc-ex-en-back"),
    fcExZhBack: $("fc-ex-zh-back"),
    btnSpeakExBack: $("btn-speak-ex-back"),
    btnFcPrev: $("btn-fc-prev"),
    btnFcFlip: $("btn-fc-flip"),
    btnFcSpeak: $("btn-fc-speak"),
    btnFcNext: $("btn-fc-next"),
    fcWordChips: $("fc-word-chips"),

    tblUnitHeading: $("tbl-unit-heading"),
    tblWordCount: $("tbl-word-count"),
    quizMaskBtns: Array.from(document.querySelectorAll("#quiz-mask-group .seg-btn")),
    btnRandomQuiz: $("btn-random-quiz"),
    btnTableAutoplay: $("btn-table-autoplay"),
    vocabTableBody: $("vocab-table-body"),

    lightbox: $("mm-lightbox"),
    lbTitle: $("lb-title"),
    lbImg: $("lb-img"),
    lbToggleLang: $("lb-toggle-lang"),
    lbClose: $("lb-close"),
  };

  let activeAudio = null;
  let activeTimers = new Set();
  let preferredUsVoice = null;

  // ---------------------------------------------------------------------------
  // Voice & Audio Engine
  // ---------------------------------------------------------------------------
  function refreshUsVoice() {
    if (!("speechSynthesis" in window)) return;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return;
    preferredUsVoice =
      voices.find((v) => /en[-_]US/i.test(v.lang) && /(Natural|Aria|Jenny|Guy|Google US)/i.test(v.name)) ||
      voices.find((v) => /en[-_]US/i.test(v.lang)) ||
      voices.find((v) => /^en/i.test(v.lang)) ||
      null;
  }

  if ("speechSynthesis" in window) {
    refreshUsVoice();
    window.speechSynthesis.onvoiceschanged = refreshUsVoice;
  }

  function normalizeForSpeech(text, isWord) {
    let t = String(text || "").trim();
    if (!t) return "";
    t = t
      .replace(/\bMr\./g, "Mister")
      .replace(/\bMrs\./g, "Missus")
      .replace(/\bMs\./g, "Miz")
      .replace(/\bDr\./g, "Doctor")
      .replace(/\ba\.m\./gi, "A.M.")
      .replace(/\bp\.m\./gi, "P.M.");

    if (isWord) {
      const exactMap = {
        USA: "U.S.A.",
        ROC: "R.O.C.",
        MRT: "M.R.T.",
        OK: "O.K.",
        "PE/physical education": "P.E., physical education",
      };
      if (exactMap[t]) return exactMap[t];
      t = t.replace(/\.{3,}/g, ", ").replace(/\s*\/\s*/g, ", ").replace(/\s+/g, " ").trim();
    }
    return t;
  }

  function getLocalWavPath(word) {
    const exact = `${word}.wav`;
    if (LOCAL_WAV_FILES.has(exact)) return encodeURI(`tts/${exact}`);
    if (word.includes("/")) {
      const head = `${word.split("/")[0].trim()}.wav`;
      if (LOCAL_WAV_FILES.has(head)) return encodeURI(`tts/${head}`);
    }
    return null;
  }

  function clearAudioAndSpeech() {
    if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.src = "";
      } catch (_) {}
      activeAudio = null;
    }
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    window._activeUtterance = null;
  }

  function registerTimeout(ms, fn) {
    const id = window.setTimeout(() => {
      activeTimers.delete(id);
      fn();
    }, ms);
    activeTimers.add(id);
    return id;
  }

  function clearAllTimers() {
    for (const id of activeTimers) {
      window.clearTimeout(id);
    }
    activeTimers.clear();
  }

  function sleepSession(ms, sessionId) {
    return new Promise((resolve) => {
      if (sessionId !== state.playSessionId) {
        resolve(false);
        return;
      }
      registerTimeout(ms, () => {
        resolve(sessionId === state.playSessionId);
      });
    });
  }

  function speakViaWebSpeech(text, { isWord = true, rate = 1.0, sessionId }) {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) {
        resolve(true);
        return;
      }
      if (sessionId !== state.playSessionId) {
        resolve(false);
        return;
      }

      const spoken = normalizeForSpeech(text, isWord);
      if (!spoken) {
        resolve(true);
        return;
      }

      try {
        window.speechSynthesis.cancel();
      } catch (_) {}

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        window._activeUtterance = null;
        resolve(sessionId === state.playSessionId);
      };

      const utt = new SpeechSynthesisUtterance(spoken);
      utt.lang = "en-US";
      utt.rate = rate;
      if (preferredUsVoice) utt.voice = preferredUsVoice;
      utt.onend = finish;
      utt.onerror = finish;

      window._activeUtterance = utt;
      const wordCount = spoken.split(/\s+/).length;
      const guardMs = Math.max(2400, Math.round((wordCount * 750 + 2200) / Math.max(0.5, rate)));
      registerTimeout(guardMs, finish);

      try {
        window.speechSynthesis.speak(utt);
      } catch (_) {
        finish();
      }
    });
  }

  function speakText(text, opts = {}) {
    const { isWord = true, rate = state.fcRate, sessionId = state.playSessionId } = opts;
    clearAudioAndSpeech();

    if (sessionId !== state.playSessionId) return Promise.resolve(false);

    if (isWord && state.ttsEngine === "local_first") {
      const wavUrl = getLocalWavPath(text);
      if (wavUrl) {
        return new Promise((resolve) => {
          const audio = new Audio(wavUrl);
          audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));
          activeAudio = audio;
          let settled = false;
          const finish = (ok) => {
            if (settled) return;
            settled = true;
            if (activeAudio === audio) activeAudio = null;
            resolve(ok && sessionId === state.playSessionId);
          };
          audio.onended = () => finish(true);
          audio.onerror = () => {
            if (settled) return;
            settled = true;
            speakViaWebSpeech(text, { isWord, rate, sessionId }).then(resolve);
          };
          audio.play().catch(() => {
            if (!settled) {
              settled = true;
              speakViaWebSpeech(text, { isWord, rate, sessionId }).then(resolve);
            }
          });
        });
      }
    }

    return speakViaWebSpeech(text, { isWord, rate, sessionId });
  }

  function speakSingleImmediate(text, isWord = true) {
    // Cancels background auto-play cleanly if user manually clicks to pronounce a specific chip
    if (state.autoPlaying || state.tableAutoPlaying || state.mmVoicePlaying) {
      stopAllAutoPlay();
    } else {
      state.playSessionId += 1;
      clearAllTimers();
      clearAudioAndSpeech();
    }
    return speakText(text, { isWord, rate: state.fcRate, sessionId: state.playSessionId });
  }

  // ---------------------------------------------------------------------------
  // Auto-Play Engine
  // ---------------------------------------------------------------------------
  function highlightMindmapChip(idx) {
    const chips = el.mmWordChips.querySelectorAll(".mm-chip");
    chips.forEach((chip) => {
      const match = Number(chip.dataset.idx) === idx;
      chip.classList.toggle("chip-speaking", match);
    });
  }

  function stopAllAutoPlay() {
    state.playSessionId += 1;
    state.autoPlaying = false;
    state.tableAutoPlaying = false;
    state.mmVoicePlaying = false;
    clearAllTimers();
    clearAudioAndSpeech();
    updateAutoPlayUI();
    highlightTableSpeakingRow(-1);
    highlightMindmapChip(-1);
    if (el.unitMp3Audio.paused) {
      el.btnMp3Play.textContent = "▶ 課本音檔";
    }
  }

  function updateAutoPlayUI() {
    if (state.autoPlaying) {
      el.btnAutoplay.textContent = "⏸ 暫停自動播放 (Space)";
      el.btnAutoplay.classList.add("playing");
      el.autoplayStatusPill.textContent = "自動播放中";
      el.autoplayStatusPill.classList.add("playing");
    } else {
      el.btnAutoplay.textContent = "▶ 開始自動播放 (Space)";
      el.btnAutoplay.classList.remove("playing");
      el.autoplayStatusPill.textContent = "待機中";
      el.autoplayStatusPill.classList.remove("playing");
    }

    if (state.tableAutoPlaying) {
      el.btnTableAutoplay.textContent = "⏸ 停止依序朗讀";
      el.btnTableAutoplay.classList.add("playing");
    } else {
      el.btnTableAutoplay.textContent = "▶ 依序朗讀全表";
      el.btnTableAutoplay.classList.remove("playing");
    }
  }

  async function runFlashcardAutoPlay() {
    stopUnitMp3();
    state.playSessionId += 1;
    const sessionId = state.playSessionId;
    state.autoPlaying = true;
    state.tableAutoPlaying = false;
    updateAutoPlayUI();

    while (state.autoPlaying && sessionId === state.playSessionId) {
      const unit = UNIT_BY_NUM.get(state.unitNum);
      if (!unit || !unit.words.length) break;

      if (state.fcIndex >= unit.words.length) state.fcIndex = 0;
      const wordObj = unit.words[state.fcIndex];

      state.fcFlipped = false;
      renderFlashcard();

      // Speak English word 1x or 2x
      for (let r = 0; r < state.fcRepeat; r++) {
        if (sessionId !== state.playSessionId) return;
        const ok = await speakText(wordObj.english, { isWord: true, rate: state.fcRate, sessionId });
        if (!ok || sessionId !== state.playSessionId) return;
        if (r + 1 < state.fcRepeat) {
          const cont = await sleepSession(360, sessionId);
          if (!cont) return;
        }
      }

      if (state.fcDisplayMode === "flip") {
        // Pause briefly so students recall before flipping
        const frontWait = Math.max(700, Math.round(state.fcDelayMs * 0.55));
        if (!(await sleepSession(frontWait, sessionId))) return;

        state.fcFlipped = true;
        renderFlashcard();

        if (state.fcSpeakEx && wordObj.example_en) {
          if (!(await sleepSession(320, sessionId))) return;
          if (!(await speakText(wordObj.example_en, { isWord: false, rate: state.fcRate, sessionId }))) return;
        }

        if (!(await sleepSession(state.fcDelayMs, sessionId))) return;
      } else {
        // Simultaneous display mode: everything is already visible on front
        if (state.fcSpeakEx && wordObj.example_en) {
          if (!(await sleepSession(320, sessionId))) return;
          if (!(await speakText(wordObj.example_en, { isWord: false, rate: state.fcRate, sessionId }))) return;
        }
        if (!(await sleepSession(state.fcDelayMs, sessionId))) return;
      }

      if (sessionId !== state.playSessionId) return;

      // Advance to next word or unit
      if (state.fcIndex < unit.words.length - 1) {
        state.fcIndex += 1;
      } else if (state.fcOnEnd === "loop") {
        state.fcIndex = 0;
      } else if (state.fcOnEnd === "next" && state.unitNum < 133) {
        selectUnit(state.unitNum + 1, { keepMode: true, autoplay: false });
        // Re-keep playing seamlessly under same session loop!
        state.autoPlaying = true;
        updateAutoPlayUI();
      } else {
        stopAllAutoPlay();
        return;
      }
    }
  }

  async function runTableAutoPlay() {
    stopUnitMp3();
    state.playSessionId += 1;
    const sessionId = state.playSessionId;
    state.tableAutoPlaying = true;
    state.autoPlaying = false;
    updateAutoPlayUI();

    const unit = UNIT_BY_NUM.get(state.unitNum);
    if (!unit) {
      stopAllAutoPlay();
      return;
    }

    for (let idx = 0; idx < unit.words.length; idx++) {
      if (sessionId !== state.playSessionId || !state.tableAutoPlaying) return;
      const w = unit.words[idx];
      highlightTableSpeakingRow(idx);

      for (let r = 0; r < state.fcRepeat; r++) {
        if (sessionId !== state.playSessionId) return;
        const ok = await speakText(w.english, { isWord: true, rate: state.fcRate, sessionId });
        if (!ok || sessionId !== state.playSessionId) return;
        if (r + 1 < state.fcRepeat) {
          if (!(await sleepSession(320, sessionId))) return;
        }
      }

      if (!(await sleepSession(Math.min(state.fcDelayMs, 2200), sessionId))) return;
    }

    if (sessionId === state.playSessionId) {
      stopAllAutoPlay();
    }
  }

  // ---------------------------------------------------------------------------
  // MP3 Textbook Player
  // ---------------------------------------------------------------------------
  function formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  let unitMp3Missing = false;

  function stopUnitMp3() {
    if (!el.unitMp3Audio.paused) {
      el.unitMp3Audio.pause();
    }
    state.mmVoicePlaying = false;
    highlightMindmapChip(-1);
    el.btnMp3Play.textContent = "▶ 課本音檔";
  }

  function syncMp3Source(unit) {
    stopUnitMp3();
    unitMp3Missing = false;
    el.unitMp3Audio.src = encodeURI(unit.mp3);
    el.unitMp3Audio.playbackRate = parseFloat(el.mp3Speed.value) || 1;
    el.mp3Seek.value = "0";
    el.mp3Time.textContent = "00:00 / 00:00";
  }

  async function runMindmapVoiceFallback() {
    state.playSessionId += 1;
    const sessionId = state.playSessionId;
    state.mmVoicePlaying = true;
    state.autoPlaying = false;
    state.tableAutoPlaying = false;
    updateAutoPlayUI();
    el.btnMp3Play.textContent = "⏸ 停止單元朗讀";

    do {
      const unit = UNIT_BY_NUM.get(state.unitNum);
      if (!unit) break;
      for (let idx = 0; idx < unit.words.length; idx++) {
        if (sessionId !== state.playSessionId || !state.mmVoicePlaying) return;
        const w = unit.words[idx];
        highlightMindmapChip(idx);
        const rate = parseFloat(el.mp3Speed.value) || 1.0;
        const ok = await speakText(w.english, { isWord: true, rate, sessionId });
        if (!ok || sessionId !== state.playSessionId || !state.mmVoicePlaying) return;
        if (!(await sleepSession(650, sessionId))) return;
      }
    } while (el.unitMp3Audio.loop && sessionId === state.playSessionId && state.mmVoicePlaying);

    if (sessionId === state.playSessionId) {
      stopAllAutoPlay();
    }
  }

  // ---------------------------------------------------------------------------
  // Unit Selection & Rendering
  // ---------------------------------------------------------------------------
  function switchMode(newMode) {
    if (state.mode === newMode) return;
    stopAllAutoPlay();
    state.mode = newMode;

    el.modeTabs.forEach((tab) => {
      const active = tab.dataset.mode === newMode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    el.viewMindmap.classList.toggle("active", newMode === "mindmap");
    el.viewFlashcard.classList.toggle("active", newMode === "flashcard");
    el.viewTable.classList.toggle("active", newMode === "table");

    if (newMode === "flashcard") renderFlashcard();
    if (newMode === "table") renderTable();
    if (newMode === "mindmap") renderMindmap();
  }

  function selectUnit(unitNum, options = {}) {
    const {
      keepMode = true,
      mode = null,
      wordIdx = 0,
      autoplay = false,
    } = options;

    if (!UNIT_BY_NUM.has(unitNum)) return;

    if (!autoplay) {
      stopAllAutoPlay();
    } else {
      // Only stop timers/audio without clearing autoplay flow if invoked directly with autoplay=true
      state.playSessionId += 1;
      clearAllTimers();
      clearAudioAndSpeech();
    }

    state.unitNum = unitNum;
    const ch = CHAPTER_BY_UNIT.get(unitNum);
    const unit = UNIT_BY_NUM.get(unitNum);
    state.openChapters.add(ch.chapter_num);
    state.fcIndex = Math.max(0, Math.min(wordIdx, unit.words.length - 1));
    state.fcFlipped = false;

    if (mode) {
      state.mode = mode;
    } else if (!keepMode) {
      state.mode = "mindmap";
    }

    // Sync topbar & mode tabs
    el.hdrChBadge.textContent = `Ch. ${ch.chapter_num}`;
    el.hdrUnitBadge.textContent = `Unit ${String(unit.unit_num).padStart(3, "0")}`;
    el.hdrUnitTitle.textContent = unit.unit_title_zh;
    el.btnPrevUnit.disabled = unitNum <= 1;
    el.btnNextUnit.disabled = unitNum >= 133;

    el.modeTabs.forEach((tab) => {
      const active = tab.dataset.mode === state.mode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    el.viewMindmap.classList.toggle("active", state.mode === "mindmap");
    el.viewFlashcard.classList.toggle("active", state.mode === "flashcard");
    el.viewTable.classList.toggle("active", state.mode === "table");

    syncMp3Source(unit);
    renderSidebarNav();
    renderMindmap();
    renderFlashcard();
    renderTable();

    // Update subtle hash for easy bookmarking
    try {
      history.replaceState(null, "", `#u${String(unitNum).padStart(3, "0")}`);
    } catch (_) {}

    if (window.innerWidth <= 920) {
      el.appShell.classList.add("sidebar-collapsed");
    }

    if (autoplay) {
      runFlashcardAutoPlay();
    }
  }

  // ---------------------------------------------------------------------------
  // Sidebar & Instant Search
  // ---------------------------------------------------------------------------
  function renderSidebarNav() {
    const q = state.searchQuery.trim().toLowerCase();
    el.btnClearSearch.classList.toggle("hidden", !q);

    // Direct word search hits when query >= 1 char
    if (q) {
      const hits = [];
      for (const u of UNITS) {
        for (let i = 0; i < u.words.length; i++) {
          const w = u.words[i];
          if (w.english.toLowerCase().includes(q) || w.chinese.toLowerCase().includes(q)) {
            hits.push({ unit: u, word: w, idx: i });
            if (hits.length >= 40) break;
          }
        }
        if (hits.length >= 40) break;
      }

      if (hits.length) {
        el.wordSearchResults.classList.remove("hidden");
        el.wordSearchResults.innerHTML =
          `<div class="word-hit-title">符合單字（顯示前 ${hits.length} 筆，點擊直達字卡）</div>` +
          hits
            .map(
              (h) => `
              <button class="word-hit-btn" data-unit="${h.unit.unit_num}" data-idx="${h.idx}" type="button">
                <span><span class="word-hit-en">${escapeHtml(h.word.english)}</span><span class="word-hit-zh">${escapeHtml(h.word.chinese)}</span></span>
                <span class="word-hit-meta">U${String(h.unit.unit_num).padStart(3, "0")} #${h.word.num}</span>
              </button>`
            )
            .join("");
      } else {
        el.wordSearchResults.classList.add("hidden");
        el.wordSearchResults.innerHTML = "";
      }
    } else {
      el.wordSearchResults.classList.add("hidden");
      el.wordSearchResults.innerHTML = "";
    }

    const activeChNum = CHAPTER_BY_UNIT.get(state.unitNum)?.chapter_num;
    let html = "";
    for (const ch of CHAPTERS) {
      const matchingUnits = q
        ? ch.units.filter((u) => {
            const uTag = `u${String(u.unit_num).padStart(3, "0")}`;
            const uNumStr = String(u.unit_num);
            return (
              uNumStr.includes(q) ||
              uTag.includes(q) ||
              u.unit_title_zh.toLowerCase().includes(q) ||
              u.unit_title_en.toLowerCase().includes(q) ||
              ch.chapter_title.toLowerCase().includes(q) ||
              u.words.some((w) => w.english.toLowerCase().includes(q) || w.chinese.toLowerCase().includes(q))
            );
          })
        : ch.units;

      if (!matchingUnits.length) continue;

      const isOpen = Boolean(q) || state.openChapters.has(ch.chapter_num);
      const isActiveCh = ch.chapter_num === activeChNum;

      html += `
        <div class="ch-group ${isOpen ? "open" : ""} ${isActiveCh ? "active-ch" : ""}" data-ch="${ch.chapter_num}">
          <button class="ch-header" type="button">
            <span class="ch-header-left">
              <span class="ch-num-pill">Ch.${ch.chapter_num}</span>
              <span class="ch-title-text">${escapeHtml(ch.chapter_title)}</span>
            </span>
            <span class="ch-caret">▶</span>
          </button>
          <div class="ch-units">
            ${matchingUnits
              .map(
                (u) => `
              <div class="unit-item ${u.unit_num === state.unitNum ? "active" : ""}">
                <button class="unit-select-btn" data-unit="${u.unit_num}" type="button">
                  <span class="u-num">${String(u.unit_num).padStart(3, "0")}</span>
                  <span class="u-names">
                    <span class="u-zh">${escapeHtml(u.unit_title_zh)}</span>
                    <span class="u-en">${escapeHtml(u.unit_title_en)}</span>
                  </span>
                  <span class="u-cnt">(${u.words.length})</span>
                </button>
                <button class="unit-quick-play" data-unit="${u.unit_num}" type="button" title="一鍵自動播放 Unit ${String(u.unit_num).padStart(3, "0")} 字卡">▶</button>
              </div>`
              )
              .join("")}
          </div>
        </div>`;
    }

    el.chapterNav.innerHTML = html || `<div style="padding:18px;text-align:center;color:#64748b;font-size:13px;">找不到符合「${escapeHtml(q)}」的單元或單字</div>`;

    const activeEl = el.chapterNav.querySelector(".unit-item.active");
    if (activeEl && !q) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }

  // ---------------------------------------------------------------------------
  // View 1: Mind Map Rendering
  // ---------------------------------------------------------------------------
  function renderMindmap() {
    const ch = CHAPTER_BY_UNIT.get(state.unitNum);
    const unit = UNIT_BY_NUM.get(state.unitNum);
    if (!unit) return;

    el.mmBannerImg.src = encodeURI(unit.banner_img);
    el.mmUnitMeta.textContent = `Chapter ${ch.chapter_num} ${ch.chapter_title} • Unit ${String(unit.unit_num).padStart(3, "0")} • ${unit.words.length} 個單字`;
    el.mmUnitHeading.textContent = `${unit.unit_title_zh} ${unit.unit_title_en}`;

    const slideSrc = state.mmLang === "en" ? unit.mindmap_en_img : unit.mindmap_zh_img;
    el.mmSlideImg.src = encodeURI(slideSrc);
    el.btnMmEn.classList.toggle("active", state.mmLang === "en");
    el.btnMmZh.classList.toggle("active", state.mmLang === "zh");

    applyMindmapZoom();

    el.mmWordCount.textContent = String(unit.words.length);
    el.btnToggleMmZh.textContent = state.mmShowZhChips ? "隱藏中文提示" : "顯示中文提示";
    el.mmWordChips.innerHTML = unit.words
      .map(
        (w, i) => `
        <button class="mm-chip" data-idx="${i}" type="button" title="點擊朗讀 ${escapeHtml(w.english)}">
          <span class="chip-num">${w.num}</span>
          <span class="chip-en">${escapeHtml(w.english)}</span>
          ${state.mmShowZhChips ? `<span class="chip-zh">${escapeHtml(w.chinese)}</span>` : ""}
        </button>`
      )
      .join("");
  }

  function applyMindmapZoom() {
    el.zoomBtns.forEach((b) => b.classList.toggle("active", Number(b.dataset.zoom) === state.mmZoom));
    if (state.mmZoom === 100) {
      el.mmSlideImg.style.width = "100%";
      el.mmSlideImg.style.maxWidth = "1120px";
    } else {
      el.mmSlideImg.style.maxWidth = "none";
      el.mmSlideImg.style.width = `${state.mmZoom}%`;
    }
  }

  function openLightbox() {
    const unit = UNIT_BY_NUM.get(state.unitNum);
    if (!unit) return;
    const label = state.mmLang === "en" ? "全英心智圖" : "中英對照心智圖";
    el.lbTitle.textContent = `Unit ${String(unit.unit_num).padStart(3, "0")} ${unit.unit_title_zh} — ${label}`;
    el.lbImg.src = encodeURI(state.mmLang === "en" ? unit.mindmap_en_img : unit.mindmap_zh_img);
    el.lightbox.classList.remove("hidden");
  }

  function closeLightbox() {
    el.lightbox.classList.add("hidden");
  }

  // ---------------------------------------------------------------------------
  // View 2: Flashcard Rendering
  // ---------------------------------------------------------------------------
  function renderFlashcard() {
    const unit = UNIT_BY_NUM.get(state.unitNum);
    if (!unit || !unit.words.length) return;
    const total = unit.words.length;
    const idx = Math.max(0, Math.min(state.fcIndex, total - 1));
    state.fcIndex = idx;
    const w = unit.words[idx];

    el.fcProgressText.textContent = `Unit ${String(unit.unit_num).padStart(3, "0")} ${unit.unit_title_zh} • 第 ${idx + 1} / ${total} 個單字`;
    el.fcProgressFill.style.width = `${((idx + 1) / total) * 100}%`;

    const isSync = state.fcDisplayMode === "sync";
    el.flashcardEl.classList.toggle("flipped", !isSync && state.fcFlipped);
    el.fcSyncDetails.classList.toggle("hidden", !isSync);
    el.fcFlipHint.classList.toggle("hidden", isSync);
    el.btnFcFlip.disabled = isSync;

    // Front values
    el.fcNumFront.textContent = `#${w.num}`;
    el.fcPosFront.textContent = w.pos || "";
    el.fcUnitMiniFront.textContent = `Unit ${String(unit.unit_num).padStart(3, "0")} ${unit.unit_title_zh}`;
    el.fcEnFront.textContent = w.english;

    // Sync view details
    el.fcZhSync.textContent = w.chinese;
    if (w.example_en) {
      el.fcExSync.classList.remove("hidden");
      el.fcExEnSync.textContent = w.example_en;
      el.fcExZhSync.textContent = w.example_zh || "";
      el.fcExZhSync.classList.toggle("hidden", !w.example_zh);
    } else {
      el.fcExSync.classList.add("hidden");
    }

    // Back face values
    el.fcNumBack.textContent = `#${w.num}`;
    el.fcEnBack.textContent = w.english;
    el.fcPosBack.textContent = w.pos || "";
    el.fcUnitMiniBack.textContent = `Unit ${String(unit.unit_num).padStart(3, "0")}`;
    el.fcZhBack.textContent = w.chinese;
    if (w.example_en) {
      el.fcExBack.classList.remove("hidden");
      el.fcExEnBack.textContent = w.example_en;
      el.fcExZhBack.textContent = w.example_zh || "";
      el.fcExZhBack.classList.toggle("hidden", !w.example_zh);
    } else {
      el.fcExBack.classList.add("hidden");
    }

    // Word quick-jump strip
    el.fcWordChips.innerHTML = unit.words
      .map(
        (item, i) => `
        <button class="fc-chip ${i === idx ? "active" : ""}" data-idx="${i}" type="button">
          ${item.num}. ${escapeHtml(item.english)}
        </button>`
      )
      .join("");
  }

  function stepFlashcard(delta) {
    const unit = UNIT_BY_NUM.get(state.unitNum);
    if (!unit) return;
    const total = unit.words.length;
    if (state.autoPlaying) stopAllAutoPlay();
    state.fcIndex = (state.fcIndex + delta + total) % total;
    state.fcFlipped = false;
    renderFlashcard();
  }

  function flipFlashcard() {
    if (state.fcDisplayMode === "sync") return;
    state.fcFlipped = !state.fcFlipped;
    renderFlashcard();
  }

  // ---------------------------------------------------------------------------
  // View 3: Word Table & Quick Quiz
  // ---------------------------------------------------------------------------
  function renderTable() {
    const unit = UNIT_BY_NUM.get(state.unitNum);
    if (!unit) return;

    el.tblUnitHeading.textContent = `Unit ${String(unit.unit_num).padStart(3, "0")} ${unit.unit_title_zh} ${unit.unit_title_en}`;
    el.tblWordCount.textContent = `${unit.words.length} 字`;

    el.quizMaskBtns.forEach((b) => b.classList.toggle("active", b.dataset.mask === state.maskMode));

    const hideEn = state.maskMode === "hide-en";
    const hideZh = state.maskMode === "hide-zh";

    el.vocabTableBody.innerHTML = unit.words
      .map((w, i) => {
        const enHtml = hideEn
          ? `<div class="tbl-en-wrap">
               <button class="btn btn-xs btn-speak-sm tbl-speak-btn" data-idx="${i}" type="button" title="朗讀英文提示">🔊</button>
               <span class="mask-cover" data-reveal="en">點擊顯示英文</span>
               <span class="tbl-en-word hidden" data-secret="en">${escapeHtml(w.english)}</span>
             </div>`
          : `<div class="tbl-en-wrap">
               <button class="btn btn-xs btn-speak-sm tbl-speak-btn" data-idx="${i}" type="button" title="朗讀單字">🔊</button>
               <span class="tbl-en-word">${escapeHtml(w.english)}</span>
             </div>`;

        const zhHtml = hideZh
          ? `<span class="mask-cover" data-reveal="zh">點擊顯示中文</span>
             <span class="hidden" data-secret="zh">${escapeHtml(w.chinese)}</span>`
          : escapeHtml(w.chinese);

        const exHtml = w.example_en
          ? `<div class="tbl-ex-en">${escapeHtml(w.example_en)}</div>${w.example_zh ? `<div class="tbl-ex-zh">${escapeHtml(w.example_zh)}</div>` : ""}`
          : `<span style="color:#94a3b8;font-size:13px;">—</span>`;

        return `
          <tr data-idx="${i}">
            <td class="col-num">${w.num}</td>
            <td class="col-en ${hideEn ? "maskable" : ""}">${enHtml}</td>
            <td class="col-pos">${escapeHtml(w.pos)}</td>
            <td class="col-zh ${hideZh ? "maskable" : ""}">${zhHtml}</td>
            <td class="col-ex">${exHtml}</td>
          </tr>`;
      })
      .join("");
  }

  function highlightTableSpeakingRow(idx) {
    const rows = el.vocabTableBody.querySelectorAll("tr");
    rows.forEach((tr) => {
      const match = Number(tr.dataset.idx) === idx;
      tr.classList.toggle("row-speaking", match);
      if (match) tr.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ---------------------------------------------------------------------------
  // Event Wiring
  // ---------------------------------------------------------------------------
  function wireEvents() {
    el.btnToggleSidebar.addEventListener("click", () => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      el.appShell.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
    });

    el.btnCloseSidebarMobile.addEventListener("click", () => {
      state.sidebarCollapsed = true;
      el.appShell.classList.add("sidebar-collapsed");
    });

    el.sidebarSearch.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      renderSidebarNav();
    });

    el.btnClearSearch.addEventListener("click", () => {
      state.searchQuery = "";
      el.sidebarSearch.value = "";
      renderSidebarNav();
      el.sidebarSearch.focus();
    });

    el.wordSearchResults.addEventListener("click", (e) => {
      const btn = e.target.closest(".word-hit-btn");
      if (!btn) return;
      const uid = Number(btn.dataset.unit);
      const idx = Number(btn.dataset.idx);
      selectUnit(uid, { mode: "flashcard", wordIdx: idx });
      const w = UNIT_BY_NUM.get(uid)?.words[idx];
      if (w) speakSingleImmediate(w.english, true);
    });

    el.chapterNav.addEventListener("click", (e) => {
      const quickPlay = e.target.closest(".unit-quick-play");
      if (quickPlay) {
        selectUnit(Number(quickPlay.dataset.unit), { mode: "flashcard", wordIdx: 0, autoplay: true });
        return;
      }

      const unitBtn = e.target.closest(".unit-select-btn");
      if (unitBtn) {
        selectUnit(Number(unitBtn.dataset.unit), { keepMode: true });
        return;
      }

      const chHdr = e.target.closest(".ch-header");
      if (chHdr) {
        const chGroup = chHdr.closest(".ch-group");
        const chNum = Number(chGroup.dataset.ch);
        if (state.openChapters.has(chNum)) {
          state.openChapters.delete(chNum);
        } else {
          state.openChapters.add(chNum);
        }
        chGroup.classList.toggle("open", state.openChapters.has(chNum));
      }
    });

    el.btnPrevUnit.addEventListener("click", () => {
      if (state.unitNum > 1) selectUnit(state.unitNum - 1, { keepMode: true });
    });

    el.btnNextUnit.addEventListener("click", () => {
      if (state.unitNum < 133) selectUnit(state.unitNum + 1, { keepMode: true });
    });

    el.modeTabs.forEach((tab) => {
      tab.addEventListener("click", () => switchMode(tab.dataset.mode));
    });

    el.ttsEngineSelect.addEventListener("change", (e) => {
      state.ttsEngine = e.target.value;
    });

    el.btnFullscreen.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    });

    // Mind Map Events
    el.btnMmStartFlashcards.addEventListener("click", () => {
      selectUnit(state.unitNum, { mode: "flashcard", wordIdx: 0, autoplay: true });
    });

    el.btnMmEn.addEventListener("click", () => {
      state.mmLang = "en";
      renderMindmap();
    });

    el.btnMmZh.addEventListener("click", () => {
      state.mmLang = "zh";
      renderMindmap();
    });

    el.zoomBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        state.mmZoom = Number(btn.dataset.zoom);
        applyMindmapZoom();
      });
    });

    el.btnMmLightbox.addEventListener("click", openLightbox);
    el.mmSlideImg.addEventListener("click", openLightbox);
    el.lbClose.addEventListener("click", closeLightbox);
    el.lbToggleLang.addEventListener("click", () => {
      state.mmLang = state.mmLang === "en" ? "zh" : "en";
      renderMindmap();
      openLightbox();
    });
    el.lightbox.addEventListener("click", (e) => {
      if (e.target === el.lightbox || e.target.classList.contains("lightbox-body")) {
        closeLightbox();
      }
    });

    el.btnToggleMmZh.addEventListener("click", () => {
      state.mmShowZhChips = !state.mmShowZhChips;
      renderMindmap();
    });

    el.btnMmToTable.addEventListener("click", () => switchMode("table"));

    el.mmWordChips.addEventListener("click", (e) => {
      const chip = e.target.closest(".mm-chip");
      if (!chip) return;
      const w = UNIT_BY_NUM.get(state.unitNum)?.words[Number(chip.dataset.idx)];
      if (w) speakSingleImmediate(w.english, true);
    });

    // MP3 Player Events
    el.btnMp3Play.addEventListener("click", () => {
      if (state.mmVoicePlaying) {
        stopAllAutoPlay();
        return;
      }
      if (!el.unitMp3Audio.paused) {
        stopUnitMp3();
        return;
      }
      stopAllAutoPlay();
      if (unitMp3Missing) {
        runMindmapVoiceFallback();
        return;
      }
      el.unitMp3Audio.play().then(() => {
        el.btnMp3Play.textContent = "⏸ 暫停音檔";
      }).catch(() => {
        unitMp3Missing = true;
        if (!state.mmVoicePlaying) runMindmapVoiceFallback();
      });
    });

    el.unitMp3Audio.addEventListener("error", () => {
      unitMp3Missing = true;
    });

    el.unitMp3Audio.addEventListener("timeupdate", () => {
      const dur = el.unitMp3Audio.duration || 0;
      const cur = el.unitMp3Audio.currentTime || 0;
      if (dur > 0) {
        el.mp3Seek.value = String((cur / dur) * 100);
      }
      el.mp3Time.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
    });

    el.unitMp3Audio.addEventListener("loadedmetadata", () => {
      el.mp3Time.textContent = `${formatTime(0)} / ${formatTime(el.unitMp3Audio.duration)}`;
    });

    el.unitMp3Audio.addEventListener("ended", () => {
      el.btnMp3Play.textContent = "▶ 課本音檔";
    });

    el.mp3Seek.addEventListener("input", (e) => {
      const dur = el.unitMp3Audio.duration || 0;
      if (dur > 0) {
        el.unitMp3Audio.currentTime = (parseFloat(e.target.value) / 100) * dur;
      }
    });

    el.mp3Speed.addEventListener("change", (e) => {
      el.unitMp3Audio.playbackRate = parseFloat(e.target.value) || 1;
    });

    el.btnMp3Loop.addEventListener("click", () => {
      el.unitMp3Audio.loop = !el.unitMp3Audio.loop;
      el.btnMp3Loop.classList.toggle("active", el.unitMp3Audio.loop);
    });

    // Flashcard Events
    el.btnAutoplay.addEventListener("click", () => {
      if (state.autoPlaying) {
        stopAllAutoPlay();
      } else {
        runFlashcardAutoPlay();
      }
    });

    el.fcDisplayMode.addEventListener("change", (e) => {
      state.fcDisplayMode = e.target.value;
      if (state.fcDisplayMode === "sync") state.fcFlipped = false;
      renderFlashcard();
    });
    el.fcRepeat.addEventListener("change", (e) => {
      state.fcRepeat = Number(e.target.value) || 1;
    });
    el.fcDelay.addEventListener("change", (e) => {
      state.fcDelayMs = Number(e.target.value) || 2000;
    });
    el.fcRate.addEventListener("change", (e) => {
      state.fcRate = parseFloat(e.target.value) || 1.0;
    });
    el.fcOnEnd.addEventListener("change", (e) => {
      state.fcOnEnd = e.target.value;
    });
    el.fcSpeakEx.addEventListener("change", (e) => {
      state.fcSpeakEx = e.target.checked;
    });

    el.flashcardEl.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      flipFlashcard();
    });

    const speakCurWord = (e) => {
      if (e) e.stopPropagation();
      const w = UNIT_BY_NUM.get(state.unitNum)?.words[state.fcIndex];
      if (w) speakSingleImmediate(w.english, true);
    };

    el.btnSpeakFront.addEventListener("click", speakCurWord);
    el.btnSpeakBack.addEventListener("click", speakCurWord);
    el.btnFcSpeak.addEventListener("click", speakCurWord);

    el.btnSpeakExBack.addEventListener("click", (e) => {
      e.stopPropagation();
      const w = UNIT_BY_NUM.get(state.unitNum)?.words[state.fcIndex];
      if (w && w.example_en) speakSingleImmediate(w.example_en, false);
    });

    el.btnFcPrev.addEventListener("click", () => stepFlashcard(-1));
    el.btnFcNext.addEventListener("click", () => stepFlashcard(1));
    el.btnFcFlip.addEventListener("click", flipFlashcard);

    el.fcWordChips.addEventListener("click", (e) => {
      const chip = e.target.closest(".fc-chip");
      if (!chip) return;
      const idx = Number(chip.dataset.idx);
      const wasPlaying = state.autoPlaying;
      stopAllAutoPlay();
      state.fcIndex = idx;
      state.fcFlipped = false;
      renderFlashcard();
      if (wasPlaying) {
        runFlashcardAutoPlay();
      } else {
        const w = UNIT_BY_NUM.get(state.unitNum)?.words[idx];
        if (w) speakSingleImmediate(w.english, true);
      }
    });

    // Word Table & Quiz Events
    el.quizMaskBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        state.maskMode = btn.dataset.mask;
        renderTable();
      });
    });

    el.vocabTableBody.addEventListener("click", (e) => {
      const speakBtn = e.target.closest(".tbl-speak-btn");
      if (speakBtn) {
        const w = UNIT_BY_NUM.get(state.unitNum)?.words[Number(speakBtn.dataset.idx)];
        if (w) speakSingleImmediate(w.english, true);
        return;
      }

      const maskCover = e.target.closest(".mask-cover");
      if (maskCover) {
        const td = maskCover.closest("td");
        maskCover.classList.add("hidden");
        const secret = td.querySelector("[data-secret]");
        if (secret) secret.classList.remove("hidden");
      }
    });

    el.btnRandomQuiz.addEventListener("click", () => {
      const unit = UNIT_BY_NUM.get(state.unitNum);
      if (!unit || !unit.words.length) return;
      const randIdx = Math.floor(Math.random() * unit.words.length);
      if (state.maskMode === "none") {
        state.maskMode = "hide-zh";
        renderTable();
      }
      const rows = el.vocabTableBody.querySelectorAll("tr");
      rows.forEach((tr) => tr.classList.toggle("row-quiz-target", Number(tr.dataset.idx) === randIdx));
      const targetRow = rows[randIdx];
      if (targetRow) targetRow.scrollIntoView({ block: "center", behavior: "smooth" });
      speakSingleImmediate(unit.words[randIdx].english, true);
    });

    el.btnTableAutoplay.addEventListener("click", () => {
      if (state.tableAutoPlaying) {
        stopAllAutoPlay();
      } else {
        runTableAutoPlay();
      }
    });

    // Global Classroom Keyboard Shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!el.lightbox.classList.contains("hidden")) {
          closeLightbox();
          return;
        }
        if (state.autoPlaying || state.tableAutoPlaying) {
          stopAllAutoPlay();
        }
        return;
      }

      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (state.mode === "flashcard") {
        if (e.code === "Space") {
          e.preventDefault();
          if (state.autoPlaying) stopAllAutoPlay();
          else runFlashcardAutoPlay();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          stepFlashcard(-1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          stepFlashcard(1);
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          flipFlashcard();
        } else if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          const w = UNIT_BY_NUM.get(state.unitNum)?.words[state.fcIndex];
          if (w) speakSingleImmediate(w.english, true);
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  function init() {
    el.bookStatsLabel.textContent = `${DATA.stats.chapters} Chapters • ${DATA.stats.units} Units • ${DATA.stats.words.toLocaleString()} Words`;
    wireEvents();

    let startUnit = 1;
    const m = /^#u(\d{1,3})$/.exec(window.location.hash || "");
    if (m) {
      const parsed = Number(m[1]);
      if (UNIT_BY_NUM.has(parsed)) startUnit = parsed;
    }

    selectUnit(startUnit, { mode: "mindmap" });
  }

  init();
})();
