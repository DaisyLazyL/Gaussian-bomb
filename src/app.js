const canvas = document.querySelector("#sceneCanvas");
const gl = canvas.getContext("webgl", { antialias: true, alpha: false });

const ui = {
  studioModeButton: document.querySelector("#studioModeButton"),
  gameModeButton: document.querySelector("#gameModeButton"),
  fileInput: document.querySelector("#fileInput"),
  dropZone: document.querySelector("#dropZone"),
  fileMeta: document.querySelector("#fileMeta"),
  fileStatusDot: document.querySelector("#fileStatusDot"),
  pointCount: document.querySelector("#pointCount"),
  selectedCount: document.querySelector("#selectedCount"),
  fpsCounter: document.querySelector("#fpsCounter"),
  interactionState: document.querySelector("#interactionState"),
  brushRadius: document.querySelector("#brushRadius"),
  editStrength: document.querySelector("#editStrength"),
  reticle: document.querySelector("#reticle"),
  cameraToggle: document.querySelector("#cameraToggle"),
  cameraStop: document.querySelector("#cameraStop"),
  resetScene: document.querySelector("#resetScene"),
  gesturePill: document.querySelector("#gesturePill"),
  cameraPreview: document.querySelector("#cameraPreview"),
  cameraEmpty: document.querySelector("#cameraEmpty"),
  handOverlay: document.querySelector("#handOverlay"),
  maskSelect: document.querySelector("#maskSelect"),
  handStatus: document.querySelector("#handStatus"),
  pinchStatus: document.querySelector("#pinchStatus"),
  pinchMeter: document.querySelector("#pinchMeter"),
  gestureHud: document.querySelector("#gestureHud"),
  gestureFeedback: document.querySelector("#gestureFeedback"),
  gestureFeedbackTitle: document.querySelector("#gestureFeedbackTitle"),
  gestureFeedbackDetail: document.querySelector("#gestureFeedbackDetail"),
  onboarding: document.querySelector("#onboarding"),
  onboardingStart: document.querySelector("#onboardingStart"),
  onboardingSkip: document.querySelector("#onboardingSkip"),
  onboardingClose: document.querySelector("#onboardingClose"),
  recordPill: document.querySelector("#recordPill"),
  recordToggle: document.querySelector("#recordToggle"),
  recordDownload: document.querySelector("#recordDownload"),
  recordShare: document.querySelector("#recordShare"),
  recordPreview: document.querySelector("#recordPreview"),
  recordMeta: document.querySelector("#recordMeta"),
  competitionPill: document.querySelector("#competitionPill"),
  playerName: document.querySelector("#playerName"),
  competitionTimer: document.querySelector("#competitionTimer"),
  competitionScore: document.querySelector("#competitionScore"),
  competitionStart: document.querySelector("#competitionStart"),
  stageCompetitionStart: document.querySelector("#stageCompetitionStart"),
  stageTimer: document.querySelector("#stageTimer"),
  competitionBreakdown: document.querySelector("#competitionBreakdown"),
  triesLeft: document.querySelector("#triesLeft"),
  bestScore: document.querySelector("#bestScore"),
  scoreFx: document.querySelector("#scoreFx"),
  gameCountdown: document.querySelector("#gameCountdown"),
  gameRulesModal: document.querySelector("#gameRulesModal"),
  gameRulesClose: document.querySelector("#gameRulesClose"),
  gameRulesGotIt: document.querySelector("#gameRulesGotIt"),
  modalPlayerName: document.querySelector("#modalPlayerName"),
  tryResultModal: document.querySelector("#tryResultModal"),
  tryResultClose: document.querySelector("#tryResultClose"),
  resultScore: document.querySelector("#resultScore"),
  resultDelta: document.querySelector("#resultDelta"),
  resultTries: document.querySelector("#resultTries"),
  resultBest: document.querySelector("#resultBest"),
  resultLeaderboard: document.querySelector("#resultLeaderboard"),
  resultNextTry: document.querySelector("#resultNextTry"),
  toast: document.querySelector("#toast"),
  leaderboard: document.querySelector("#leaderboard"),
  roomStatus: document.querySelector("#roomStatus"),
  copyRoomLink: document.querySelector("#copyRoomLink"),
  roomLinkText: document.querySelector("#roomLinkText"),
  paramCenter: document.querySelector("#paramCenter"),
  paramScale: document.querySelector("#paramScale"),
  paramOpacity: document.querySelector("#paramOpacity"),
  paramColor: document.querySelector("#paramColor")
};

const MAX_POINTS = 260000;
const state = {
  mode: "studio",
  roomId: "",
  roomSceneLoaded: false,
  points: null,
  original: null,
  tool: "move",
  selected: new Set(),
  pointer: { down: false, editing: false, lastX: 0, lastY: 0 },
  gesture: {
    active: false,
    preparing: false,
    ready: false,
    loading: false,
    cameraOn: false,
    lastVideoTime: -1,
    lastCanvasX: 0,
    lastCanvasY: 0,
    rotateActive: false,
    lastPalmX: 0,
    lastPalmY: 0,
    zoomActive: false,
    lastHandDistance: 0,
    fistActive: false,
    lastFistX: 0,
    lastFistY: 0,
    lastHammerAt: 0,
    framesWithoutHand: 0,
    landmarker: null,
    faceLandmarker: null
  },
  mask: "none",
  face: { x: 0.5, y: 0.58, size: 0.28, confidence: 0 },
  camera: { yaw: -0.48, pitch: 0.32, distance: 4.2, target: [0, 0, 0] },
  competition: {
    active: false,
    durationMs: 15000,
    startedAt: 0,
    raf: 0,
    score: 0,
    bestScore: 0,
    triesLeft: 3,
    touched: new Set(),
    cells: new Set(),
    tools: new Set(),
    pulses: 0,
    motion: 0,
    rhythm: 0,
    lastEditAt: 0,
    submitted: false
  },
  recording: {
    active: false,
    recorder: null,
    chunks: [],
    blob: null,
    url: "",
    startedAt: 0
  },
  brushRadius: Number(ui.brushRadius.value),
  strength: Number(ui.editStrength.value),
  activeWorld: [0, 0, 0],
  activeNdc: [0, 0],
  fpsFrames: 0,
  fpsTime: performance.now()
};

if (!gl) {
  ui.interactionState.textContent = "WebGL is unavailable in this browser.";
  throw new Error("WebGL unavailable");
}

const program = createProgram(gl, `
attribute vec3 aPosition;
attribute vec3 aColor;
attribute float aOpacity;
attribute float aScale;
attribute float aSelected;
uniform mat4 uViewProj;
uniform float uPixelRatio;
uniform float uBaseSize;
varying vec3 vColor;
varying float vOpacity;
varying float vSelected;
void main() {
  vec4 clip = uViewProj * vec4(aPosition, 1.0);
  gl_Position = clip;
  float depthFade = clamp(1.9 / max(0.7, clip.w), 0.35, 2.4);
  gl_PointSize = clamp((uBaseSize + aScale * 38.0) * depthFade * uPixelRatio, 1.2, 72.0);
  vColor = aColor;
  vOpacity = aOpacity;
  vSelected = aSelected;
}
`, `
precision mediump float;
varying vec3 vColor;
varying float vOpacity;
varying float vSelected;
void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float d = dot(uv, uv);
  if (d > 1.0) discard;
  float gaussian = exp(-d * 3.2);
  vec3 color = mix(vColor, vec3(0.38, 0.83, 1.0), vSelected * 0.55);
  gl_FragColor = vec4(color, gaussian * vOpacity);
}
`);

const buffers = {
  position: gl.createBuffer(),
  color: gl.createBuffer(),
  opacity: gl.createBuffer(),
  scale: gl.createBuffer(),
  selected: gl.createBuffer()
};

const attribs = {
  position: gl.getAttribLocation(program, "aPosition"),
  color: gl.getAttribLocation(program, "aColor"),
  opacity: gl.getAttribLocation(program, "aOpacity"),
  scale: gl.getAttribLocation(program, "aScale"),
  selected: gl.getAttribLocation(program, "aSelected")
};

const uniforms = {
  viewProj: gl.getUniformLocation(program, "uViewProj"),
  pixelRatio: gl.getUniformLocation(program, "uPixelRatio"),
  baseSize: gl.getUniformLocation(program, "uBaseSize")
};

initDemoScene();
bindUi();
initializeModeFromUrl();
requestAnimationFrame(render);

