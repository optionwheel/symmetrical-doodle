(() => {
  const STORAGE_KEYS = {options: "neonWheel.options", history: "neonWheel.history",};
  const DEFAULT_OPTIONS = ["Charlie Kirk", "Epstein", "Mark Zuckerberg", "Donald Trump", "Diddy", "Netanyahu", "Lebron James", "Elon Musk",];
  const LEGACY_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8"];
  const MAX_HISTORY = 5;
  const TAU = Math.PI * 2;
  const POINTER_ANGLE = -Math.PI / 2;
  const palette = ["#e40303", "#004dff", "#008026", "#ffed00", "#ff8c00", "#750787", "#ff5bbd", "#5bcffa",];
  const spinLabels = ["spin it", "risk it", "turn it", "run it"];
  const spinMessages = ["john pork is calling ...", "running goon.exe ...", "hiding all nude photos ...", "waiting on response from block #67 ...", "calculating your forehead ...", "taking a big shit ...", "leaking your ip ...", "connecting to po*nhub.com ...", "reporting you to police ...", "confirming your bank details ...", "flirting with your ex ...",];
  const clipPool = Array.from({ length: 40 }, (_, index) => "./media/" + (index + 1) + ".webm");
  const historyNotes = ["what the flip", "emotional damage", "recommended by nigg*rs", "we're so cooked", "how did this happen", "i guess bro", "who approved this", "witnessing greatness", "absolute peak", "villain won", "easy sidequest", "generational fumble", "w speed", "never back down, never what", "frame mogged by asu frat leader", "hawk tuah and spit on that thing", "rest in piece my granny", "you know what else is massive", "i mean it's alright", "ultimate chill guy", "+10000000 aura", "always 2 steps ahead", "i've played these games before", "standing on business", "lowkirkuinly well deserved", "bagged megan fox", "i'd rather double it", "always 2 steps behind",];
  const elements = {
    canvas: document.getElementById("wheelCanvas"),
    spinButton: document.getElementById("spinButton"),
    spinButtonLabel: document.querySelector("#spinButton span"),
    optionsTitleButton: document.getElementById("optionsTitleButton"),
    optionsInput: document.getElementById("optionsInput"),
    resetOptions: document.getElementById("resetOptions"),
    optionCount: document.getElementById("optionCount"),
    optionsError: document.getElementById("optionsError"),
    statusMessage: document.getElementById("statusMessage"),
    historyList: document.getElementById("historyList"),
    resultDialog: document.getElementById("resultDialog"),
    winnerText: document.getElementById("winnerText"),
    resultEffect: document.getElementById("resultEffect"),
    closeDialog: document.getElementById("closeDialog"),
    confettiLayer: document.getElementById("confettiLayer"),
    rigPanel: document.getElementById("rigPanel"),
    rigTarget: document.getElementById("rigTarget"),
    hideRig: document.getElementById("hideRig"),
  };
  const RENDER_SIZE = 560;
  elements.canvas.width = RENDER_SIZE;
  elements.canvas.height = RENDER_SIZE;
  const ctx = elements.canvas.getContext("2d", { desynchronized: true });
  const wheelLayer = document.createElement("canvas");
  wheelLayer.width = elements.canvas.width;
  wheelLayer.height = elements.canvas.height;
  const wheelCtx = wheelLayer.getContext("2d");
  const staticLayer = document.createElement("canvas");
  staticLayer.width = elements.canvas.width;
  staticLayer.height = elements.canvas.height;
  const staticCtx = staticLayer.getContext("2d");
  const state = {
    options: [],
    history: [],
    rotation: 0,
    isSpinning: false,
    wheelDirty: true,
    overlayDirty: true,
  };
  const sounds = {};
  const mediaCache = new Map();
  const preloadedGifQueue = [];
  let gifPreloadPromise = null;

  function loadStoredData() {
    const storedOptions = readJson(STORAGE_KEYS.options, DEFAULT_OPTIONS);
    const storedHistory = readJson(STORAGE_KEYS.history, []);
    const optionsToUse = Array.isArray(storedOptions) && storedOptions.length > 0 && !isLegacyDefault(storedOptions)
      ? storedOptions
      : DEFAULT_OPTIONS;
    elements.statusMessage.textContent = "";
    elements.optionsError.textContent = "";
    state.history = Array.isArray(storedHistory) ? storedHistory.slice(0, MAX_HISTORY) : [];
    elements.optionsInput.value = optionsToUse.join("\n");
    elements.optionsInput.defaultValue = elements.optionsInput.value;
  }
  function isLegacyDefault(options) {
    return (
      Array.isArray(options) &&
      options.length === LEGACY_OPTIONS.length &&
      options.every((option, index) => option === LEGACY_OPTIONS[index])
    );
  }
  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }
  function saveState() {
    localStorage.setItem(STORAGE_KEYS.options, JSON.stringify(state.options));
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
  }
  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }
  function randomClipPath() {
    if (clipPool.length === 0) {
      return "./media/1.webm";
    }
    return randomItem(clipPool);
  }
  function preloadClip(src) {
    if (mediaCache.has(src)) {
      return mediaCache.get(src);
    }
    const promise = new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.onloadeddata = () => resolve(src);
      video.onerror = () => resolve(src);
      video.src = src;
    });
    mediaCache.set(src, promise);
    return promise;
  }
  function preloadAllClips() {
    if (!gifPreloadPromise) {
      gifPreloadPromise = Promise.all(clipPool.map((src) => preloadClip(src)));
    }
    return gifPreloadPromise;
  }
  function queueWarmClip() {
    const path = randomClipPath();
    preloadedGifQueue.push(path);
    return preloadClip(path).then(() => path);
  }
  function getReadyClipPath() {
    const queued = preloadedGifQueue.shift();
    if (queued) {
      queueWarmClip();
      return queued;
    }
    const fallback = randomClipPath();
    queueWarmClip();
    return fallback;
  }
  function playSound(name) {
    if (name !== "spin") return;
    let sound = sounds[name];
    if (!sound) {
      sound = new Audio("spin.mp3");
      sound.preload = "none";
      sounds[name] = sound;
    }
    try {
      sound.currentTime = 0;
      const playPromise = sound.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } catch {
    }
  }
  function updateSpinLabel() {
    elements.spinButtonLabel.textContent = randomItem(spinLabels);
  }
  function setWheelActive(isActive) {
    document.body.classList.toggle("wheel-active", isActive);
  }
  function parseOptions() {
    return elements.optionsInput.value
      .split(/\r?\n/)
      .map((option) => option.trim())
      .filter(Boolean);
  }
  function updateOptions({ persist = true } = {}) {
    const nextOptions = parseOptions();
    const isValid = nextOptions.length >= 2;
    elements.optionsError.textContent = isValid
      ? ""
      : "please enter at least two options.";
    elements.spinButton.disabled = !isValid || state.isSpinning;
    elements.optionCount.textContent = String(nextOptions.length);
    if (!isValid) {
      state.options = nextOptions;
      syncRigSelect("");
      state.wheelDirty = true;
      drawWheel();
      if (persist) {
        elements.optionsInput.defaultValue = elements.optionsInput.value;
        saveState();
      }
      return false;
    }
    const previousRigTarget = elements.rigTarget.value;
    state.options = nextOptions;
    if (elements.statusMessage.textContent === "no options left. the wheel is empty.") {
      elements.statusMessage.textContent = "";
    }
    syncRigSelect(previousRigTarget);
    state.wheelDirty = true;
    drawWheel();
    if (persist) {
      elements.optionsInput.defaultValue = elements.optionsInput.value;
      saveState();
    }
    return true;
  }
  function syncRigSelect(previousValue = "") {
    elements.rigTarget.innerHTML = '<option value="">Random</option>';
    state.options.forEach((option) => {
      const choice = document.createElement("option");
      choice.value = option;
      choice.textContent = option;
      elements.rigTarget.appendChild(choice);
    });
    if (state.options.includes(previousValue)) {
      elements.rigTarget.value = previousValue;
    }
  }
  function normalizeAngle(angle) {
    return ((angle % TAU) + TAU) % TAU;
  }
  function drawWheel() {
    const canvas = elements.canvas;
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 42;
    ctx.clearRect(0, 0, size, size);
    if (state.options.length < 2) {
      drawOuterGlow(ctx, center, radius);
      drawEmptyWheel(center, radius);
      return;
    }
    if (state.wheelDirty || state.overlayDirty) {
      rebuildWheelLayer(size, center, radius);
      state.wheelDirty = false;
      state.overlayDirty = false;
    }
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(state.rotation);
    ctx.drawImage(wheelLayer, -center, -center);
    ctx.restore();
    ctx.drawImage(staticLayer, 0, 0);
  }
  function rebuildWheelLayer(size, center, radius) {
    wheelCtx.clearRect(0, 0, size, size);
    wheelCtx.save();
    wheelCtx.translate(center, center);
    const segmentAngle = TAU / state.options.length;
    state.options.forEach((option, index) => {
      const startAngle = POINTER_ANGLE + index * segmentAngle;
      const endAngle = startAngle + segmentAngle;
      drawSegment(wheelCtx, startAngle, endAngle, radius, index);
      drawSegmentLabel(wheelCtx, option, startAngle + segmentAngle / 2, radius, segmentAngle);
    });
    wheelCtx.restore();
    rebuildStaticLayer(size, center, radius);
  }
  function rebuildStaticLayer(size, center, radius) {
    staticCtx.clearRect(0, 0, size, size);
    drawOuterGlow(staticCtx, center, radius);
    drawRings(staticCtx, center, radius);
    drawHub(staticCtx, center);
  }
  function drawOuterGlow(targetCtx, center, radius) {
    const glow = targetCtx.createRadialGradient(center, center, radius * 0.25, center, center, radius * 1.08);
    glow.addColorStop(0, "rgba(255, 79, 237, 0.08)");
    glow.addColorStop(0.7, "rgba(155, 92, 255, 0.12)");
    glow.addColorStop(1, "rgba(48, 215, 255, 0)");
    targetCtx.fillStyle = glow;
    targetCtx.beginPath();
    targetCtx.arc(center, center, radius * 1.12, 0, TAU);
    targetCtx.fill();
  }
  function drawEmptyWheel(center, radius) {
    ctx.save();
    ctx.translate(center, center);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 79, 237, 0.45)";
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.font = "700 32px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("i need at least 2 options twin", 0, 0);
    ctx.restore();
  }
  function drawSegment(targetCtx, startAngle, endAngle, radius, index) {
    const gradient = targetCtx.createRadialGradient(0, 0, radius * 0.08, 0, 0, radius);
    gradient.addColorStop(0, lightenColor(palette[index % palette.length], 18));
    gradient.addColorStop(1, palette[index % palette.length]);
    targetCtx.beginPath();
    targetCtx.moveTo(0, 0);
    targetCtx.arc(0, 0, radius, startAngle, endAngle);
    targetCtx.closePath();
    targetCtx.fillStyle = gradient;
    targetCtx.fill();
    targetCtx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    targetCtx.lineWidth = 2;
    targetCtx.stroke();
  }
  function drawSegmentLabel(targetCtx, option, angle, radius, segmentAngle) {
    const fontSize = Math.max(18, Math.min(34, radius * 0.1, segmentAngle * radius * 0.16));
    const label = option.length > 18 ? `${option.slice(0, 17)}…` : option;
    targetCtx.save();
    targetCtx.rotate(angle);
    targetCtx.translate(radius * 0.68, 0);
    targetCtx.rotate(Math.PI / 2);
    targetCtx.fillStyle = "rgba(255, 255, 255, 0.92)";
    targetCtx.font = `900 ${fontSize}px Arial, sans-serif`;
    targetCtx.textAlign = "center";
    targetCtx.textBaseline = "middle";
    targetCtx.shadowColor = "rgba(0, 0, 0, 0.4)";
    targetCtx.shadowBlur = 0;
    targetCtx.fillText(label, 0, 0, radius * 0.44);
    targetCtx.restore();
  }
  function drawRings(targetCtx, center, radius) {
    targetCtx.save();
    targetCtx.translate(center, center);
    targetCtx.beginPath();
    targetCtx.arc(0, 0, radius + 10, 0, TAU);
    targetCtx.strokeStyle = "#1d102a";
    targetCtx.lineWidth = 18;
    targetCtx.stroke();
    targetCtx.beginPath();
    targetCtx.arc(0, 0, radius + 10, 0, TAU);
    targetCtx.strokeStyle = "rgba(48, 215, 255, 0.72)";
    targetCtx.lineWidth = 4;
    targetCtx.shadowColor = "rgba(48, 215, 255, 0.75)";
    targetCtx.shadowBlur = 18;
    targetCtx.stroke();
    targetCtx.beginPath();
    targetCtx.arc(0, 0, radius - 4, 0, TAU);
    targetCtx.strokeStyle = "rgba(255, 255, 255, 0.26)";
    targetCtx.lineWidth = 3;
    targetCtx.shadowBlur = 0;
    targetCtx.stroke();
    targetCtx.restore();
  }
  function drawHub(targetCtx, center) {
    const gradient = targetCtx.createRadialGradient(center, center, 2, center, center, 58);
    gradient.addColorStop(0, "#fff");
    gradient.addColorStop(0.32, "#ff4fed");
    gradient.addColorStop(1, "#481067");
    targetCtx.beginPath();
    targetCtx.arc(center, center, 56, 0, TAU);
    targetCtx.fillStyle = gradient;
    targetCtx.shadowColor = "rgba(255, 79, 237, 0.6)";
    targetCtx.shadowBlur = 22;
    targetCtx.fill();
    targetCtx.shadowBlur = 0;
  }
  function lightenColor(hex, amount) {
    const value = Number.parseInt(hex.slice(1), 16);
    const red = Math.min(255, ((value >> 16) & 255) + amount);
    const green = Math.min(255, ((value >> 8) & 255) + amount);
    const blue = Math.min(255, (value & 255) + amount);
    return `rgb(${red}, ${green}, ${blue})`;
  }
  function getWinnerIndexForRotation(rotation) {
    const segmentAngle = TAU / state.options.length;
    const pointerOnWheel = normalizeAngle(POINTER_ANGLE - rotation - POINTER_ANGLE);
    return Math.floor(pointerOnWheel / segmentAngle) % state.options.length;
  }
  function getLandingRotation(targetIndex) {
    const segmentAngle = TAU / state.options.length;
    const safeOffset = segmentAngle * (0.22 + Math.random() * 0.56);
    const localLandingAngle = POINTER_ANGLE + targetIndex * segmentAngle + safeOffset;
    return POINTER_ANGLE - localLandingAngle;
  }
  function pickWinnerIndex() {
    const riggedValue = elements.rigTarget.value;
    const riggedIndex = state.options.indexOf(riggedValue);
    return riggedIndex >= 0 ? riggedIndex : Math.floor(Math.random() * state.options.length);
  }
  function spinWheel() {
    if (state.isSpinning || !updateOptions()) {
      return;
    }
    closeResultDialog();
    cancelActiveAnimation();
    state.isSpinning = true;
    elements.spinButton.disabled = true;
    elements.statusMessage.textContent = randomItem(spinMessages);
    updateSpinLabel();
    playSound("spin");
    setWheelActive(true);
    const targetIndex = pickWinnerIndex();
    const startRotation = state.rotation;
    const current = normalizeAngle(startRotation);
    const landing = normalizeAngle(getLandingRotation(targetIndex));
    const delta = normalizeAngle(landing - current);
    const fullTurns = 14 + Math.floor(Math.random() * 7);
    const finalRotation = startRotation + fullTurns * TAU + delta;
    const duration = 3200 + Math.random() * 1400;
    const startedAt = performance.now();
    function animate(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = easeOutCubic(progress);
      state.rotation = startRotation + (finalRotation - startRotation) * eased;
      drawWheel();
      if (progress < 1) {
        state.spinFrame = requestAnimationFrame(animate);
        return;
      }
      state.spinFrame = null;
      finishSpin();
    }
    state.spinFrame = requestAnimationFrame(animate);
  }
  function easeOutCubic(progress) {
    return 1 - Math.pow(1 - progress, 3);
  }
  function finishSpin() {
    const winner = state.options[getWinnerIndexForRotation(state.rotation)];
    const riggedIndex = getRiggedIndex();
    state.isSpinning = false;
    elements.spinButton.disabled = state.options.length < 2;
    elements.statusMessage.textContent = `Winner: ${winner}`;
    setWheelActive(false);
    updateSpinLabel();
    addHistoryItem(winner);
    showResult(winner);
    drawWheel();
    saveState();
    if (riggedIndex >= 0) {
      elements.rigTarget.value = "";
    }
  }
  function addHistoryItem(winner) {
    const time = new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
    state.history.unshift({ winner, time, note: randomItem(historyNotes) });
    state.history = state.history.slice(0, MAX_HISTORY);
    renderHistory();
  }
  function renderHistory() {
    elements.historyList.innerHTML = "";
    if (state.history.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty-history";
      empty.textContent = "no spins yet";
      elements.historyList.appendChild(empty);
      return;
    }
    state.history.forEach((entry) => {
      const item = document.createElement("li");
      const note = entry.note || randomItem(historyNotes);
      item.innerHTML = `
        <span>
          <strong>${escapeHtml(entry.winner)}</strong>
          <span class="history-note"> — ${escapeHtml(note)}</span>
        </span>
        <span>${escapeHtml(entry.time)}</span>
      `;
      elements.historyList.appendChild(item);
    });
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };
      return entities[char];
    });
  }
  function showResult(winner) {
    resetResultEffects();
    elements.winnerText.textContent = winner;
    elements.resultDialog.hidden = false;
    const clipPath = getReadyClipPath();
    const mp4Path = clipPath.replace(".webm", ".mp4");
    elements.resultEffect.innerHTML = "<video class=\"result-gif\" autoplay muted loop playsinline preload=\"auto\"><source src=\"" + escapeHtml(clipPath) + "\" type=\"video/webm\"><source src=\"" + escapeHtml(mp4Path) + "\" type=\"video/mp4\"></video>";
    fireConfetti();
  }
  function resetResultEffects() {
    const clipPath = getReadyClipPath();
    const mp4Path = clipPath.replace(".webm", ".mp4");
    elements.resultEffect.innerHTML = "<video class=\"result-gif\" autoplay muted loop playsinline preload=\"auto\"><source src=\"" + escapeHtml(clipPath) + "\" type=\"video/webm\"><source src=\"" + escapeHtml(mp4Path) + "\" type=\"video/mp4\"></video>";
  }
  function fireConfetti() {
    elements.confettiLayer.innerHTML = "";
    for (let index = 0; index < 18; index += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = palette[index % palette.length];
      piece.style.setProperty("--x", `${(Math.random() - 0.5) * 220}px`);
      piece.style.animationDelay = `${Math.random() * 150}ms`;
      elements.confettiLayer.appendChild(piece);
    }
    window.setTimeout(() => {
      elements.confettiLayer.innerHTML = "";
    }, 1500);
  }
  function resetOptions() {
    cancelActiveAnimation();
    closeResultDialog();
    elements.optionsInput.value = "";
    elements.optionsInput.defaultValue = "";
    state.options = [];
    state.history = [];
    state.rotation = 0;
    state.isSpinning = false;
    elements.confettiLayer.innerHTML = "";
    document.body.classList.remove("wheel-active");
    syncRigSelect("");
    state.wheelDirty = true;
    drawWheel();
    renderHistory();
    localStorage.removeItem(STORAGE_KEYS.options);
    localStorage.removeItem(STORAGE_KEYS.history);
    elements.optionCount.textContent = "0";
    elements.optionsError.textContent = "wheel needs at least 2 options to function.";
    elements.spinButton.disabled = true;
    elements.statusMessage.textContent = "no options left. the wheel is empty.";
  }
  function cancelActiveAnimation() {
    if (state.spinFrame) {
      cancelAnimationFrame(state.spinFrame);
      state.spinFrame = null;
    }
  }
  function getRiggedIndex() {
    return state.options.indexOf(elements.rigTarget.value);
  }
  function toggleRigPanel() {
    const isOpen = document.body.classList.toggle("rig-open");
    elements.optionsTitleButton.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) {
      elements.rigTarget.focus();
    }
  }
  function bindEvents() {
    elements.spinButton.addEventListener("click", spinWheel);
    elements.optionsTitleButton.addEventListener("click", toggleRigPanel);
    elements.resetOptions.addEventListener("click", resetOptions);
    elements.optionsInput.addEventListener("input", () => updateOptions());
    elements.closeDialog.addEventListener("click", closeResultDialog);
    elements.rigTarget.addEventListener("change", () => {
      document.body.classList.remove("rig-open");
      elements.optionsTitleButton.setAttribute("aria-expanded", "false");
    });
    elements.hideRig.addEventListener("click", () => {
    document.body.classList.remove("rig-open");
    elements.optionsTitleButton.setAttribute("aria-expanded", "false");
  });
    elements.resultDialog.addEventListener("click", (event) => {
      if (event.target === elements.resultDialog) {
        closeResultDialog();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        document.body.classList.remove("rig-open");
        elements.optionsTitleButton.setAttribute("aria-expanded", "false");
      }
    });
  }
  function closeResultDialog() {
    elements.resultDialog.hidden = true;
    resetResultEffects();
  }
  function init() {
    preloadAllClips().finally(() => {
      for (let index = 0; index < 3; index += 1) {
        queueWarmClip();
      }
    });
    loadStoredData();
    bindEvents();
    updateSpinLabel();
    window.setInterval(() => {
      if (!state.isSpinning) {
        updateSpinLabel();
      }
    }, 2200);
    updateOptions({ persist: false });
    renderHistory();
  }
  init();
})();
