const canvas = document.querySelector("#sceneCanvas");
const gl = canvas.getContext("webgl", { antialias: true, alpha: false });

const ui = {
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
  paramCenter: document.querySelector("#paramCenter"),
  paramScale: document.querySelector("#paramScale"),
  paramOpacity: document.querySelector("#paramOpacity"),
  paramColor: document.querySelector("#paramColor")
};

const MAX_POINTS = 260000;
const state = {
  points: null,
  original: null,
  tool: "move",
  selected: new Set(),
  pointer: { down: false, editing: false, lastX: 0, lastY: 0 },
  gesture: {
    active: false,
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
    framesWithoutHand: 0,
    landmarker: null
  },
  camera: { yaw: -0.48, pitch: 0.32, distance: 4.2, target: [0, 0, 0] },
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
requestAnimationFrame(render);

function bindUi() {
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
  ui.onboardingStart.addEventListener("click", () => {
    hideOnboarding();
    startCameraMode();
  });
  ui.onboardingSkip.addEventListener("click", hideOnboarding);
  ui.onboardingClose.addEventListener("click", hideOnboarding);
  ui.recordToggle.addEventListener("click", toggleRecording);
  ui.recordDownload.addEventListener("click", downloadRecording);
  ui.recordShare.addEventListener("click", shareRecording);

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

async function loadFile(file) {
  ui.interactionState.textContent = `Reading ${file.name}...`;
  const extension = file.name.split(".").pop().toLowerCase();
  const buffer = await file.arrayBuffer();
  let parsed;

  try {
    if (extension === "ply") {
      parsed = parsePly(buffer);
    } else if (extension === "splat") {
      parsed = parseSplat(buffer);
    } else {
      throw new Error("KSPLAT needs its dedicated decoder. The import slot is ready.");
    }
  } catch (error) {
    ui.interactionState.textContent = error.message;
    ui.fileMeta.textContent = `Import failed: ${error.message}`;
    return;
  }

  state.points = normalizePoints(parsed);
  state.original = clonePoints(state.points);
  state.selected.clear();
  updateStats();
  ui.fileStatusDot.classList.add("is-ready");
  ui.fileMeta.textContent = `${file.name} | ${state.points.count.toLocaleString()} gaussians | ${(file.size / 1024 / 1024).toFixed(2)} MB`;
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
    ui.cameraToggle.textContent = "Loading hand tracking...";
    ui.cameraToggle.disabled = true;
    ui.cameraStop.disabled = false;
    ui.gesturePill.textContent = "Camera";
    ui.interactionState.textContent = "Camera enabled. Loading MediaPipe hand tracking...";
    setGestureFeedback("Camera is on", "Loading hand tracking model...", "hand");
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
  resetTransformGestures();
  state.gesture.lastVideoTime = -1;
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
  const { FilesetResolver, HandLandmarker } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs");
  const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm");
  const options = delegate => ({
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
  try {
    state.gesture.landmarker = await HandLandmarker.createFromOptions(vision, options("GPU"));
  } catch (error) {
    state.gesture.landmarker = await HandLandmarker.createFromOptions(vision, options("CPU"));
  }
  state.gesture.ready = true;
  state.gesture.loading = false;
}

function trackHands() {
  if (!state.gesture.ready || !ui.cameraPreview.srcObject || !state.gesture.cameraOn) return;

  if (ui.cameraPreview.currentTime !== state.gesture.lastVideoTime) {
    state.gesture.lastVideoTime = ui.cameraPreview.currentTime;
    try {
      const results = state.gesture.landmarker.detectForVideo(ui.cameraPreview, performance.now());
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
    setGestureFeedback("Hand visible", "Pinch to edit, open palm to rotate, or use two hands to zoom.", "hand");
  }
}

function getHandLandmarks(results) {
  const landmarks = results.landmarks || results.handLandmarks || [];
  return landmarks;
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

function endGesture(message) {
  state.gesture.active = false;
  resetTransformGestures();
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