function bindUi() {
  ui.studioModeButton.addEventListener("click", enterStudioMode);
  ui.gameModeButton.addEventListener("click", () => enterGameMode());
  ui.copyRoomLink.addEventListener("click", copyInviteLink);

  ui.fileInput.addEventListener("change", event => {
    const file = event.target.files && event.target.files[0];
    if (file) loadFile(file);
  });

  ["dragenter", "dragover"].forEach(type => {
    ui.dropZone.addEventListener(type, event => {
      event.preventDefault();
      ui.dropZone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach(type => {
    ui.dropZone.addEventListener(type, event => {
      event.preventDefault();
      ui.dropZone.classList.remove("is-dragging");
    });
  });

  ui.dropZone.addEventListener("drop", event => {
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) loadFile(file);
  });

  document.querySelectorAll(".tool-button").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tool-button").forEach(item => item.classList.remove("is-active"));
      button.classList.add("is-active");
      state.tool = button.dataset.tool;
      ui.interactionState.textContent = `Tool: ${button.textContent.trim()}`;
    });
  });

  ui.brushRadius.addEventListener("input", () => {
    state.brushRadius = Number(ui.brushRadius.value);
  });

  ui.editStrength.addEventListener("input", () => {
    state.strength = Number(ui.editStrength.value);
  });

  ui.resetScene.addEventListener("click", () => {
    if (!state.original) return;
    state.points = clonePoints(state.original);
    state.selected.clear();
    updateStats();
    ui.interactionState.textContent = "Scene reset to imported state.";
  });

  ui.cameraToggle.addEventListener("click", startCameraMode);
  ui.cameraStop.addEventListener("click", stopCameraMode);
  ui.maskSelect.addEventListener("change", () => {
    state.mask = ui.maskSelect.value;
  });
  ui.onboardingStart.addEventListener("click", () => {
    hideOnboarding();
    startCameraMode();
  });
  ui.onboardingSkip.addEventListener("click", hideOnboarding);
  ui.onboardingClose.addEventListener("click", hideOnboarding);
  ui.gameRulesClose.addEventListener("click", hideGameRules);
  ui.gameRulesGotIt.addEventListener("click", handleGameRulesPrimary);
  ui.modalPlayerName.addEventListener("input", () => {
    ui.playerName.value = ui.modalPlayerName.value;
  });
  ui.playerName.addEventListener("input", () => {
    ui.modalPlayerName.value = ui.playerName.value;
  });
  ui.tryResultClose.addEventListener("click", hideTryResult);
  ui.resultNextTry.addEventListener("click", () => {
    hideTryResult();
    if (state.competition.triesLeft > 0) startCompetition();
  });
  ui.recordToggle.addEventListener("click", toggleRecording);
  ui.recordDownload.addEventListener("click", downloadRecording);
  ui.recordShare.addEventListener("click", shareRecording);
  ui.competitionStart.addEventListener("click", startCompetition);
  ui.stageCompetitionStart.addEventListener("click", startCompetition);

  canvas.addEventListener("pointerdown", event => {
    canvas.setPointerCapture(event.pointerId);
    state.pointer.down = true;
    state.pointer.editing = event.shiftKey;
    state.pointer.lastX = event.clientX;
    state.pointer.lastY = event.clientY;
    canvas.classList.toggle("is-editing", state.pointer.editing);
    updatePointerFromEvent(event);
    if (state.pointer.editing) applyGestureEdit(0, 0, true);
  });

  canvas.addEventListener("pointermove", event => {
    const dx = event.clientX - state.pointer.lastX;
    const dy = event.clientY - state.pointer.lastY;
    updatePointerFromEvent(event);

    if (state.pointer.down && state.pointer.editing) {
      applyGestureEdit(dx, dy, false);
    } else if (state.pointer.down) {
      state.camera.yaw += dx * 0.006;
      state.camera.pitch = clamp(state.camera.pitch + dy * 0.004, -1.15, 1.15);
    }

    state.pointer.lastX = event.clientX;
    state.pointer.lastY = event.clientY;
  });

  canvas.addEventListener("pointerup", event => {
    canvas.releasePointerCapture(event.pointerId);
    state.pointer.down = false;
    state.pointer.editing = false;
    canvas.classList.remove("is-editing");
    ui.reticle.classList.remove("is-visible");
  });

  canvas.addEventListener("wheel", event => {
    event.preventDefault();
    state.camera.distance = clamp(state.camera.distance * (1 + event.deltaY * 0.001), 0.8, 20);
  }, { passive: false });

  window.addEventListener("resize", resizeCanvas);
}

async function initializeModeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const room = params.get("room");
  if (params.get("mode") === "game" || room) {
    await enterGameMode(room);
  } else {
    enterStudioMode();
  }
}

function enterStudioMode() {
  state.mode = "studio";
  document.body.classList.add("studio-mode");
  document.body.classList.remove("game-mode");
  ui.studioModeButton.classList.add("is-active");
  ui.gameModeButton.classList.remove("is-active");
  ui.interactionState.textContent = "Studio mode. Import a scene or start gesture input.";
}

async function enterGameMode(roomId = "") {
  state.mode = "game";
  document.body.classList.add("game-mode");
  document.body.classList.remove("studio-mode");
  ui.studioModeButton.classList.remove("is-active");
  ui.gameModeButton.classList.add("is-active");

  if (roomId) {
    state.roomId = roomId;
  } else if (!state.roomId) {
    await createRoom();
  }

  updateRoomUi();
  updateTryUi();
  await loadRoomScene();
  await loadLeaderboard();
  ui.interactionState.textContent = "Game mode. Upload the shared scene, invite friends, then start your tries.";
  showGameRules();
}

async function createRoom() {
  const response = await fetch("/api/rooms", { method: "POST" });
  const payload = await response.json();
  state.roomId = payload.roomId;
  const url = new URL(window.location.href);
  url.searchParams.set("mode", "game");
  url.searchParams.set("room", state.roomId);
  window.history.replaceState({}, "", url);
}

function updateRoomUi() {
  if (!state.roomId) return;
  ui.roomStatus.textContent = state.roomSceneLoaded
    ? `Room ${state.roomId}: shared scene is ready.`
    : `Room ${state.roomId}: upload the scene everyone will pinch.`;
  ui.copyRoomLink.disabled = false;
  ui.gameRulesGotIt.textContent = state.roomSceneLoaded ? "Got it" : "Got it and import scene";
  ui.roomLinkText.textContent = location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "Same-machine link ready. For other computers, replace localhost with this computer's LAN IP."
    : inviteUrl();
  const canStart = state.roomSceneLoaded && state.competition.triesLeft > 0 && !state.competition.active && !state.competition.preparing;
  setCompetitionButtons(!canStart, canStart ? "Start try" : "Upload scene first");
}

async function copyInviteLink() {
  const name = normalizedPlayerName();
  if (!name) {
    showToast("Enter your nickname first, then copy the invite.");
    ui.playerName.focus();
    return;
  }
  const url = inviteUrl();
  const message = `${name} 邀请你一起来挑战 PinchGS：${url}`;
  try {
    await navigator.clipboard.writeText(message);
    ui.roomLinkText.textContent = "Invite link copied.";
    showToast("Invite link copied. Paste it to the friends you want to challenge.");
  } catch (error) {
    ui.roomLinkText.textContent = url;
    showToast("Copy failed. The invite link is shown in the room panel.");
  }
}

function inviteUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("mode", "game");
  url.searchParams.set("room", state.roomId);
  return url.toString();
}

async function uploadRoomScene(filename, buffer) {
  ui.roomStatus.textContent = "Uploading shared scene to the game room...";
  await fetch(`/api/rooms/${state.roomId}/scene`, {
    method: "POST",
    headers: { "X-Scene-Name": encodeURIComponent(filename) },
    body: buffer
  });
  state.roomSceneLoaded = true;
  updateRoomUi();
  updateTryUi();
}

async function loadRoomScene() {
  if (!state.roomId) return;
  try {
    const response = await fetch(`/api/rooms/${state.roomId}/scene`);
    if (!response.ok) {
      state.roomSceneLoaded = false;
      updateRoomUi();
      updateTryUi();
      return;
    }
    const filename = decodeURIComponent(response.headers.get("X-Scene-Name") || "scene.ply");
    const buffer = await response.arrayBuffer();
    loadSceneBuffer(buffer, filename, buffer.byteLength);
    state.roomSceneLoaded = true;
    updateRoomUi();
    updateTryUi();
  } catch (error) {
    state.roomSceneLoaded = false;
    updateRoomUi();
  }
}

async function loadFile(file) {
  ui.interactionState.textContent = `Reading ${file.name}...`;
  const buffer = await file.arrayBuffer();

  try {
    loadSceneBuffer(buffer, file.name, file.size);
    if (state.mode === "game" && state.roomId) {
      await uploadRoomScene(file.name, buffer);
    }
  } catch (error) {
    ui.interactionState.textContent = error.message;
    ui.fileMeta.textContent = `Import failed: ${error.message}`;
  }
}

function loadSceneBuffer(buffer, filename, size = buffer.byteLength) {
  const extension = filename.split(".").pop().toLowerCase();
  let parsed;

  if (extension === "ply") {
    parsed = parsePly(buffer);
  } else if (extension === "splat") {
    parsed = parseSplat(buffer);
  } else {
    throw new Error("KSPLAT needs its dedicated decoder. The import slot is ready.");
  }

  state.points = normalizePoints(parsed);
  state.original = clonePoints(state.points);
  state.selected.clear();
  updateStats();
  ui.fileStatusDot.classList.add("is-ready");
  ui.fileMeta.textContent = `${filename} | ${state.points.count.toLocaleString()} gaussians | ${(size / 1024 / 1024).toFixed(2)} MB`;
  ui.interactionState.textContent = "Import complete. Hold Shift and drag to simulate pinch editing.";
}

