(() => {
  const STORAGE_KEYS = {
    options: "neonWheel.options",
    history: "neonWheel.history",
  };
  const DEFAULT_OPTIONS = [
    "Charlie Kirk",
    "Epstein",
    "Mark Zuckerberg",
    "Donald Trump",
    "Diddy",
    "Netanyahu",
    "Lebron James",
    "Elon Musk",
  ];
  const LEGACY_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8"];
  const MAX_HISTORY = 5;
  const TAU = Math.PI * 2;
  const POINTER_ANGLE = -Math.PI / 2;
  const palette = [
    "#e40303",
    "#004dff",
    "#008026",
    "#ffed00",
    "#ff8c00",
    "#750787",
    "#ff5bbd",
    "#5bcffa",
  ];
  const spinLabels = ["spin", "risk it", "decide", "run it"];
  const spinMessages = [
    "running goon.exe ...",
    "hiding all nude photos ...",
    "critical error with file #67676767 ...",
  ];
  const memeComments = [
    "never back down never what!?",
    "thanks speed, i needed this.",
    "chat, is this real?",
    "you absolutely got frame mogged.",
    "100% luck, 0% brain.",
  ];
  const floatingTexts = ["ni**er", "67", "fuhhhhh...", "hawk tuah", "rip", "good luck"];
  const historyNotes = [
    "what the actual hell",
    "emotional damage",
    "recommended by ni**ers",
    "very cooked outcome",
    "how did this happen",
    "i guess bro",
  ];
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
    dialogCard: document.querySelector(".dialog-card"),
    winnerText: document.getElementById("winnerText"),
    winnerComment: document.getElementById("winnerComment"),
    resultEffect: document.getElementById("resultEffect"),
    closeDialog: document.getElementById("closeDialog"),
    confettiLayer: document.getElementById("confettiLayer"),
    floatingMemeLayer: document.getElementById("floatingMemeLayer"),
    rigPanel: document.getElementById("rigPanel"),
    rigTarget: document.getElementById("rigTarget"),
    hideRig: document.getElementById("hideRig"),
  };
  const ctx = elements.canvas.getContext("2d");
  const wheelLayer = document.createElement("canvas");
  wheelLayer.width = elements.canvas.width;
  wheelLayer.height = elements.canvas.height;
  const wheelCtx = wheelLayer.getContext("2d");
  const state = {
    options: [],
    history: [],
    rotation: 0,
    isSpinning: false,
    isDragging: false,
    pointerId: null,
    lastPointerAngle: 0,
    lastPointerTime: 0,
    angularVelocity: 0,
    dragDistance: 0,
    lastDragDirection: 1,
    spinFrame: null,
    dragFallbackTimer: null,
    floatingTimer: null,
    wheelDirty: true,
  };
  const sounds = {
    spin: new Audio("spin.mp3"),
    win: new Audio("win.mp3"),
    bruh: new Audio("bruh.mp3"),
  };
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
  function playSound(name) {
    const sound = sounds[name];
    if (!sound) return;
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
    elements.spinButton.disabled = !isValid || state.isSpinning || state.isDragging;
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
  function shortestAngleDelta(current, previous) {
    return Math.atan2(Math.sin(current - previous), Math.cos(current - previous));
  }
  function drawWheel() {
    const canvas = elements.canvas;
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 42;
    ctx.clearRect(0, 0, size, size);
    drawOuterGlow(center, radius);
    if (state.options.length < 2) {
      drawEmptyWheel(center, radius);
      return;
    }
    if (state.wheelDirty) {
      rebuildWheelLayer(size, center, radius);
      state.wheelDirty = false;
    }
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(state.rotation);
    ctx.drawImage(wheelLayer, -center, -center);
    ctx.restore();
    drawRings(center, radius);
    drawHub(center);
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
  }
  function drawOuterGlow(center, radius) {
    const glow = ctx.createRadialGradient(center, center, radius * 0.25, center, center, radius * 1.08);
    glow.addColorStop(0, "rgba(255, 79, 237, 0.08)");
    glow.addColorStop(0.7, "rgba(155, 92, 255, 0.12)");
    glow.addColorStop(1, "rgba(48, 215, 255, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(center, center, radius * 1.12, 0, TAU);
    ctx.fill();
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
    targetCtx.shadowBlur = 8;
    targetCtx.fillText(label, 0, 0, radius * 0.44);
    targetCtx.restore();
  }
  function drawRings(center, radius) {
    ctx.save();
    ctx.translate(center, center);
    ctx.beginPath();
    ctx.arc(0, 0, radius + 10, 0, TAU);
    ctx.strokeStyle = "#1d102a";
    ctx.lineWidth = 18;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius + 10, 0, TAU);
    ctx.strokeStyle = "rgba(48, 215, 255, 0.72)";
    ctx.lineWidth = 4;
    ctx.shadowColor = "rgba(48, 215, 255, 0.75)";
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius - 4, 0, TAU);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.26)";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
  }
  function drawHub(center) {
    const gradient = ctx.createRadialGradient(center, center, 2, center, center, 58);
    gradient.addColorStop(0, "#fff");
    gradient.addColorStop(0.32, "#ff4fed");
    gradient.addColorStop(1, "#481067");
    ctx.beginPath();
    ctx.arc(center, center, 56, 0, TAU);
    ctx.fillStyle = gradient;
    ctx.shadowColor = "rgba(255, 79, 237, 0.6)";
    ctx.shadowBlur = 22;
    ctx.fill();
    ctx.shadowBlur = 0;
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
    if (state.isSpinning || state.isDragging || !updateOptions()) {
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
    startFloatingMemeBurst();
    const targetIndex = pickWinnerIndex();
    const startRotation = state.rotation;
    const current = normalizeAngle(startRotation);
    const landing = normalizeAngle(getLandingRotation(targetIndex));
    const delta = normalizeAngle(landing - current);
    const fullTurns = 16 + Math.floor(Math.random() * 6);
    const finalRotation = startRotation + fullTurns * TAU + delta;
    const duration = 5600 + Math.random() * 1600;
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
    const comment = randomItem(memeComments);
    resetResultEffects();
    elements.winnerText.textContent = winner;
    elements.winnerComment.textContent = comment;
    elements.resultDialog.hidden = false;
    applyEasterEgg(winner);
    fireConfetti();
    spawnFloatingMeme(randomItem(floatingTexts), { center: true });
  }
  function resetResultEffects() {
    elements.dialogCard.classList.remove("skill-shake", "grass-card", "cooked-card");
    elements.resultEffect.textContent = "💀💀💀";
    document.body.classList.remove("grass-glow");
  }
  function applyEasterEgg(winner) {
    if (winner === "Skill issue") {
      elements.dialogCard.classList.add("skill-shake");
      elements.resultEffect.textContent = "💀💀💀";
      return;
    }
    if (winner === "Touch grass") {
      elements.dialogCard.classList.add("grass-card");
      elements.resultEffect.textContent = "🔥🔥🔥";
      document.body.classList.add("grass-glow");
      window.setTimeout(() => document.body.classList.remove("grass-glow"), 1300);
      return;
    }
    if (winner === "Bro cooked") {
      elements.dialogCard.classList.add("cooked-card");
      elements.resultEffect.textContent = "🔥🔥🔥";
    }
  }
  function spawnFloatingMeme(text = randomItem(floatingTexts), options = {}) {
    const label = document.createElement("span");
    label.className = "floating-meme";
    label.textContent = text;
    label.style.setProperty("--left", options.center ? "50%" : `${8 + Math.random() * 84}%`);
    label.style.setProperty("--top", options.center ? "42%" : `${18 + Math.random() * 58}%`);
    label.style.setProperty("--x", `${(Math.random() - 0.5) * 260}px`);
    elements.floatingMemeLayer.appendChild(label);
    window.setTimeout(() => {
      label.remove();
    }, 1400);
  }
  function startFloatingMemeBurst() {
    spawnFloatingMeme();
    window.clearInterval(state.floatingTimer);
    state.floatingTimer = window.setInterval(() => {
      if (!state.isSpinning && !state.isDragging) {
        window.clearInterval(state.floatingTimer);
        state.floatingTimer = null;
        return;
      }
      spawnFloatingMeme();
    }, 720);
  }
  function fireConfetti() {
    elements.confettiLayer.innerHTML = "";
    for (let index = 0; index < 36; index += 1) {
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
    state.isDragging = false;
    state.angularVelocity = 0;
    state.dragDistance = 0;
    window.clearInterval(state.floatingTimer);
    state.floatingTimer = null;
    elements.floatingMemeLayer.innerHTML = "";
    elements.confettiLayer.innerHTML = "";
    document.body.classList.remove("wheel-dragging", "wheel-active");
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
  function getPointerAngle(event) {
    const rect = elements.canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(event.clientY - centerY, event.clientX - centerX);
  }
  function beginWheelDrag(event) {
    if (event.button !== 0) {
      return;
    }
    if (state.isSpinning || !updateOptions()) {
      return;
    }
    closeResultDialog();
    cancelActiveAnimation();
    state.isDragging = true;
    state.pointerId = event.pointerId;
    state.lastPointerAngle = getPointerAngle(event);
    state.lastPointerTime = performance.now();
    state.angularVelocity = 0;
    state.dragDistance = 0;
    elements.spinButton.disabled = true;
    elements.statusMessage.textContent = "manual chaos detected ...";
    document.body.classList.add("wheel-dragging");
    setWheelActive(true);
    startFloatingMemeBurst();
    if (typeof elements.canvas.setPointerCapture === "function") {
      elements.canvas.setPointerCapture(event.pointerId);
    }
    window.clearTimeout(state.dragFallbackTimer);
    state.dragFallbackTimer = window.setTimeout(() => {
      if (state.isDragging && state.dragDistance < 0.05) {
        cancelWheelDrag();
      }
    }, 2200);
  }
  function moveWheelDrag(event) {
    if (!state.isDragging || event.pointerId !== state.pointerId) {
      return;
    }
    const now = performance.now();
    const currentAngle = getPointerAngle(event);
    const delta = shortestAngleDelta(currentAngle, state.lastPointerAngle);
    const elapsed = Math.max(16, now - state.lastPointerTime);
    state.rotation = normalizeAngle(state.rotation + delta);
    state.angularVelocity = clamp(delta / elapsed, -0.045, 0.045);
    state.dragDistance += Math.abs(delta);
    if (Math.abs(delta) > 0.001) {
      state.lastDragDirection = Math.sign(delta);
    }
    state.lastPointerAngle = currentAngle;
    state.lastPointerTime = now;
    drawWheel();
  }
  function endWheelDrag(event) {
    if (!state.isDragging || event.pointerId !== state.pointerId) {
      return;
    }
    state.isDragging = false;
    state.pointerId = null;
    document.body.classList.remove("wheel-dragging");
    window.clearTimeout(state.dragFallbackTimer);
    if (
      typeof elements.canvas.hasPointerCapture === "function" &&
      elements.canvas.hasPointerCapture(event.pointerId)
    ) {
      elements.canvas.releasePointerCapture(event.pointerId);
    }
    const launchVelocity = state.angularVelocity;
    if (state.dragDistance < 0.05) {
      elements.spinButton.disabled = state.options.length < 2;
      elements.statusMessage.textContent = "";
      setWheelActive(false);
      return;
    }
    const riggedIndex = getRiggedIndex();
    if (Math.abs(launchVelocity) < 0.0008) {
      if (riggedIndex >= 0) {
        startRiggedCursorSpin(launchVelocity || state.lastDragDirection * 0.003, riggedIndex);
        return;
      }
      settleCurrentPosition();
      return;
    }
    startPhysicsSpin(launchVelocity);
  }
  function forceEndWheelDrag() {
    if (!state.isDragging) {
      return;
    }
    state.isDragging = false;
    state.pointerId = null;
    document.body.classList.remove("wheel-dragging");
    window.clearTimeout(state.dragFallbackTimer);
    if (state.dragDistance < 0.05) {
      cancelWheelDrag();
      return;
    }
    const riggedIndex = getRiggedIndex();
    if (Math.abs(state.angularVelocity) < 0.0008) {
      if (riggedIndex >= 0) {
        startRiggedCursorSpin(state.angularVelocity || state.lastDragDirection * 0.003, riggedIndex);
        return;
      }
      settleCurrentPosition();
      return;
    }
    startPhysicsSpin(state.angularVelocity);
  }
  function cancelWheelDrag() {
    state.isDragging = false;
    state.pointerId = null;
    state.angularVelocity = 0;
    state.dragDistance = 0;
    document.body.classList.remove("wheel-dragging");
    window.clearTimeout(state.dragFallbackTimer);
    setWheelActive(false);
    elements.spinButton.disabled = state.options.length < 2;
    elements.statusMessage.textContent = "";
  }
  function startPhysicsSpin(initialVelocity) {
    cancelActiveAnimation();
    const riggedIndex = getRiggedIndex();
    if (riggedIndex >= 0) {
      startRiggedCursorSpin(initialVelocity, riggedIndex);
      return;
    }
    state.isSpinning = true;
    state.angularVelocity = initialVelocity * 1.8;
    elements.spinButton.disabled = true;
    elements.statusMessage.textContent = "physics said: wheeeee.";
    playSound("spin");
    setWheelActive(true);
    let previousTime = performance.now();
    const friction = 0.9942;
    const minVelocity = 0.00012;
    const startedAt = previousTime;
    const minRunTime = 1400;
    function animate(now) {
      const elapsed = Math.min(34, now - previousTime);
      previousTime = now;
      const dt = elapsed / 16.6667;
      state.rotation += state.angularVelocity * dt;
      state.angularVelocity *= Math.pow(friction, dt);
      drawWheel();
      if (Math.abs(state.angularVelocity) > minVelocity || now - startedAt < minRunTime) {
        state.spinFrame = requestAnimationFrame(animate);
        return;
      }
      state.spinFrame = null;
      settleCurrentPosition();
    }
    state.spinFrame = requestAnimationFrame(animate);
  }
  function getRiggedIndex() {
    return state.options.indexOf(elements.rigTarget.value);
  }
  function startRiggedCursorSpin(initialVelocity, targetIndex) {
    cancelActiveAnimation();
    state.isSpinning = true;
    state.angularVelocity = 0;
    elements.spinButton.disabled = true;
    elements.statusMessage.textContent = "randomness has decided";
    playSound("spin");
    setWheelActive(true);
    startFloatingMemeBurst();
    const startRotation = state.rotation;
    const current = normalizeAngle(startRotation);
    const landing = normalizeAngle(getLandingRotation(targetIndex));
    const direction = Math.sign(initialVelocity) || state.lastDragDirection || 1;
    const extraTurns = 2 + Math.floor(Math.random() * 3);
    const forwardDelta = normalizeAngle(landing - current);
    const backwardDelta = normalizeAngle(current - landing);
    const delta = direction > 0
      ? extraTurns * TAU + forwardDelta
      : -(extraTurns * TAU + backwardDelta);
    const finalRotation = startRotation + delta;
    const releaseSpeed = clamp(Math.abs(initialVelocity) * 1.65, 0.0045, 0.024);
    const duration = clamp(Math.abs(delta) / releaseSpeed, 2800, 6200);
    const startedAt = performance.now();
    function animate(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3.4);
      state.rotation = normalizeAngle(startRotation + delta * eased);
      drawWheel();
      if (progress < 1) {
        state.spinFrame = requestAnimationFrame(animate);
        return;
      }
      state.rotation = normalizeAngle(finalRotation);
      state.spinFrame = null;
      finishSpin();
    }
    state.spinFrame = requestAnimationFrame(animate);
  }
  function settleCurrentPosition() {
    const riggedIndex = getRiggedIndex();
    const targetIndex = riggedIndex >= 0 ? riggedIndex : getWinnerIndexForRotation(state.rotation);
    const landing = getLandingRotation(targetIndex);
    const delta = shortestAngleDelta(normalizeAngle(landing), normalizeAngle(state.rotation));
    const startRotation = state.rotation;
    const finalRotation = startRotation + delta;
    const duration = riggedIndex >= 0 ? 900 : 420;
    const startedAt = performance.now();
    state.isSpinning = true;
    elements.spinButton.disabled = true;
    function animate(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = easeOutCubic(progress);
      state.rotation = normalizeAngle(startRotation + (finalRotation - startRotation) * eased);
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
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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
    elements.canvas.addEventListener("pointerdown", beginWheelDrag);
    elements.canvas.addEventListener("pointermove", moveWheelDrag);
    elements.canvas.addEventListener("pointerup", endWheelDrag);
    elements.canvas.addEventListener("pointercancel", endWheelDrag);
    window.addEventListener("pointerup", endWheelDrag);
    window.addEventListener("pointercancel", endWheelDrag);
    window.addEventListener("mouseup", forceEndWheelDrag);
    window.addEventListener("blur", cancelWheelDrag);
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
    loadStoredData();
    bindEvents();
    updateSpinLabel();
    window.setInterval(() => {
      if (!state.isSpinning && !state.isDragging) {
        updateSpinLabel();
      }
    }, 2200);
    updateOptions({ persist: false });
    renderHistory();
  }
  init();
})();