function initDemoScene() {
  const count = 9000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const opacities = new Float32Array(count);
  const scales = new Float32Array(count);
  const selected = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const t = i / count;
    const ring = Math.floor(t * 7);
    const angle = t * Math.PI * 34;
    const radius = 0.25 + ring * 0.15 + Math.sin(t * 28) * 0.06;
    const noise = (Math.random() - 0.5) * 0.18;
    positions[i * 3] = Math.cos(angle) * radius + noise;
    positions[i * 3 + 1] = Math.sin(t * Math.PI * 5) * 0.46 + (Math.random() - 0.5) * 0.12;
    positions[i * 3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.18;
    colors[i * 3] = 0.35 + 0.35 * Math.sin(t * 8);
    colors[i * 3 + 1] = 0.5 + 0.4 * Math.sin(t * 13 + 1.3);
    colors[i * 3 + 2] = 0.78 + 0.18 * Math.cos(t * 9);
    opacities[i] = 0.4 + Math.random() * 0.52;
    scales[i] = 0.03 + Math.random() * 0.07;
    selected[i] = 0;
  }

  state.points = { count, positions, colors, opacities, scales, selected };
  state.original = clonePoints(state.points);
  updateStats();
}

function parsePly(buffer) {
  const bytes = new Uint8Array(buffer);
  const marker = new TextEncoder().encode("end_header");
  let headerEnd = -1;

  for (let i = 0; i < Math.min(bytes.length - marker.length, 50000); i++) {
    let match = true;
    for (let j = 0; j < marker.length; j++) {
      if (bytes[i + j] !== marker[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      let end = i + marker.length;
      if (bytes[end] === 13) end++;
      if (bytes[end] === 10) end++;
      headerEnd = end;
      break;
    }
  }

  if (headerEnd < 0) throw new Error("PLY header was not found.");

  const header = new TextDecoder().decode(bytes.slice(0, headerEnd));
  const lines = header.split(/\r?\n/);
  const formatLine = lines.find(line => line.startsWith("format "));
  const vertexLine = lines.find(line => line.startsWith("element vertex "));
  if (!formatLine || !vertexLine) throw new Error("PLY format or vertex count is missing.");

  const format = formatLine.split(/\s+/)[1];
  const count = Math.min(Number(vertexLine.split(/\s+/)[2]), MAX_POINTS);
  const properties = [];
  let inVertex = false;

  for (const line of lines) {
    if (line.startsWith("element vertex")) {
      inVertex = true;
      continue;
    }
    if (line.startsWith("element ") && !line.startsWith("element vertex")) inVertex = false;
    if (inVertex && line.startsWith("property ")) {
      const parts = line.trim().split(/\s+/);
      properties.push({ type: parts[1], name: parts[2] });
    }
  }

  if (!properties.some(item => item.name === "x") || !properties.some(item => item.name === "y") || !properties.some(item => item.name === "z")) {
    throw new Error("PLY vertices need x, y, and z fields.");
  }

  if (format === "ascii") return parseAsciiPly(bytes, headerEnd, count, properties);
  if (format === "binary_little_endian") return parseBinaryPly(buffer, headerEnd, count, properties);
  throw new Error(`${format} PLY is not supported yet.`);
}

function parseAsciiPly(bytes, start, count, properties) {
  const body = new TextDecoder().decode(bytes.slice(start));
  const lines = body.trim().split(/\r?\n/);
  const result = emptyPoints(count);

  for (let i = 0; i < count; i++) {
    const values = lines[i].trim().split(/\s+/).map(Number);
    fillPointFromValues(i, values, properties, result);
  }

  return result;
}

function parseBinaryPly(buffer, start, count, properties) {
  const view = new DataView(buffer, start);
  const offsets = [];
  let stride = 0;

  for (const property of properties) {
    offsets.push(stride);
    stride += propertySize(property.type);
  }

  const result = emptyPoints(count);

  for (let i = 0; i < count; i++) {
    const base = i * stride;
    const values = properties.map((property, index) => readProperty(view, base + offsets[index], property.type));
    fillPointFromValues(i, values, properties, result);
  }

  return result;
}

function parseSplat(buffer) {
  const rowLength = 32;
  const count = Math.min(Math.floor(buffer.byteLength / rowLength), MAX_POINTS);
  if (count <= 0) throw new Error("SPLAT file is empty.");
  const view = new DataView(buffer);
  const result = emptyPoints(count);

  for (let i = 0; i < count; i++) {
    const base = i * rowLength;
    result.positions[i * 3] = view.getFloat32(base, true);
    result.positions[i * 3 + 1] = view.getFloat32(base + 4, true);
    result.positions[i * 3 + 2] = view.getFloat32(base + 8, true);
    result.scales[i] = Math.max(0.015, (view.getFloat32(base + 12, true) + view.getFloat32(base + 16, true) + view.getFloat32(base + 20, true)) / 3);
    result.colors[i * 3] = view.getUint8(base + 24) / 255;
    result.colors[i * 3 + 1] = view.getUint8(base + 25) / 255;
    result.colors[i * 3 + 2] = view.getUint8(base + 26) / 255;
    result.opacities[i] = view.getUint8(base + 27) / 255;
  }

  return result;
}

function emptyPoints(count) {
  return {
    count,
    positions: new Float32Array(count * 3),
    colors: new Float32Array(count * 3),
    opacities: new Float32Array(count),
    scales: new Float32Array(count),
    selected: new Float32Array(count)
  };
}

function fillPointFromValues(i, values, properties, result) {
  const field = name => {
    const index = properties.findIndex(item => item.name === name);
    return index >= 0 ? values[index] : undefined;
  };

  result.positions[i * 3] = field("x") || 0;
  result.positions[i * 3 + 1] = field("y") || 0;
  result.positions[i * 3 + 2] = field("z") || 0;

  const red = field("red");
  const green = field("green");
  const blue = field("blue");
  const fdc0 = field("f_dc_0");
  const fdc1 = field("f_dc_1");
  const fdc2 = field("f_dc_2");

  if (red !== undefined && green !== undefined && blue !== undefined) {
    result.colors[i * 3] = red > 1 ? red / 255 : red;
    result.colors[i * 3 + 1] = green > 1 ? green / 255 : green;
    result.colors[i * 3 + 2] = blue > 1 ? blue / 255 : blue;
  } else if (fdc0 !== undefined && fdc1 !== undefined && fdc2 !== undefined) {
    result.colors[i * 3] = clamp(0.5 + fdc0 * 0.7, 0, 1);
    result.colors[i * 3 + 1] = clamp(0.5 + fdc1 * 0.7, 0, 1);
    result.colors[i * 3 + 2] = clamp(0.5 + fdc2 * 0.7, 0, 1);
  } else {
    result.colors[i * 3] = 0.5;
    result.colors[i * 3 + 1] = 0.75;
    result.colors[i * 3 + 2] = 1;
  }

  const opacity = field("opacity");
  result.opacities[i] = opacity === undefined ? 0.82 : sigmoid(opacity);

  const s0 = field("scale_0");
  const s1 = field("scale_1");
  const s2 = field("scale_2");
  result.scales[i] = s0 !== undefined && s1 !== undefined && s2 !== undefined
    ? clamp((Math.exp(s0) + Math.exp(s1) + Math.exp(s2)) / 3, 0.005, 0.18)
    : 0.045;
}

function normalizePoints(points) {
  const { positions, count } = points;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 0.0001);
  const scale = 2.2 / span;

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (positions[i * 3] - cx) * scale;
    positions[i * 3 + 1] = (positions[i * 3 + 1] - cy) * scale;
    positions[i * 3 + 2] = (positions[i * 3 + 2] - cz) * scale;
    points.scales[i] = clamp(points.scales[i] * scale, 0.008, 0.2);
  }

  return points;
}

function render(now) {
  resizeCanvas();
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.047, 0.051, 0.063, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.DEPTH_TEST);

  gl.useProgram(program);
  bindAttributes();
  gl.uniformMatrix4fv(uniforms.viewProj, false, computeViewProjection());
  gl.uniform1f(uniforms.pixelRatio, window.devicePixelRatio || 1);
  gl.uniform1f(uniforms.baseSize, 8);
  gl.drawArrays(gl.POINTS, 0, state.points.count);

  state.fpsFrames++;
  if (now - state.fpsTime > 600) {
    ui.fpsCounter.textContent = Math.round((state.fpsFrames * 1000) / (now - state.fpsTime));
    state.fpsFrames = 0;
    state.fpsTime = now;
  }

  requestAnimationFrame(render);
}

function bindAttributes() {
  uploadArray(buffers.position, state.points.positions, attribs.position, 3);
  uploadArray(buffers.color, state.points.colors, attribs.color, 3);
  uploadArray(buffers.opacity, state.points.opacities, attribs.opacity, 1);
  uploadArray(buffers.scale, state.points.scales, attribs.scale, 1);
  uploadArray(buffers.selected, state.points.selected, attribs.selected, 1);
}

function uploadArray(buffer, data, attribute, size) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(attribute);
  gl.vertexAttribPointer(attribute, size, gl.FLOAT, false, 0, 0);
}

function updatePointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  state.activeNdc = [x * 2 - 1, 1 - y * 2];
  state.activeWorld = screenToWorldOnPlane(state.activeNdc[0], state.activeNdc[1]);
  ui.reticle.style.left = `${event.clientX - rect.left}px`;
  ui.reticle.style.top = `${event.clientY - rect.top}px`;
  if (event.shiftKey || state.pointer.editing) ui.reticle.classList.add("is-visible");
}

function applyGestureEdit(dx, dy, freshSelection) {
  const p = state.points;
  const radius = state.brushRadius;
  const radius2 = radius * radius;
  let center = state.activeWorld;
  let selected = 0;
  let sumX = 0, sumY = 0, sumZ = 0, sumScale = 0, sumOpacity = 0;

  if (freshSelection) {
    center = selectGaussianCluster(center, radius);
    state.activeWorld = center;
  }

  const dragWorld = [dx * 0.004 * state.strength, -dy * 0.004 * state.strength, 0];

  for (const i of state.selected) {
    const px = p.positions[i * 3];
    const py = p.positions[i * 3 + 1];
    const pz = p.positions[i * 3 + 2];
    const d2 = distanceSq(px, py, pz, center[0], center[1], center[2]);
    const weight = Math.exp(-d2 / Math.max(0.001, radius2));

    if (state.tool === "move") {
      p.positions[i * 3] += dragWorld[0] * weight;
      p.positions[i * 3 + 1] += dragWorld[1] * weight;
    } else if (state.tool === "deform") {
      p.positions[i * 3] += (px - center[0]) * 0.018 * state.strength * weight;
      p.positions[i * 3 + 1] += (py - center[1]) * 0.018 * state.strength * weight;
      p.scales[i] = clamp(p.scales[i] * (1 + 0.015 * state.strength * weight), 0.004, 0.35);
    } else if (state.tool === "erase") {
      p.opacities[i] = clamp(p.opacities[i] - 0.035 * state.strength * weight, 0.02, 1);
    } else if (state.tool === "paint") {
      p.colors[i * 3] = mix(p.colors[i * 3], 1, 0.06 * weight);
      p.colors[i * 3 + 1] = mix(p.colors[i * 3 + 1], 0.82, 0.06 * weight);
      p.colors[i * 3 + 2] = mix(p.colors[i * 3 + 2], 0.32, 0.06 * weight);
    }

    p.selected[i] = 1;
    selected++;
    sumX += p.positions[i * 3];
    sumY += p.positions[i * 3 + 1];
    sumZ += p.positions[i * 3 + 2];
    sumScale += p.scales[i];
    sumOpacity += p.opacities[i];
  }

  for (let i = 0; i < p.count; i++) {
    if (!state.selected.has(i)) p.selected[i] = 0;
  }

  ui.selectedCount.textContent = selected.toLocaleString();
  if (selected > 0) {
    ui.paramCenter.textContent = `${(sumX / selected).toFixed(2)}, ${(sumY / selected).toFixed(2)}, ${(sumZ / selected).toFixed(2)}`;
    ui.paramScale.textContent = (sumScale / selected).toFixed(3);
    ui.paramOpacity.textContent = (sumOpacity / selected).toFixed(3);
    ui.paramColor.textContent = state.tool;
  }
  ui.interactionState.textContent = selected > 0
    ? `Pinch ${state.tool}: ${selected.toLocaleString()} Gaussians affected`
    : "No Gaussians selected. Increase radius or move closer to the object.";
  updateCompetitionFromEdit({ selected, center, dx, dy, freshSelection });
  if (state.gesture.active && selected > 0) {
    setGestureFeedback("Editing Gaussians", `${selected.toLocaleString()} Gaussians affected by ${state.tool}.`, "pinch");
  }
}

function selectGaussianCluster(center, radius) {
  const p = state.points;
  const radius2 = radius * radius;
  state.selected.clear();

  for (let i = 0; i < p.count; i++) {
    const px = p.positions[i * 3];
    const py = p.positions[i * 3 + 1];
    const pz = p.positions[i * 3 + 2];
    if (distanceSq(px, py, pz, center[0], center[1], center[2]) < radius2) {
      state.selected.add(i);
    }
  }

  if (state.selected.size > 0) return center;

  let nearest = 0;
  let nearestD2 = Infinity;
  for (let i = 0; i < p.count; i++) {
    const d2 = distanceSq(
      p.positions[i * 3],
      p.positions[i * 3 + 1],
      p.positions[i * 3 + 2],
      center[0],
      center[1],
      center[2]
    );
    if (d2 < nearestD2) {
      nearestD2 = d2;
      nearest = i;
    }
  }

  const snapped = [
    p.positions[nearest * 3],
    p.positions[nearest * 3 + 1],
    p.positions[nearest * 3 + 2]
  ];
  const snapRadius2 = Math.max(radius * radius * 0.72, 0.035);
  for (let i = 0; i < p.count; i++) {
    const px = p.positions[i * 3];
    const py = p.positions[i * 3 + 1];
    const pz = p.positions[i * 3 + 2];
    if (distanceSq(px, py, pz, snapped[0], snapped[1], snapped[2]) < snapRadius2) {
      state.selected.add(i);
    }
  }

  return snapped;
}

async function startCompetition() {
  if (state.competition.active || state.competition.preparing) return;
  if (state.mode !== "game") return;
  if (!state.roomSceneLoaded) {
    setGestureFeedback("Upload scene first", "Game mode starts after the shared 3DGS scene is uploaded.", "");
    return;
  }
  const name = normalizedPlayerName();
  if (!name) {
    showToast("Enter your nickname before starting the challenge.");
    ui.playerName.focus();
    return;
  }
  if (state.competition.triesLeft <= 0) {
    setGestureFeedback("No tries left", "Your best score is already on the leaderboard.", "");
    return;
  }
  hideGameRules();
  hideTryResult();

  if (state.original) {
    state.points = clonePoints(state.original);
    state.selected.clear();
    updateStats();
  }

  state.competition.preparing = true;
  state.competition.score = 0;
  state.competition.touched = new Set();
  state.competition.cells = new Set();
  state.competition.tools = new Set();
  state.competition.pulses = 0;
  state.competition.motion = 0;
  state.competition.rhythm = 0;
  state.competition.lastEditAt = 0;
  state.competition.submitted = false;

  ui.competitionPill.textContent = "Ready";
  setCompetitionButtons(true, "Get ready...");
  ui.competitionScore.textContent = "0";
  ui.competitionTimer.textContent = "15.0";
  ui.stageTimer.textContent = "15.0";
  ui.competitionBreakdown.textContent = "Coverage 0 · Variety 0 · Rhythm 0";
  setGestureFeedback("Get ready", "Challenge starts after 3, 2, 1.", "pinch");
  await runPreStartCountdown();
  state.competition.preparing = false;
  state.competition.active = true;
  state.competition.startedAt = performance.now();
  ui.competitionPill.textContent = "Live";
  setCompetitionButtons(true, "Challenge running...");
  setGestureFeedback("Go!", "You have 15 seconds. Be weird, fast, and expressive.", "pinch");
  tickCompetition();
}

async function runPreStartCountdown() {
  ui.gameCountdown.classList.add("is-visible");
  for (const label of ["3", "2", "1", "START"]) {
    ui.gameCountdown.textContent = label;
    await sleep(label === "START" ? 520 : 760);
  }
  ui.gameCountdown.classList.remove("is-visible");
}

function sleep(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function setCompetitionButtons(disabled, text) {
  ui.competitionStart.disabled = disabled;
  ui.stageCompetitionStart.disabled = disabled;
  ui.competitionStart.textContent = text;
  ui.stageCompetitionStart.textContent = text;
}

function normalizedPlayerName() {
  const name = (ui.playerName.value || ui.modalPlayerName.value || "").trim();
  if (name) {
    ui.playerName.value = name;
    ui.modalPlayerName.value = name;
  }
  return name;
}

function tickCompetition() {
  if (!state.competition.active) return;
  const elapsed = performance.now() - state.competition.startedAt;
  const remaining = Math.max(0, state.competition.durationMs - elapsed);
  ui.competitionTimer.textContent = (remaining / 1000).toFixed(1);
  ui.stageTimer.textContent = (remaining / 1000).toFixed(1);

  if (remaining <= 0) {
    finishCompetition();
    return;
  }

  state.competition.raf = requestAnimationFrame(tickCompetition);
}

function updateCompetitionFromEdit({ selected, center, dx, dy, freshSelection, action = state.tool }) {
  if (!state.competition.active || selected <= 0) return;

  const now = performance.now();
  const c = state.competition;
  c.tools.add(action);
  c.motion += Math.hypot(dx, dy) * Math.min(1, selected / 400);
  if (freshSelection) c.pulses += 1;
  if (c.lastEditAt && now - c.lastEditAt < 420) c.rhythm += 1;
  c.lastEditAt = now;

  let sampled = 0;
  for (const index of state.selected) {
    c.touched.add(index);
    if (sampled < 80) {
      const px = state.points.positions[index * 3];
      const py = state.points.positions[index * 3 + 1];
      const pz = state.points.positions[index * 3 + 2];
      c.cells.add(`${Math.round(px * 5)}:${Math.round(py * 5)}:${Math.round(pz * 5)}`);
      sampled++;
    }
  }

  const coverage = Math.min(420, c.cells.size * 4 + Math.sqrt(c.touched.size) * 3);
  const variety = c.tools.size * 70 + Math.min(160, c.pulses * 12);
  const rhythm = Math.min(260, c.rhythm * 10 + c.motion * 0.12);
  const spatialPlay = Math.min(180, Math.hypot(center[0], center[1], center[2]) * 55);
  c.score = Math.round(coverage + variety + rhythm + spatialPlay);

  ui.competitionScore.textContent = c.score.toLocaleString();
  ui.competitionBreakdown.textContent = `Coverage ${Math.round(coverage)} · Variety ${Math.round(variety)} · Rhythm ${Math.round(rhythm)}`;
}

async function finishCompetition() {
  const c = state.competition;
  c.active = false;
  cancelAnimationFrame(c.raf);
  c.triesLeft = Math.max(0, c.triesLeft - 1);
  ui.competitionTimer.textContent = "0.0";
  ui.gameCountdown.classList.remove("is-visible");
  ui.competitionPill.textContent = "Done";
  setCompetitionButtons(c.triesLeft <= 0, c.triesLeft > 0 ? "Start next try" : "No tries left");

  const previousBest = c.bestScore;
  const delta = c.score - previousBest;
  let scores = [];
  if (c.score > c.bestScore) {
    c.bestScore = c.score;
    showScoreFx(`+${delta.toLocaleString()}`, "up");
    updateTryUi();
    setGestureFeedback("New best score", `${c.bestScore.toLocaleString()} creativity points. Ranking updated.`, "hand");
    scores = await submitScore();
  } else {
    showScoreFx(`-${Math.abs(delta).toLocaleString()}`, "down");
    updateTryUi();
    setGestureFeedback("Try ended", `${c.score.toLocaleString()} did not beat your best ${c.bestScore.toLocaleString()}.`, "");
    scores = await loadLeaderboard();
  }
  showTryResult(delta, scores);
}

function updateTryUi() {
  ui.triesLeft.textContent = `${state.competition.triesLeft} ${state.competition.triesLeft === 1 ? "try" : "tries"} left`;
  ui.bestScore.textContent = `Best ${state.competition.bestScore.toLocaleString()}`;
  ui.competitionPill.textContent = state.competition.triesLeft > 0 ? `${state.competition.triesLeft} tries` : "Done";
  const canStart = state.mode === "game" && state.roomSceneLoaded && state.competition.triesLeft > 0 && !state.competition.active && !state.competition.preparing;
  setCompetitionButtons(!canStart, canStart ? "Start try" : state.competition.triesLeft > 0 ? "Upload scene first" : "No tries left");
}

function showTryResult(delta, scores) {
  ui.resultScore.textContent = state.competition.score.toLocaleString();
  ui.resultDelta.textContent = delta > 0
    ? `New best +${delta.toLocaleString()}`
    : `Below best by ${Math.abs(delta).toLocaleString()}`;
  ui.resultTries.textContent = `${state.competition.triesLeft} ${state.competition.triesLeft === 1 ? "try" : "tries"} left`;
  ui.resultBest.textContent = `Best ${state.competition.bestScore.toLocaleString()}`;
  ui.resultNextTry.disabled = state.competition.triesLeft <= 0;
  ui.resultNextTry.textContent = state.competition.triesLeft > 0 ? "Next try" : "All tries used";
  ui.resultLeaderboard.innerHTML = leaderboardMarkup(scores);
  ui.tryResultModal.classList.add("is-visible");
}

function hideTryResult() {
  ui.tryResultModal.classList.remove("is-visible");
}

function showScoreFx(text, direction) {
  ui.scoreFx.textContent = text;
  ui.scoreFx.classList.remove("is-up", "is-down", "is-visible");
  ui.scoreFx.classList.add(direction === "up" ? "is-up" : "is-down", "is-visible");
  window.setTimeout(() => ui.scoreFx.classList.remove("is-visible"), 1200);
}

async function submitScore() {
  const name = ui.playerName.value.trim() || "Anonymous";
  try {
    const response = await fetch(`/api/scores?room=${encodeURIComponent(state.roomId || "default")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        score: state.competition.bestScore,
        coverage: state.competition.cells.size,
        variety: state.competition.tools.size,
        rhythm: state.competition.rhythm
      })
    });
    const payload = await response.json();
    renderLeaderboard(payload.scores || []);
    setGestureFeedback("Score submitted", `${name}: ${state.competition.bestScore.toLocaleString()} creativity points.`, "hand");
    return payload.scores || [];
  } catch (error) {
    setGestureFeedback("Score saved locally", "Leaderboard server is not reachable right now.", "");
    return [];
  }
}

async function loadLeaderboard() {
  try {
    const response = await fetch(`/api/scores?room=${encodeURIComponent(state.roomId || "default")}`);
    const payload = await response.json();
    renderLeaderboard(payload.scores || []);
    return payload.scores || [];
  } catch (error) {
    ui.leaderboard.innerHTML = `<li><span>-</span><strong>No ranking yet</strong><em>0</em></li>`;
    return [];
  }
}

function renderLeaderboard(scores) {
  ui.leaderboard.innerHTML = leaderboardMarkup(scores);
}

function leaderboardMarkup(scores) {
  if (!scores.length) {
    return `<li><span>-</span><strong>No scores yet</strong><em>0</em></li>`;
  }
  return scores.map((entry, index) => `
    <li>
      <span>#${index + 1}</span>
      <strong>${escapeHtml(entry.name)}</strong>
      <em>${Math.round(entry.score).toLocaleString()}</em>
    </li>
  `).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

async function startCameraMode() {
  if (state.gesture.cameraOn || state.gesture.loading) return;

  try {
    ui.cameraToggle.textContent = "Starting...";
    ui.cameraToggle.disabled = true;
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
    ui.cameraPreview.srcObject = stream;
    await ui.cameraPreview.play();
    state.gesture.cameraOn = true;
    ui.cameraEmpty.classList.add("is-hidden");
    ui.cameraToggle.textContent = "Loading gesture + face tracking...";
    ui.cameraToggle.disabled = true;
    ui.cameraStop.disabled = false;
    ui.gesturePill.textContent = "Camera";
    ui.interactionState.textContent = "Camera enabled. Loading MediaPipe gesture and face tracking...";
    setGestureFeedback("Camera is on", "Loading gesture and face tracking models...", "hand");
    await setupHandLandmarker();
    if (!state.gesture.cameraOn) return;
    ui.cameraToggle.textContent = "Camera on";
    ui.cameraToggle.disabled = true;
    ui.gesturePill.textContent = "Pinch ready";
    ui.interactionState.textContent = "Pinch thumb and index finger to edit the selected Gaussian cluster.";
    setGestureFeedback("Show one hand", "Pinch thumb and index finger to start editing.", "hand");
    requestAnimationFrame(trackHands);
  } catch (error) {
    state.gesture.loading = false;
    state.gesture.ready = Boolean(state.gesture.landmarker);
    stopCameraMode();
    ui.cameraToggle.textContent = "Start camera";
    ui.cameraToggle.disabled = false;
    ui.gesturePill.textContent = "Simulator";
    ui.interactionState.textContent = "Camera or hand tracking failed. Simulator mode is still available.";
    setGestureFeedback("Camera unavailable", "Use Shift-drag to simulate pinch editing.", "");
  }
}

function stopCameraMode() {
  const stream = ui.cameraPreview.srcObject;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  ui.cameraPreview.srcObject = null;
  state.gesture.cameraOn = false;
  state.gesture.active = false;
  state.gesture.fistActive = false;
  resetTransformGestures();
  state.gesture.lastVideoTime = -1;
  state.face.confidence = 0;
  clearHandOverlay();
  ui.cameraEmpty.classList.remove("is-hidden");
  ui.cameraToggle.textContent = "Start camera";
  ui.cameraToggle.disabled = false;
  ui.cameraStop.disabled = true;
  ui.gesturePill.textContent = "Simulator";
  ui.handStatus.textContent = "Hand not tracked";
  ui.pinchStatus.textContent = "Open hand";
  ui.pinchMeter.style.width = "0%";
  ui.gestureHud.classList.remove("is-active");
  ui.reticle.classList.remove("is-visible");
  ui.interactionState.textContent = "Camera stopped. Shift-drag still works as simulator mode.";
  setGestureFeedback("Camera off", "Start camera to use real hand gestures.", "");
}

function toggleRecording() {
  if (state.recording.active) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  if (!canvas.captureStream || typeof MediaRecorder === "undefined") {
    ui.recordMeta.textContent = "This browser cannot record the canvas. Try Chrome or Edge.";
    return;
  }

  if (state.recording.url) {
    URL.revokeObjectURL(state.recording.url);
  }

  const stream = canvas.captureStream(30);
  const mimeType = chooseRecordingMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  state.recording.active = true;
  state.recording.recorder = recorder;
  state.recording.chunks = [];
  state.recording.blob = null;
  state.recording.url = "";
  state.recording.startedAt = Date.now();

  ui.recordPill.textContent = "Recording";
  ui.recordToggle.textContent = "Stop recording";
  ui.recordToggle.classList.add("is-recording");
  ui.recordDownload.disabled = true;
  ui.recordShare.disabled = true;
  ui.recordPreview.classList.remove("is-visible");
  ui.recordPreview.removeAttribute("src");
  ui.recordMeta.textContent = "Recording the 3D canvas now...";

  recorder.addEventListener("dataavailable", event => {
    if (event.data && event.data.size > 0) {
      state.recording.chunks.push(event.data);
    }
  });

  recorder.addEventListener("stop", finalizeRecording);
  recorder.start(250);
}

function stopRecording() {
  const recorder = state.recording.recorder;
  if (recorder && recorder.state !== "inactive") {
    recorder.stop();
  }
}

function finalizeRecording() {
  const duration = Math.max(0.1, (Date.now() - state.recording.startedAt) / 1000);
  const mimeType = state.recording.chunks[0]?.type || "video/webm";
  const blob = new Blob(state.recording.chunks, { type: mimeType });
  const url = URL.createObjectURL(blob);

  state.recording.active = false;
  state.recording.blob = blob;
  state.recording.url = url;

  ui.recordPill.textContent = "Recorded";
  ui.recordToggle.textContent = "Record again";
  ui.recordToggle.classList.remove("is-recording");
  ui.recordDownload.disabled = false;
  ui.recordShare.disabled = !canShareRecording(blob);
  ui.recordPreview.src = url;
  ui.recordPreview.classList.add("is-visible");
  ui.recordMeta.textContent = `${duration.toFixed(1)}s WebM video ready. Download or share it.`;
}

function downloadRecording() {
  if (!state.recording.blob || !state.recording.url) return;
  const anchor = document.createElement("a");
  anchor.href = state.recording.url;
  anchor.download = `pinchgs-demo-${timestampForFile()}.webm`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

async function shareRecording() {
  if (!state.recording.blob) return;
  const file = new File([state.recording.blob], `pinchgs-demo-${timestampForFile()}.webm`, {
    type: state.recording.blob.type || "video/webm"
  });

  if (!navigator.canShare || !navigator.canShare({ files: [file] }) || !navigator.share) {
    ui.recordMeta.textContent = "Direct share is unavailable here. Use Download and send the video file.";
    return;
  }

  try {
    await navigator.share({
      files: [file],
      title: "PinchGS demo",
      text: "Gesture-edited 3D Gaussian scene demo."
    });
    ui.recordMeta.textContent = "Shared. The video is still available below.";
  } catch (error) {
    ui.recordMeta.textContent = "Share was cancelled. You can still download the video.";
  }
}

function chooseRecordingMimeType() {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm"
  ];
  return candidates.find(type => MediaRecorder.isTypeSupported(type)) || "";
}

function canShareRecording(blob) {
  if (!navigator.canShare || !navigator.share || typeof File === "undefined") return false;
  const file = new File([blob], "pinchgs-demo.webm", { type: blob.type || "video/webm" });
  return navigator.canShare({ files: [file] });
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

async function setupHandLandmarker() {
  if (state.gesture.landmarker || state.gesture.loading) return;
  state.gesture.loading = true;
  const { FilesetResolver, HandLandmarker, FaceLandmarker } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs");
  const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm");
  const handOptions = delegate => ({
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate
    },
    runningMode: "VIDEO",
    numHands: 2,
    minHandDetectionConfidence: 0.45,
    minHandPresenceConfidence: 0.45,
    minTrackingConfidence: 0.45
  });
  const faceOptions = delegate => ({
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
      delegate
    },
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  try {
    state.gesture.landmarker = await HandLandmarker.createFromOptions(vision, handOptions("GPU"));
  } catch (error) {
    state.gesture.landmarker = await HandLandmarker.createFromOptions(vision, handOptions("CPU"));
  }
  try {
    state.gesture.faceLandmarker = await FaceLandmarker.createFromOptions(vision, faceOptions("GPU"));
  } catch (error) {
    try {
      state.gesture.faceLandmarker = await FaceLandmarker.createFromOptions(vision, faceOptions("CPU"));
    } catch {
      state.gesture.faceLandmarker = null;
    }
  }
  state.gesture.ready = true;
  state.gesture.loading = false;
}

function trackHands() {
  if (!state.gesture.ready || !ui.cameraPreview.srcObject || !state.gesture.cameraOn) return;

  if (ui.cameraPreview.currentTime !== state.gesture.lastVideoTime) {
    state.gesture.lastVideoTime = ui.cameraPreview.currentTime;
    try {
      const timestamp = performance.now();
      if (state.gesture.faceLandmarker) {
        const faceResults = state.gesture.faceLandmarker.detectForVideo(ui.cameraPreview, timestamp);
        updateFaceFromResults(faceResults);
      }
      const results = state.gesture.landmarker.detectForVideo(ui.cameraPreview, timestamp);
      handleHandResults(results);
    } catch (error) {
      ui.handStatus.textContent = "Tracking error";
      ui.pinchStatus.textContent = "Check console";
      setGestureFeedback("Tracking paused", error.message || "Hand tracking failed on this frame.", "");
    }
  }

  requestAnimationFrame(trackHands);
}

function handleHandResults(results) {
  const hands = getHandLandmarks(results);
  const hand = hands[0] || null;
  drawHandOverlay(hands);

  if (!hand) {
    state.gesture.framesWithoutHand++;
    ui.handStatus.textContent = "Hand not tracked";
    ui.pinchStatus.textContent = "Open hand";
    ui.pinchMeter.style.width = "0%";
    ui.gestureHud.classList.remove("is-active");
    const detail = state.gesture.framesWithoutHand > 30
      ? "Model is running, but no hand landmarks are returned yet."
      : "Place one hand inside the camera preview.";
    setGestureFeedback("Looking for hand", detail, "");
    endGesture("Show one hand to the camera.");
    return;
  }
  state.gesture.framesWithoutHand = 0;

  const thumbTip = hand[4];
  const indexTip = hand[8];
  const wrist = hand[0];
  const indexMcp = hand[5];
  if (!thumbTip || !indexTip || !wrist || !indexMcp) {
    resetTransformGestures();
    setGestureFeedback("Hand visible", "Waiting for complete hand landmarks.", "hand");
    return;
  }
  const pinchDistance = landmarkDistance(thumbTip, indexTip);
  const palmSize = Math.max(landmarkDistance(wrist, indexMcp), 0.04);
  const pinchRatio = pinchDistance / palmSize;
  const midpoint = {
    x: (thumbTip.x + indexTip.x) * 0.5,
    y: (thumbTip.y + indexTip.y) * 0.5
  };
  const pinchAmount = clamp((0.82 - pinchRatio) / 0.46, 0, 1);
  ui.handStatus.textContent = "Hand visible";
  ui.pinchStatus.textContent = state.gesture.active ? "Pinching" : "Open hand";
  ui.pinchMeter.style.width = `${Math.round(pinchAmount * 100)}%`;
  ui.gestureHud.classList.toggle("is-active", state.gesture.active);

  const fistDetected = isFist(hand);
  if (!state.gesture.active && fistDetected) {
    handleFistHammer(hand);
    return;
  }
  state.gesture.fistActive = false;

  if (!state.gesture.active && hands.length >= 2) {
    handleTwoHandZoom(hands);
    return;
  }

  if (!state.gesture.active && pinchRatio < 0.58) {
    beginCameraPinch(midpoint);
  } else if (state.gesture.active && pinchRatio < 0.78) {
    updateCameraPinch(midpoint);
  } else if (state.gesture.active) {
    endGesture("Pinch released.");
  } else if (pinchRatio > 0.95) {
    handleOpenPalmRotate(hand);
  } else {
    resetTransformGestures();
    ui.interactionState.textContent = `Hand visible. Pinch meter ${Math.round(pinchAmount * 100)}%.`;
    setGestureFeedback("Hand visible", "Pinch to edit, make a fist to hammer, or use two hands to zoom.", "hand");
  }
}

function getHandLandmarks(results) {
  const landmarks = results.landmarks || results.handLandmarks || [];
  return landmarks;
}

function isFist(hand) {
  if (!hand || !hand[0] || !hand[5] || !hand[8] || !hand[9] || !hand[12] || !hand[13] || !hand[16] || !hand[17] || !hand[20]) {
    return false;
  }
  const wrist = hand[0];
  const folded = [
    [8, 5],
    [12, 9],
    [16, 13],
    [20, 17]
  ].filter(([tipIndex, mcpIndex]) => {
    const tipDistance = landmarkDistance(hand[tipIndex], wrist);
    const mcpDistance = landmarkDistance(hand[mcpIndex], wrist);
    return tipDistance < mcpDistance * 1.18 || hand[tipIndex].y > hand[mcpIndex].y + 0.015;
  }).length;
  const knuckleSpan = landmarkDistance(hand[5], hand[17]);
  const compact = knuckleSpan < Math.max(landmarkDistance(hand[0], hand[9]) * 1.45, 0.16);
  return folded >= 3 && compact;
}

function beginCameraPinch(midpoint) {
  const point = cameraLandmarkToCanvas(midpoint);
  resetTransformGestures();
  state.gesture.active = true;
  state.gesture.lastCanvasX = point.x;
  state.gesture.lastCanvasY = point.y;
  setGestureWorldPoint(point.x, point.y);
  applyGestureEdit(0, 0, true);
  ui.pinchStatus.textContent = "Pinching";
  ui.gestureHud.classList.add("is-active");
  setGestureFeedback("Pinch locked", "Move your hand to edit the selected Gaussians.", "pinch");
}

function updateCameraPinch(midpoint) {
  const point = cameraLandmarkToCanvas(midpoint);
  const dx = (point.x - state.gesture.lastCanvasX) * 1.9;
  const dy = (point.y - state.gesture.lastCanvasY) * 1.9;
  state.gesture.lastCanvasX = point.x;
  state.gesture.lastCanvasY = point.y;
  setGestureWorldPoint(point.x, point.y);
  applyGestureEdit(dx, dy, false);
}

function handleOpenPalmRotate(hand) {
  const palm = palmCenter(hand);
  if (!palm) return;
  if (!state.gesture.rotateActive) {
    state.gesture.rotateActive = true;
    state.gesture.lastPalmX = palm.x;
    state.gesture.lastPalmY = palm.y;
    setGestureFeedback("Rotate mode", "Move your open palm to rotate the scene.", "hand");
    return;
  }

  const dx = palm.x - state.gesture.lastPalmX;
  const dy = palm.y - state.gesture.lastPalmY;
  state.gesture.lastPalmX = palm.x;
  state.gesture.lastPalmY = palm.y;
  state.camera.yaw += dx * 3.4;
  state.camera.pitch = clamp(state.camera.pitch + dy * 2.2, -1.15, 1.15);
  ui.pinchStatus.textContent = "Rotating";
  ui.interactionState.textContent = "Open palm rotate: move your hand to orbit the scene.";
  setGestureFeedback("Rotating scene", "Pinch to edit, or use two hands to zoom.", "hand");
}

function handleTwoHandZoom(hands) {
  const a = palmCenter(hands[0]);
  const b = palmCenter(hands[1]);
  if (!a || !b) return;
  const distance = Math.hypot(a.x - b.x, a.y - b.y);

  if (!state.gesture.zoomActive) {
    state.gesture.zoomActive = true;
    state.gesture.lastHandDistance = distance;
    setGestureFeedback("Zoom mode", "Move both hands apart or together.", "hand");
    return;
  }

  const delta = distance - state.gesture.lastHandDistance;
  state.gesture.lastHandDistance = distance;
  state.camera.distance = clamp(state.camera.distance * (1 - delta * 1.8), 0.8, 20);
  ui.pinchStatus.textContent = "Zooming";
  ui.interactionState.textContent = "Two-hand zoom: move hands apart to zoom in, together to zoom out.";
  setGestureFeedback("Zooming scene", "Move hands apart to zoom in; together to zoom out.", "hand");
}

function handleFistHammer(hand) {
  const palm = palmCenter(hand);
  if (!palm) return;
  resetTransformGestures();
  const now = performance.now();

  if (!state.gesture.fistActive) {
    state.gesture.fistActive = true;
    state.gesture.lastFistX = palm.x;
    state.gesture.lastFistY = palm.y;
    ui.pinchStatus.textContent = "Fist ready";
    setGestureFeedback("Fist hammer ready", "Punch downward to smash the Gaussian cluster.", "hand");
    return;
  }

  const dx = palm.x - state.gesture.lastFistX;
  const dy = palm.y - state.gesture.lastFistY;
  state.gesture.lastFistX = palm.x;
  state.gesture.lastFistY = palm.y;

  if (dy > 0.035 && now - state.gesture.lastHammerAt > 650) {
    state.gesture.lastHammerAt = now;
    const point = cameraLandmarkToCanvas(palm);
    setGestureWorldPoint(point.x, point.y);
    applyHammerSmash(dx, dy);
  } else {
    ui.interactionState.textContent = "Fist detected. Move downward quickly to hammer.";
  }
}

function applyHammerSmash(dx, dy) {
  const p = state.points;
  const center = selectGaussianCluster(state.activeWorld, state.brushRadius * 1.45);
  state.activeWorld = center;
  let selected = 0;
  const radius2 = Math.max(0.001, state.brushRadius * state.brushRadius * 2.1);

  for (const i of state.selected) {
    const px = p.positions[i * 3];
    const py = p.positions[i * 3 + 1];
    const pz = p.positions[i * 3 + 2];
    const weight = Math.exp(-distanceSq(px, py, pz, center[0], center[1], center[2]) / radius2);
    p.positions[i * 3] += (px - center[0]) * 0.05 * weight;
    p.positions[i * 3 + 1] -= 0.11 * weight;
    p.positions[i * 3 + 2] += (Math.random() - 0.5) * 0.06 * weight;
    p.scales[i] = clamp(p.scales[i] * (0.9 - 0.16 * weight), 0.003, 0.35);
    p.opacities[i] = clamp(p.opacities[i] - 0.08 * weight, 0.02, 1);
    p.selected[i] = 1;
    selected++;
  }

  ui.selectedCount.textContent = selected.toLocaleString();
  ui.pinchStatus.textContent = "Hammer";
  ui.interactionState.textContent = `Hammer smash: ${selected.toLocaleString()} Gaussians crushed`;
  setGestureFeedback("Hammer smash", `${selected.toLocaleString()} Gaussians crushed.`, "pinch");
  showScoreFx("SMASH", "up");
  updateCompetitionFromEdit({ selected, center, dx: dx * 400, dy: dy * 520, freshSelection: true, action: "hammer" });
}

function endGesture(message) {
  state.gesture.active = false;
  resetTransformGestures();
  state.gesture.fistActive = false;
  ui.gestureHud.classList.remove("is-active");
  ui.reticle.classList.remove("is-visible");
  if (message) ui.interactionState.textContent = message;
}

function resetTransformGestures() {
  state.gesture.rotateActive = false;
  state.gesture.zoomActive = false;
}

function palmCenter(hand) {
  if (!hand || !hand[0] || !hand[5] || !hand[17]) return null;
  const wrist = hand[0];
  const indexMcp = hand[5];
  const pinkyMcp = hand[17];
  return {
    x: (wrist.x + indexMcp.x + pinkyMcp.x) / 3,
    y: (wrist.y + indexMcp.y + pinkyMcp.y) / 3
  };
}


function setGestureFeedback(title, detail, mode) {
  ui.gestureFeedbackTitle.textContent = title;
  ui.gestureFeedbackDetail.textContent = detail;
  ui.gestureFeedback.classList.toggle("is-hand", mode === "hand");
  ui.gestureFeedback.classList.toggle("is-pinch", mode === "pinch");
}

function hideOnboarding() {
  ui.onboarding.classList.remove("is-visible");
}

function handleGameRulesPrimary() {
  normalizedPlayerName();
  hideGameRules();
  if (state.mode === "game" && !state.roomSceneLoaded) {
    ui.fileInput.click();
  }
}

function showGameRules() {
  ui.gameRulesModal.classList.add("is-visible");
}

function hideGameRules() {
  ui.gameRulesModal.classList.remove("is-visible");
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => ui.toast.classList.remove("is-visible"), 2400);
}

function clearHandOverlay() {
  const ctx = ui.handOverlay.getContext("2d");
  ctx.clearRect(0, 0, ui.handOverlay.width, ui.handOverlay.height);
}

function setGestureWorldPoint(canvasX, canvasY) {
  const rect = canvas.getBoundingClientRect();
  const x = clamp(canvasX / rect.width, 0, 1);
  const y = clamp(canvasY / rect.height, 0, 1);
  state.activeNdc = [x * 2 - 1, 1 - y * 2];
  state.activeWorld = screenToWorldOnPlane(state.activeNdc[0], state.activeNdc[1]);
  ui.reticle.style.left = `${canvasX}px`;
  ui.reticle.style.top = `${canvasY}px`;
  ui.reticle.classList.add("is-visible");
}

function cameraLandmarkToCanvas(point) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clamp(1 - point.x, 0, 1) * rect.width,
    y: clamp(point.y, 0, 1) * rect.height
  };
}

function drawHandOverlay(hands) {
  const ctx = ui.handOverlay.getContext("2d");
  const rect = ui.handOverlay.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  ui.handOverlay.width = Math.max(1, rect.width * ratio);
  ui.handOverlay.height = Math.max(1, rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  drawCameraMask(ctx, rect);

  if (!hands || hands.length === 0) return;

  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20],
    [0, 17]
  ];

  ctx.lineWidth = 2;
  for (const hand of hands) {
    if (!hand) continue;
    ctx.strokeStyle = state.gesture.active ? "rgba(119, 224, 143, 0.9)" : "rgba(98, 211, 255, 0.72)";
    for (const [a, b] of connections) {
      if (!hand[a] || !hand[b]) continue;
      const pa = mirroredOverlayPoint(hand[a], rect);
      const pb = mirroredOverlayPoint(hand[b], rect);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }

    for (let i = 0; i < hand.length; i++) {
      if (!hand[i]) continue;
      const p = mirroredOverlayPoint(hand[i], rect);
      ctx.fillStyle = i === 4 || i === 8 ? "rgba(255, 209, 102, 0.95)" : "rgba(242, 244, 247, 0.8)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, i === 4 || i === 8 ? 4.5 : 2.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function mirroredOverlayPoint(point, rect) {
  return {
    x: (1 - point.x) * rect.width,
    y: point.y * rect.height
  };
}

function drawCameraMask(ctx, rect) {
  if (state.mask === "none" || !state.gesture.cameraOn) return;
  if (state.face.confidence < 0.08) return;

  const cx = (1 - state.face.x) * rect.width;
  const cy = state.face.y * rect.height;
  const size = Math.min(rect.width, rect.height) * state.face.size;
  ctx.save();
  ctx.lineWidth = Math.max(2, size * 0.06);

  if (state.mask === "pixelFace") {
    drawPixelFaceMask(ctx, cx, cy, size);
  } else if (state.mask === "webHero") {
    drawWebHeroMask(ctx, cx, cy, size);
  } else if (state.mask === "tinyOfficer") {
    drawTinyOfficerMask(ctx, cx, cy, size);
  } else if (state.mask === "starPilot") {
    drawStarPilotMask(ctx, cx, cy, size);
  }

  ctx.restore();
}

function updateFaceFromResults(results) {
  const face = (results.faceLandmarks || [])[0];
  if (!face || face.length === 0) {
    state.face.confidence *= 0.9;
    return;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of face) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  const targetX = (minX + maxX) * 0.5;
  const targetY = (minY + maxY) * 0.5;
  const span = Math.max(maxX - minX, maxY - minY, 0.16);
  state.face.x = mix(state.face.x, targetX, 0.35);
  state.face.y = mix(state.face.y, targetY, 0.35);
  state.face.size = mix(state.face.size, clamp(span * 0.88, 0.18, 0.46), 0.3);
  state.face.confidence = mix(state.face.confidence, 1, 0.35);
}

function drawWebHeroMask(ctx, cx, cy, size) {
  ctx.fillStyle = "rgba(198, 35, 48, 0.9)";
  ctx.strokeStyle = "rgba(22, 28, 35, 0.95)";
  roundedMask(ctx, cx, cy, size * 0.95, size * 1.15);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(20, 24, 31, 0.72)";
  ctx.lineWidth = size * 0.025;
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * size * 0.45, cy + Math.sin(angle) * size * 0.5);
    ctx.stroke();
  }

  drawEye(ctx, cx - size * 0.19, cy - size * 0.05, size * 0.16, "white");
  drawEye(ctx, cx + size * 0.19, cy - size * 0.05, size * 0.16, "white");
}

function drawTinyOfficerMask(ctx, cx, cy, size) {
  ctx.fillStyle = "rgba(255, 215, 112, 0.9)";
  roundedMask(ctx, cx, cy + size * 0.06, size * 0.9, size * 0.9);
  ctx.fill();
  ctx.fillStyle = "rgba(59, 104, 190, 0.94)";
  ctx.fillRect(cx - size * 0.48, cy - size * 0.56, size * 0.96, size * 0.28);
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.46, size * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.fillRect(cx - size * 0.07, cy - size * 0.52, size * 0.14, size * 0.09);
  drawEye(ctx, cx - size * 0.18, cy - size * 0.05, size * 0.08, "#1a2533");
  drawEye(ctx, cx + size * 0.18, cy - size * 0.05, size * 0.08, "#1a2533");
}

function drawPixelFaceMask(ctx, cx, cy, size) {
  const pixel = size * 0.12;
  ctx.fillStyle = "rgba(14, 17, 22, 0.88)";
  ctx.fillRect(cx - size * 0.48, cy - size * 0.42, size * 0.96, size * 0.84);
  ctx.fillStyle = "rgba(98, 211, 255, 0.95)";
  ctx.fillRect(cx - pixel * 2.6, cy - pixel, pixel * 1.4, pixel * 1.4);
  ctx.fillRect(cx + pixel * 1.2, cy - pixel, pixel * 1.4, pixel * 1.4);
  ctx.fillStyle = "rgba(119, 224, 143, 0.95)";
  ctx.fillRect(cx - pixel * 1.4, cy + pixel * 1.7, pixel * 2.8, pixel * 0.7);
}

function drawStarPilotMask(ctx, cx, cy, size) {
  ctx.fillStyle = "rgba(38, 45, 68, 0.92)";
  ctx.strokeStyle = "rgba(255, 209, 102, 0.9)";
  roundedMask(ctx, cx, cy, size, size * 0.95);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(98, 211, 255, 0.75)";
  ctx.fillRect(cx - size * 0.34, cy - size * 0.16, size * 0.68, size * 0.22);
  ctx.fillStyle = "rgba(255, 209, 102, 0.95)";
  star(ctx, cx, cy + size * 0.22, size * 0.13);
}

function roundedMask(ctx, cx, cy, width, height) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, width * 0.5, height * 0.5, 0, 0, Math.PI * 2);
}

function drawEye(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.3, r * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
}

function star(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const radius = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function landmarkDistance(a, b) {
  if (!a || !b) return Infinity;
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
}

function updateStats() {
  ui.pointCount.textContent = state.points.count.toLocaleString();
  ui.selectedCount.textContent = state.selected.size.toLocaleString();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function computeViewProjection() {
  const c = state.camera;
  const eye = [
    c.target[0] + Math.sin(c.yaw) * Math.cos(c.pitch) * c.distance,
    c.target[1] + Math.sin(c.pitch) * c.distance,
    c.target[2] + Math.cos(c.yaw) * Math.cos(c.pitch) * c.distance
  ];
  const aspect = canvas.width / Math.max(1, canvas.height);
  const proj = perspective(Math.PI / 4, aspect, 0.01, 100);
  const view = lookAt(eye, c.target, [0, 1, 0]);
  return multiplyMat4(proj, view);
}

function screenToWorldOnPlane(ndcX, ndcY) {
  return [ndcX * 1.35, ndcY * 0.95, 0.05];
}

function propertySize(type) {
  return {
    char: 1, uchar: 1, int8: 1, uint8: 1,
    short: 2, ushort: 2, int16: 2, uint16: 2,
    int: 4, uint: 4, int32: 4, uint32: 4,
    float: 4, float32: 4, double: 8, float64: 8
  }[type] || 4;
}

function readProperty(view, offset, type) {
  switch (type) {
    case "char":
    case "int8": return view.getInt8(offset);
    case "uchar":
    case "uint8": return view.getUint8(offset);
    case "short":
    case "int16": return view.getInt16(offset, true);
    case "ushort":
    case "uint16": return view.getUint16(offset, true);
    case "int":
    case "int32": return view.getInt32(offset, true);
    case "uint":
    case "uint32": return view.getUint32(offset, true);
    case "double":
    case "float64": return view.getFloat64(offset, true);
    default: return view.getFloat32(offset, true);
  }
}

function createProgram(glContext, vertexSource, fragmentSource) {
  const vertex = compileShader(glContext, glContext.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(glContext, glContext.FRAGMENT_SHADER, fragmentSource);
  const linked = glContext.createProgram();
  glContext.attachShader(linked, vertex);
  glContext.attachShader(linked, fragment);
  glContext.linkProgram(linked);
  if (!glContext.getProgramParameter(linked, glContext.LINK_STATUS)) {
    throw new Error(glContext.getProgramInfoLog(linked));
  }
  return linked;
}

function compileShader(glContext, type, source) {
  const shader = glContext.createShader(type);
  glContext.shaderSource(shader, source);
  glContext.compileShader(shader);
  if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
    throw new Error(glContext.getShaderInfoLog(shader));
  }
  return shader;
}

function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, (2 * far * near) * nf, 0
  ]);
}

function lookAt(eye, target, up) {
  const z = normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
  const x = normalize(cross(up, z));
  const y = cross(z, x);
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1
  ]);
}

function multiplyMat4(a, b) {
  const out = new Float32Array(16);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      out[col * 4 + row] =
        a[0 * 4 + row] * b[col * 4 + 0] +
        a[1 * 4 + row] * b[col * 4 + 1] +
        a[2 * 4 + row] * b[col * 4 + 2] +
        a[3 * 4 + row] * b[col * 4 + 3];
    }
  }
  return out;
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function clonePoints(points) {
  return {
    count: points.count,
    positions: new Float32Array(points.positions),
    colors: new Float32Array(points.colors),
    opacities: new Float32Array(points.opacities),
    scales: new Float32Array(points.scales),
    selected: new Float32Array(points.selected)
  };
}

function distanceSq(ax, ay, az, bx, by, bz) {
  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;
  return dx * dx + dy * dy + dz * dz;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}
