const canvas = document.querySelector("#sceneCanvas");
const gl = canvas.getContext("webgl", { antialias: true, alpha: false });

const ui = {
  languageSelect: document.querySelector("#languageSelect"),
  studioModeButton: document.querySelector("#studioModeButton"),
  gameModeButton: document.querySelector("#gameModeButton"),
  fileInput: document.querySelector("#fileInput"),
  dropZone: document.querySelector("#dropZone"),
  sceneThumb: document.querySelector("#sceneThumb"),
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
  characterSelect: document.querySelector("#characterSelect"),
  characterLabel: document.querySelector("#characterLabel"),
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
  roamToggle: document.querySelector("#roamToggle"),
  roamCrosshair: document.querySelector("#roamCrosshair"),
  roamHud: document.querySelector("#roamHud"),
  recordToggle: document.querySelector("#recordToggle"),
  recordDownload: document.querySelector("#recordDownload"),
  recordShare: document.querySelector("#recordShare"),
  recordPreview: document.querySelector("#recordPreview"),
  recordMeta: document.querySelector("#recordMeta"),
  stageModeLabel: document.querySelector("#stageModeLabel"),
  stageModeHint: document.querySelector("#stageModeHint"),
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
  gameRulesBack: document.querySelector("#gameRulesBack"),
  modalPlayerName: document.querySelector("#modalPlayerName"),
  modalSceneInput: document.querySelector("#modalSceneInput"),
  modalUploadScene: document.querySelector("#modalUploadScene"),
  tryResultModal: document.querySelector("#tryResultModal"),
  tryResultClose: document.querySelector("#tryResultClose"),
  resultScore: document.querySelector("#resultScore"),
  resultDelta: document.querySelector("#resultDelta"),
  resultTitle: document.querySelector("#resultTitle"),
  resultAwards: document.querySelector("#resultAwards"),
  resultTries: document.querySelector("#resultTries"),
  resultBest: document.querySelector("#resultBest"),
  resultLeaderboard: document.querySelector("#resultLeaderboard"),
  resultNextTry: document.querySelector("#resultNextTry"),
  toast: document.querySelector("#toast"),
  stage: document.querySelector(".stage"),
  leaderboard: document.querySelector("#leaderboard"),
  roomStatus: document.querySelector("#roomStatus"),
  copyRoomLink: document.querySelector("#copyRoomLink"),
  roomLinkText: document.querySelector("#roomLinkText")
};

const MAX_POINTS = 900000;
const BUILT_IN_SCENE_BASE = "https://media.githubusercontent.com/media/DaisyLazyL/Gaussian-bomb/main/scenes";
const BUILT_IN_SCENES = {
  "shanghai-office": { name: "Shanghai Office", zhName: "上海办公室", file: `${BUILT_IN_SCENE_BASE}/shanghai-office.ply` },
  gaussians: { name: "Gaussians", zhName: "Gaussians", file: `${BUILT_IN_SCENE_BASE}/gaussians.ply` },
  "japanese-garden": { name: "Japanese Garden", zhName: "日式园林", file: `${BUILT_IN_SCENE_BASE}/japanese-garden.ply` },
  "matrix-campus": { name: "Matrix Campus", zhName: "矩阵园区", file: `${BUILT_IN_SCENE_BASE}/matrix-campus.ply` }
};
const state = {
  lang: localStorage.getItem("pinchgs-lang") || "zh",
  mode: "studio",
  roomId: "",
  roomSceneLoaded: false,
  gameRulesStep: 1,
  points: null,
  original: null,
  tool: "move",
  selected: new Set(),
  pointer: { down: false, editing: false, lastX: 0, lastY: 0 },
  keyboard: { keys: new Set(), lastWalkAt: 0, lastFeedbackAt: 0 },
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
    recognizer: null,
    landmarker: null,
    faceLandmarker: null
  },
  handedness: "",
  recognizedGesture: "",
  mask: "none",
  importSourceCount: 0,
  activeBuiltInScene: "",
  face: { x: 0.5, y: 0.58, size: 0.28, confidence: 0 },
  camera: { yaw: -0.48, pitch: 0.32, distance: 4.2, target: [0, 0, 0] },
  freeView: { yaw: 0, pitch: 0 },
  roam: {
    active: false,
    savedCamera: null,
    lookActive: false,
    lastLookX: 0,
    lastLookY: 0,
    lastMoveAt: 0,
    speedBoostUntil: 0
  },
  modeSwitch: {
    okStartedAt: 0,
    cooldownUntil: 0,
    target: ""
  },
  viewReset: {
    startedAt: 0,
    cooldownUntil: 0
  },
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
    lastCoverage: 0,
    lastVariety: 0,
    lastRhythmScore: 0,
    lastSpatialPlay: 0,
    lastEditAt: 0,
    submitted: false
  },
  leaderboard: [],
  fx: {
    shakeTimer: 0
  },
  recording: {
    active: false,
    recorder: null,
    canvas: document.createElement("canvas"),
    ctx: null,
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
  fpsTime: performance.now(),
  thumbnailReady: false
};

const translations = {
  en: {
    brandSubtitle: "Gesture editing for 3D Gaussian scenes",
    language: "Language",
    studio: "Solo mode",
    gameMode: "Creative battle",
    freeMode: "Free mode",
    walkMode: "Walk mode",
    tabSwitchWalk: "Tab to walk",
    tabSwitchFree: "Tab to free",
    importTitle: "Import 3DGS",
    chooseScene: "Choose or drop a scene",
    importHint: "PLY and SPLAT preview now. KSPLAT hook is reserved.",
    demoLoaded: "Demo Gaussian cloud is loaded.",
    roomEmpty: "Create a game room, then upload the shared scene.",
    sceneLibrary: "Built-in scenes",
    scenePickerTitle: "Choose challenge scene",
    scenePickerHint: "Pick a built-in scene or upload your own 3DGS file.",
    uploadOwnScene: "Upload my scene",
    sceneLoading: name => `Loading ${name}...`,
    sceneDownloading: (name, loaded, total) => total
      ? `Downloading ${name}: ${loaded} / ${total} MB`
      : `Downloading ${name}: ${loaded} MB`,
    sceneParsing: name => `Parsing ${name}...`,
    sceneLoaded: name => `${name} loaded for this challenge.`,
    copyInvite: "Copy invite link",
    roomLinkHint: "Invited players open the link and enter Game mode directly.",
    editTool: "Edit Tool",
    gestureAuto: "Gesture auto",
    move: "Move",
    deform: "Deform",
    erase: "Erase",
    paint: "Paint",
    brushRadius: "Brush radius",
    strength: "Strength",
    gestureInput: "Gesture Input",
    simulator: "Simulator",
    cameraOff: "Camera off",
    startCamera: "Start camera",
    camera: "Camera",
    cameraOn: "Camera on",
    stopCamera: "Stop camera",
    resetScene: "Reset scene",
    cameraMask: "Camera mask",
    character: "Character",
    gestureHint: "Pinch thumb and index finger to edit. Shift-drag is the fallback simulator.",
    gameChallenge: "Game Challenge",
    tries: "3 tries",
    gameHint: "Invite friends to pinch this same scene. Each player gets 3 tries, 15 seconds per try. Best score ranks.",
    gameReady: "Game mode. Upload the shared scene, invite friends, then start your tries.",
    nickname: "Nickname",
    yourName: "Your name",
    seconds: "seconds",
    creativity: "creativity",
    start15: "Start 15s try",
    recordDemo: "Record Demo",
    download: "Download",
    share: "Share",
    recordMetaReady: "Records the 3D canvas with your camera performance as a shareable WebM video.",
    gaussians: "Gaussians",
    selected: "Selected",
    importOrGesture: "Import a scene or start gesture input",
    studioReady: "Free mode. Import a scene or start gesture input.",
    toolPrefix: "Tool",
    sceneReset: "Scene reset to imported state.",
    roomReady: roomId => `Room ${roomId}: shared scene is ready.`,
    roomNeedsScene: roomId => `Room ${roomId}: upload the scene everyone will pinch.`,
    lanHint: "Same-machine link ready. For other computers, replace localhost with this computer's LAN IP.",
    inviteCopiedShort: "Invite link copied.",
    inviteCopied: "Invite link copied. Paste it to the friends you want to challenge.",
    enterNameCopy: "Enter your nickname first, then copy the invite.",
    copyFailed: "Copy failed. The invite link is shown in the room panel.",
    uploadShared: "Uploading shared scene to the game room...",
    reading: filename => `Reading ${filename}...`,
    importFailed: message => `Import failed: ${message}`,
    imported: "Import complete. Hold Shift and drag to simulate pinch editing.",
    uploadFirst: "Upload scene first",
    uploadFirstDetail: "Game mode starts after the shared 3DGS scene is uploaded.",
    enterNameStart: "Enter your nickname before starting the challenge.",
    noTries: "No tries left",
    noTriesDetail: "Your best score is already on the leaderboard.",
    getReady: "Get ready",
    getReadyButton: "Get ready...",
    getReadyDetail: "Challenge starts after 3, 2, 1.",
    live: "Live",
    running: "Challenge running...",
    go: "Go!",
    goDetail: "You have 15 seconds. Be weird, fast, and expressive.",
    coverage: "Coverage",
    variety: "Variety",
    rhythm: "Rhythm",
    startNextTry: "Start next try",
    newBest: "New best score",
    newBestDetail: score => `${score.toLocaleString()} creativity points. Ranking updated.`,
    tryEnded: "Try ended",
    tryEndedDetail: (score, best) => `${score.toLocaleString()} did not beat your best ${best.toLocaleString()}.`,
    newBestDelta: delta => `New best +${delta.toLocaleString()}`,
    belowBest: delta => `Below best by ${Math.abs(delta).toLocaleString()}`,
    allTriesUsed: "All tries used",
    anonymous: "Anonymous",
    scoreSubmitted: "Score submitted",
    scoreSubmittedDetail: (name, score) => `${name}: ${score.toLocaleString()} creativity points.`,
    scoreSavedLocal: "Score saved locally",
    scoreSavedLocalDetail: "Leaderboard server is not reachable right now.",
    noRanking: "No ranking yet",
    noScores: "No scores yet",
    titleChaos: "Chaos Artist",
    titleSmash: "Smash Master",
    titleSpatial: "Spatial Wizard",
    titleRhythm: "Rhythm Breaker",
    titleSoft: "Soft Destroyer",
    videoHudMode: "PinchGS Challenge",
    videoHudBest: score => `Best ${score.toLocaleString()}`,
    videoHudScore: score => `Score ${score.toLocaleString()}`,
    starting: "Starting...",
    loadingTracking: "Loading gesture + face tracking...",
    cameraLoadingState: "Camera enabled. Loading MediaPipe gesture and face tracking...",
    cameraOnTitle: "Camera is on",
    loadingModels: "Loading gesture and face tracking models...",
    pinchReady: "Pinch ready",
    pinchInstruction: "Pinch thumb and index finger to edit the selected Gaussian cluster.",
    showOneHand: "Show one hand",
    pinchStartDetail: "Pinch thumb and index finger to start editing.",
    cameraFailed: "Camera or hand tracking failed. Simulator mode is still available.",
    cameraUnavailable: "Camera unavailable",
    shiftDragSim: "Use Shift-drag to simulate pinch editing.",
    cameraStopped: "Camera stopped. Shift-drag still works as simulator mode.",
    cameraOffTitle: "Camera off",
    realGestures: "Start camera to use real hand gestures.",
    recordUnsupported: "This browser cannot record the canvas. Try Chrome or Edge.",
    recordingNow: "Recording the 3D canvas and camera performance now...",
    videoReady: duration => `${duration.toFixed(1)}s WebM video ready. Download or share it.`,
    shareUnavailable: "Direct share is unavailable here. Use Download and send the video file.",
    shared: "Shared. The video is still available below.",
    shareCancelled: "Share was cancelled. You can still download the video.",
    record: "Record",
    recordCanvas: "Record the 3D canvas",
    roam: "Walk",
    exitRoam: "Exit walk",
    roamCanvas: "Walk through the Gaussian scene",
    roamMode: "WALK MODE",
    roamHint: "One open hand forward · Two hands backward · Pinch to look",
    roamOnTitle: "Walk mode",
    roamOnDetail: "Show one open hand to move forward. Show two hands to step back.",
    roamOffTitle: "Free mode",
    roamOffDetail: "Pinch gestures are back to editing Gaussians.",
    roamMoving: "Walking",
    roamMovingDetail: "One open hand moves forward. Two hands move backward.",
    roamForward: "Forward",
    roamBackward: "Back",
    roamIdle: "One hand forward · Two hands back",
    roamLooking: "Looking around",
    roamBrake: "Stop",
    roamBrakeDetail: "Release the walk gesture to stop.",
    okGesture: "OK gesture",
    modeSwitchHold: "Hold OK to switch mode",
    switchingToWalk: "Switching to Walk",
    switchingToFree: "Switching to Free",
    modeSwitchDetail: progress => `Hold for 1 second. ${progress}%`,
    resetView: "Reset view",
    resetViewHold: "Hold thumbs up to reset view",
    resetViewDone: "View reset",
    resetViewDetail: progress => `Return the Gaussian model to center. ${progress}%`,
    recording: "Recording",
    recorded: "Recorded",
    stop: "Stop",
    again: "Again",
    ready: "Ready",
    done: "Done",
    none: "None",
    sec: "sec",
    startTry: "Start try",
    waitingForHand: "Waiting for hand",
    startThenShow: "Start camera, then show one hand.",
    handNotTracked: "Hand not tracked",
    openHand: "Open hand",
    trackingError: "Tracking error",
    checkConsole: "Check console",
    trackingPaused: "Tracking paused",
    handTrackingFailed: "Hand tracking failed on this frame.",
    modelRunningNoHand: "Model is running, but no hand landmarks are returned yet.",
    placeHand: "Place one hand inside the camera preview.",
    lookingForHand: "Looking for hand",
    showHandCamera: "Show one hand to the camera.",
    handVisible: "Hand visible",
    completeLandmarks: "Waiting for complete hand landmarks.",
    pinching: "Pinching",
    pinchReleased: "Pinch released.",
    pinchMeter: value => `Hand visible. Pinch meter ${value}%.`,
    handVisibleDetail: "Pinch to edit, make a fist to hammer, or use two hands to zoom.",
    pinchLocked: "Pinch locked",
    pinchLockedDetail: "Move your hand to edit the selected Gaussians.",
    rotateMode: "Rotate mode",
    rotateModeDetail: "Move your open palm to rotate the scene.",
    rotating: "Rotating",
    rotatingState: "Open palm view: turn the scene in place.",
    rotatingDetail: "This changes the free view only. Walk mode uses camera looking.",
    zoomMode: "Zoom mode",
    zoomModeDetail: "Move both hands apart or together.",
    zooming: "Zooming",
    zoomingState: "Two-hand zoom: move hands apart to zoom in, together to zoom out.",
    zoomingDetail: "Move hands apart to zoom in; together to zoom out.",
    fistReady: "Fist ready",
    fistReadyTitle: "Fist hammer ready",
    fistReadyDetail: "Punch downward to smash the Gaussian cluster.",
    fistDetected: "Fist detected. Move downward quickly to hammer.",
    hammer: "Hammer",
    hammerSmash: "Hammer smash",
    hammerState: selected => `Hammer smash: ${selected.toLocaleString()} Gaussians crushed`,
    hammerDetail: selected => `${selected.toLocaleString()} Gaussians crushed.`,
    keyboardWalking: "Keyboard walking",
    keyboardWalkingDetail: keys => `WASD active: ${keys}.`,
    legendMove: "Pinch edit",
    legendHammer: "Fist hammer",
    legendRotate: "Open palm view",
    legendZoom: "OK switch mode",
    legendDeform: "One/two hand walk",
    legendErase: "Thumb up reset",
    legendKeys: "WASD walk",
    onboardingTitle: "How to use PinchGS",
    stepCameraTitle: "Start camera",
    stepCameraBody: "Allow browser camera permission.",
    stepHandTitle: "Show one hand",
    stepHandBody: "Wait for the HUD to say Hand visible.",
    stepPinchTitle: "Pinch",
    stepPinchBody: "Touch thumb and index finger to lock a Gaussian cluster.",
    stepHammerTitle: "Fist hammer",
    stepHammerBody: "Make a fist and punch downward to smash Gaussians.",
    stepPalmTitle: "Open palm",
    stepPalmBody: "In Walk mode, one open hand moves forward; two hands move backward.",
    stepTwoHandsTitle: "Two hands",
    stepTwoHandsBody: "Move hands apart or together to zoom.",
    skip: "Skip",
    rulesTitle: "Game mode rules",
    rulesStepRules: "Rules",
    rulesStepScene: "Scene",
    rulesStepName: "Name",
    rulesKicker: "Challenge setup",
    rulesHeroTitle: "Invite friends to tear apart one shared Gaussian scene.",
    rulesHeroBody: "Everyone plays on their own computer. Best score wins.",
    flowPickScene: "Pick scene",
    flowShareRoom: "Share room",
    flowSmashRank: "Smash & rank",
    ruleFactTries: "tries each",
    ruleFactTime: "per try",
    ruleFactBest: "best score ranks",
    yourNickname: "Your nickname",
    enterNickname: "Enter nickname first",
    sceneSourceBuiltIn: "Built-in scenes",
    sceneSourceBuiltInHint: "Fastest way to start a room.",
    sceneSourceUploadHint: "Use your own .ply / .splat / .ksplat file.",
    sceneStepTitle: "Choose one shared scene",
    sceneStepBody: "Everyone will smash this same Gaussian scene.",
    nameStepTitle: "Almost ready",
    nameStepBody: "Enter a nickname for the leaderboard, then start your 3 tries.",
    readyCardTitle: "Your challenge is ready",
    readyCardBody: "After entering, use Start try on the canvas to begin the 15-second round.",
    back: "Back",
    nextScene: "Next: choose scene",
    nextName: "Next: nickname",
    chooseSceneToContinue: "Choose a scene to continue",
    enterChallenge: "Enter challenge",
    hostUploadTitle: "Host uploads a scene",
    hostUploadBody: "The shared room keeps one 3DGS scene for all invited players.",
    shareInviteTitle: "Share the invite link",
    shareInviteBody: "Friends open the link and enter Game mode directly.",
    triesRuleTitle: "3 tries per player",
    triesRuleBody: "Each try lasts 15 seconds. Only the highest score is ranked.",
    creativityRuleTitle: "Creativity score",
    creativityRuleBody: "Coverage, rhythm, variety, and spatial play all matter.",
    gotItImport: "Create room and upload scene",
    gotIt: "Enter challenge",
    tryResult: "Try result",
    firstTryComplete: "First try complete",
    nextTry: "Next try",
    gaussianParams: "Gaussian Params",
    demoFlow: "Demo Flow",
    prototypeStatus: "Prototype Status",
    flow1: "Import 3DGS scene",
    flow2: "Pinch to select a local Gaussian cluster",
    flow3: "Open palm rotates; two hands zoom",
    flow4: "Move, deform, erase, or recolor params",
    flow5: "Show before / after edit state",
    status1: "PLY Gaussian center preview",
    status2: "SPLAT binary preview",
    status3: "Local parameter editing",
    status4: "Camera gesture hook",
    status5: "Fist hammer gesture",
    status6: "Shift-drag fallback for live demos"
  },
  zh: {
    brandSubtitle: "用手势编辑 3D Gaussian 场景",
    language: "语言",
    studio: "单人模式",
    gameMode: "创意对战",
    freeMode: "自由模式",
    walkMode: "行走模式",
    tabSwitchWalk: "Tab 切换行走",
    tabSwitchFree: "Tab 切回自由",
    importTitle: "导入 3DGS",
    chooseScene: "选择或拖入场景",
    importHint: "当前支持 PLY 和 SPLAT 预览，KSPLAT 入口已预留。",
    demoLoaded: "已加载 Demo 高斯点云。",
    roomEmpty: "创建游戏房间后，先上传大家一起挑战的场景。",
    sceneLibrary: "内置场景",
    scenePickerTitle: "选择挑战场景",
    scenePickerHint: "选择一个内置场景，或上传你自己的 3DGS 文件。",
    uploadOwnScene: "上传我的场景",
    sceneLoading: name => `正在加载 ${name}...`,
    sceneDownloading: (name, loaded, total) => total
      ? `正在下载 ${name}：${loaded} / ${total} MB`
      : `正在下载 ${name}：${loaded} MB`,
    sceneParsing: name => `正在解析 ${name}...`,
    sceneLoaded: name => `${name} 已作为本次挑战场景。`,
    copyInvite: "复制邀请链接",
    roomLinkHint: "朋友打开链接后会直接进入游戏模式。",
    editTool: "编辑工具",
    gestureAuto: "手势自动",
    move: "移动",
    deform: "变形",
    erase: "擦除",
    paint: "上色",
    brushRadius: "笔刷半径",
    strength: "强度",
    gestureInput: "手势输入",
    simulator: "模拟器",
    cameraOff: "摄像头关闭",
    startCamera: "打开摄像头",
    camera: "摄像头",
    cameraOn: "摄像头已打开",
    stopCamera: "关闭摄像头",
    resetScene: "重置场景",
    cameraMask: "摄像头面具",
    character: "角色",
    gestureHint: "捏合拇指和食指开始编辑。Shift 拖拽可作为演示备用操作。",
    gameChallenge: "游戏挑战",
    tries: "3 次机会",
    gameHint: "邀请朋友一起捏同一个场景。每人 3 次机会，每次 15 秒，取最高分排名。",
    gameReady: "游戏模式。上传共享场景、邀请朋友，然后开始挑战。",
    nickname: "昵称",
    yourName: "输入昵称",
    seconds: "秒",
    creativity: "创意分",
    start15: "开始 15 秒挑战",
    recordDemo: "录制演示",
    download: "下载",
    share: "分享",
    recordMetaReady: "录制 3D 画布和摄像头里的动作表现，生成可分享的 WebM 视频。",
    gaussians: "高斯点",
    selected: "已选中",
    importOrGesture: "导入场景或打开手势输入",
    studioReady: "自由模式。导入场景或打开手势输入。",
    toolPrefix: "工具",
    sceneReset: "场景已重置到导入时的状态。",
    roomReady: roomId => `房间 ${roomId}：共享场景已准备好。`,
    roomNeedsScene: roomId => `房间 ${roomId}：上传大家一起挑战的场景。`,
    lanHint: "本机链接已准备好。其他电脑访问时，需要把 localhost 换成这台电脑的局域网 IP。",
    inviteCopiedShort: "邀请链接已复制。",
    inviteCopied: "邀请链接已复制，快去粘贴给要挑战的朋友。",
    enterNameCopy: "先输入你的昵称，再复制邀请链接。",
    copyFailed: "复制失败，邀请链接已显示在房间面板里。",
    uploadShared: "正在把共享场景上传到游戏房间...",
    reading: filename => `正在读取 ${filename}...`,
    importFailed: message => `导入失败：${message}`,
    imported: "导入完成。可以用 Shift 拖拽模拟捏合编辑。",
    uploadFirst: "请先上传场景",
    uploadFirstDetail: "游戏模式需要先上传共享 3DGS 场景。",
    enterNameStart: "开始挑战前请先输入昵称。",
    noTries: "没有机会了",
    noTriesDetail: "你的最高分已经在排行榜里了。",
    getReady: "准备",
    getReadyButton: "准备中...",
    getReadyDetail: "挑战会在 3、2、1 后开始。",
    live: "挑战中",
    running: "挑战进行中...",
    go: "开始！",
    goDetail: "你有 15 秒，尽量大胆、快速、有表现力地捏。",
    coverage: "覆盖",
    variety: "多样性",
    rhythm: "节奏",
    startNextTry: "开始下一次",
    newBest: "刷新最高分",
    newBestDetail: score => `${score.toLocaleString()} 创意分，排名已更新。`,
    tryEnded: "本次结束",
    tryEndedDetail: (score, best) => `${score.toLocaleString()} 没有超过你的最高分 ${best.toLocaleString()}。`,
    newBestDelta: delta => `刷新最高分 +${delta.toLocaleString()}`,
    belowBest: delta => `低于最高分 ${Math.abs(delta).toLocaleString()}`,
    allTriesUsed: "3 次机会已用完",
    anonymous: "匿名玩家",
    scoreSubmitted: "分数已提交",
    scoreSubmittedDetail: (name, score) => `${name}：${score.toLocaleString()} 创意分。`,
    scoreSavedLocal: "分数已本地保存",
    scoreSavedLocalDetail: "当前连接不到排行榜服务。",
    noRanking: "暂无排名",
    noScores: "暂无分数",
    titleChaos: "混沌艺术家",
    titleSmash: "重击大师",
    titleSpatial: "空间巫师",
    titleRhythm: "节奏破坏者",
    titleSoft: "柔性破坏者",
    videoHudMode: "PinchGS 挑战",
    videoHudBest: score => `最高分 ${score.toLocaleString()}`,
    videoHudScore: score => `当前分 ${score.toLocaleString()}`,
    starting: "正在启动...",
    loadingTracking: "正在加载手势 + 人脸识别...",
    cameraLoadingState: "摄像头已打开，正在加载 MediaPipe 手势和人脸识别...",
    cameraOnTitle: "摄像头已打开",
    loadingModels: "正在加载手势和人脸识别模型...",
    pinchReady: "捏合就绪",
    pinchInstruction: "捏合拇指和食指来编辑选中的高斯点簇。",
    showOneHand: "伸出一只手",
    pinchStartDetail: "捏合拇指和食指开始编辑。",
    cameraFailed: "摄像头或手势识别失败，仍可使用模拟器模式。",
    cameraUnavailable: "摄像头不可用",
    shiftDragSim: "使用 Shift 拖拽来模拟捏合编辑。",
    cameraStopped: "摄像头已关闭。Shift 拖拽仍可作为模拟器模式使用。",
    cameraOffTitle: "摄像头已关闭",
    realGestures: "打开摄像头即可使用真实手势。",
    recordUnsupported: "当前浏览器不能录制画布，建议使用 Chrome 或 Edge。",
    recordingNow: "正在录制 3D 画布和摄像头表现...",
    videoReady: duration => `${duration.toFixed(1)} 秒 WebM 视频已生成，可下载或分享。`,
    shareUnavailable: "这里无法直接分享，请下载视频文件后发送给朋友。",
    shared: "已分享。视频仍保留在下方。",
    shareCancelled: "分享已取消。你仍然可以下载视频。",
    record: "录制",
    recordCanvas: "录制 3D 画布",
    roam: "行走",
    exitRoam: "退出行走",
    roamCanvas: "在 Gaussian 场景中行走",
    roamMode: "行走模式",
    roamHint: "单手张掌前进 · 双手后退 · 捏合转头",
    roamOnTitle: "行走模式",
    roamOnDetail: "伸出一只张开的手前进，伸出两只手后退。",
    roamOffTitle: "自由模式",
    roamOffDetail: "捏合手势已恢复为编辑高斯点。",
    roamMoving: "行走中",
    roamMovingDetail: "单手张掌前进；双手后退。",
    roamForward: "前进",
    roamBackward: "后退",
    roamIdle: "单手前进 · 双手后退",
    roamLooking: "转头中",
    roamBrake: "停止",
    roamBrakeDetail: "松开行走手势即可停止。",
    okGesture: "OK 手势",
    modeSwitchHold: "保持 OK 手势切换模式",
    switchingToWalk: "切换到行走",
    switchingToFree: "切换到自由",
    modeSwitchDetail: progress => `保持 1 秒。${progress}%`,
    resetView: "重置视图",
    resetViewHold: "保持大拇指向上重置视图",
    resetViewDone: "视图已重置",
    resetViewDetail: progress => `把高斯模型回到画面中间。${progress}%`,
    recording: "录制中",
    recorded: "已录制",
    stop: "停止",
    again: "再录",
    ready: "就绪",
    done: "完成",
    none: "无",
    sec: "秒",
    startTry: "开始挑战",
    waitingForHand: "等待识别手",
    startThenShow: "先打开摄像头，然后把一只手放进画面。",
    handNotTracked: "未识别到手",
    openHand: "张开手",
    trackingError: "识别出错",
    checkConsole: "查看控制台",
    trackingPaused: "识别暂停",
    handTrackingFailed: "这一帧手势识别失败。",
    modelRunningNoHand: "模型正在运行，但暂时没有返回手部关键点。",
    placeHand: "把一只手放进摄像头画面里。",
    lookingForHand: "正在找手",
    showHandCamera: "把一只手放到摄像头前。",
    handVisible: "已识别到手",
    completeLandmarks: "等待完整的手部关键点。",
    pinching: "捏合中",
    pinchReleased: "捏合已松开。",
    pinchMeter: value => `已识别到手。捏合强度 ${value}%。`,
    handVisibleDetail: "捏合编辑，握拳下锤，或用双手缩放。",
    pinchLocked: "捏合锁定",
    pinchLockedDetail: "移动手来编辑选中的高斯点。",
    rotateMode: "旋转模式",
    rotateModeDetail: "移动张开的手掌来旋转场景。",
    rotating: "旋转中",
    rotatingState: "张掌查看：原地转动场景预览。",
    rotatingDetail: "这里只改变自由模式视角；行走模式才使用相机环绕查看。",
    zoomMode: "缩放模式",
    zoomModeDetail: "双手分开或靠近。",
    zooming: "缩放中",
    zoomingState: "双手缩放：分开双手放大，靠近双手缩小。",
    zoomingDetail: "双手分开放大，靠近缩小。",
    fistReady: "拳头就绪",
    fistReadyTitle: "拳头锤就绪",
    fistReadyDetail: "向下锤来砸碎高斯点簇。",
    fistDetected: "识别到拳头。快速向下移动来锤击。",
    hammer: "锤击",
    hammerSmash: "锤击成功",
    hammerState: selected => `锤击：${selected.toLocaleString()} 个高斯点被压碎`,
    hammerDetail: selected => `${selected.toLocaleString()} 个高斯点被压碎。`,
    keyboardWalking: "键盘行走",
    keyboardWalkingDetail: keys => `WASD 正在移动：${keys}。`,
    legendMove: "捏合编辑",
    legendHammer: "拳头锤",
    legendRotate: "张掌查看",
    legendZoom: "OK 切模式",
    legendDeform: "单/双手行走",
    legendErase: "拇指向上重置",
    legendKeys: "WASD 行走",
    onboardingTitle: "如何使用 PinchGS",
    stepCameraTitle: "打开摄像头",
    stepCameraBody: "允许浏览器使用摄像头。",
    stepHandTitle: "伸出一只手",
    stepHandBody: "等 HUD 显示已识别到手。",
    stepPinchTitle: "捏合",
    stepPinchBody: "拇指和食指捏在一起，锁定一簇高斯点。",
    stepHammerTitle: "拳头锤",
    stepHammerBody: "握拳后向下锤，砸碎高斯点。",
    stepPalmTitle: "张开手掌",
    stepPalmBody: "行走模式下，单手张掌前进，双手后退。",
    stepTwoHandsTitle: "双手",
    stepTwoHandsBody: "双手分开或靠近来缩放场景。",
    skip: "跳过",
    rulesTitle: "游戏模式规则",
    rulesStepRules: "规则",
    rulesStepScene: "场景",
    rulesStepName: "昵称",
    rulesKicker: "挑战启动",
    rulesHeroTitle: "邀请朋友一起撕碎同一个 Gaussian 场景。",
    rulesHeroBody: "每个人用自己的电脑挑战，最后按最高分排名。",
    flowPickScene: "选场景",
    flowShareRoom: "发邀请",
    flowSmashRank: "捏碎排名",
    ruleFactTries: "每人机会",
    ruleFactTime: "每次挑战",
    ruleFactBest: "最高分排名",
    yourNickname: "你的昵称",
    enterNickname: "先输入昵称",
    sceneSourceBuiltIn: "内置场景",
    sceneSourceBuiltInHint: "最快创建房间，适合现场开局。",
    sceneSourceUploadHint: "使用你自己的 .ply / .splat / .ksplat 文件。",
    sceneStepTitle: "选择一个共享场景",
    sceneStepBody: "所有被邀请的人都会挑战同一个 Gaussian 场景。",
    nameStepTitle: "马上开始",
    nameStepBody: "输入排行榜昵称，然后进入挑战区开始 3 次机会。",
    readyCardTitle: "挑战已准备好",
    readyCardBody: "进入后点击画布顶部的开始按钮，开启 15 秒挑战。",
    back: "上一步",
    nextScene: "下一步：选场景",
    nextName: "下一步：填昵称",
    chooseSceneToContinue: "先选择一个场景",
    enterChallenge: "进入挑战",
    hostUploadTitle: "房主上传场景",
    hostUploadBody: "房间会保存一个共享 3DGS 场景，所有玩家挑战同一个场景。",
    shareInviteTitle: "分享邀请链接",
    shareInviteBody: "朋友打开链接后会直接进入游戏模式。",
    triesRuleTitle: "每人 3 次机会",
    triesRuleBody: "每次挑战 15 秒，只取最高分进入排名。",
    creativityRuleTitle: "创意评分",
    creativityRuleBody: "覆盖范围、节奏、动作多样性和空间表现都会影响分数。",
    gotItImport: "创建房间并上传场景",
    gotIt: "进入挑战",
    tryResult: "本次结果",
    firstTryComplete: "第一次挑战完成",
    nextTry: "下一次挑战",
    gaussianParams: "高斯参数",
    demoFlow: "演示流程",
    prototypeStatus: "原型状态",
    flow1: "导入 3DGS 场景",
    flow2: "捏合选择局部高斯点簇",
    flow3: "张掌旋转，双手缩放",
    flow4: "移动、变形、擦除或重新上色",
    flow5: "展示编辑前后状态",
    status1: "PLY 高斯中心预览",
    status2: "SPLAT 二进制预览",
    status3: "局部参数编辑",
    status4: "摄像头手势接入",
    status5: "拳头锤手势",
    status6: "Shift 拖拽演示备用"
  }
};

function t(key, ...args) {
  const value = translations[state.lang][key] || translations.en[key] || key;
  return typeof value === "function" ? value(...args) : value;
}

function setText(selector, key) {
  const element = document.querySelector(selector);
  if (element) element.textContent = t(key);
}

function setPlaceholder(selector, key) {
  const element = document.querySelector(selector);
  if (element) element.placeholder = t(key);
}

function setOptionText(value, label) {
  const option = ui.maskSelect.querySelector(`option[value="${value}"]`);
  if (option) option.textContent = label;
}

function setButtonTrailingText(button, label) {
  const textNode = button?.querySelector("span:last-child");
  if (textNode) {
    textNode.textContent = label;
  } else if (button) {
    button.textContent = label;
  }
}

function triesText(count) {
  if (state.lang === "zh") return `${count} 次机会`;
  return `${count} ${count === 1 ? "try" : "tries"}`;
}

function triesLeftText(count) {
  if (state.lang === "zh") return `还剩 ${count} 次机会`;
  return `${count} ${count === 1 ? "try" : "tries"} left`;
}

function bestText(score) {
  return state.lang === "zh" ? `最高分 ${score.toLocaleString()}` : `Best ${score.toLocaleString()}`;
}

function breakdownText(coverage, variety, rhythm) {
  return `${t("coverage")} ${Math.round(coverage)} · ${t("variety")} ${Math.round(variety)} · ${t("rhythm")} ${Math.round(rhythm)}`;
}

function characterAccent() {
  return {
    thanos: "#b894ff",
    ironMan: "#66ebff",
    joker: "#77e08f",
    webHero: "#ff5c68",
    tinyOfficer: "#ffd166",
    pixelFace: "#62d3ff",
    starPilot: "#ffd166",
    none: "#62d3ff"
  }[state.mask] || "#62d3ff";
}

function applyLanguage() {
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
  document.title = "Gaussian Smash";
  const brandTitle = document.querySelector(".brand h1");
  if (brandTitle) brandTitle.textContent = "Gaussian Smash";
  setText(".brand p", "brandSubtitle");
  setText(".language-switch span", "language");
  ui.studioModeButton.textContent = t("studio");
  ui.gameModeButton.innerHTML = `<span>${t("gameMode")}</span>`;
  ui.dropZone.title = t("chooseScene");
  if (!state.original || ui.fileMeta.textContent.includes("Demo") || ui.fileMeta.textContent.includes("Demo")) {
    ui.fileMeta.textContent = t("demoLoaded");
  }
  ui.copyRoomLink.textContent = t("copyInvite");
  setText("#roomLinkText", "roomLinkHint");
  setText("#editToolPanel .panel-title span:first-child", "editTool");
  setText("#editToolPanel .edit-collapse-pill", "gestureAuto");
  const toolLabels = { move: "move", deform: "deform", erase: "erase", paint: "paint" };
  document.querySelectorAll(".tool-button").forEach(button => {
    const icon = button.querySelector("span")?.outerHTML || "";
    button.innerHTML = `${icon}${t(toolLabels[button.dataset.tool])}`;
  });
  setText("#editToolPanel .range-row:nth-of-type(1) span", "brushRadius");
  setText("#editToolPanel .range-row:nth-of-type(2) span", "strength");
  setText("#gesturePanel .panel-title span:first-child", "gestureInput");
  ui.gesturePill.textContent = state.gesture.cameraOn ? t("camera") : t("simulator");
  ui.cameraEmpty.textContent = t("cameraOff");
  ui.cameraToggle.textContent = state.gesture.cameraOn ? t("cameraOn") : t("startCamera");
  ui.cameraStop.textContent = t("stopCamera");
  ui.resetScene.textContent = t("resetScene");
  setText(".mask-row label", "cameraMask");
  setOptionText("none", t("none"));
  if (ui.characterLabel) ui.characterLabel.textContent = t("character");
  if (ui.characterSelect) ui.characterSelect.value = state.mask;
  setText("#gesturePanel .hint-line", "gestureHint");
  setText("#gamePanel .panel-title span:first-child", "gameChallenge");
  ui.competitionPill.textContent = state.competition.triesLeft > 0 ? triesText(state.competition.triesLeft) : t("done");
  setText("#gameHint", "gameHint");
  setText("#sceneLibraryLabel", "sceneLibrary");
  document.querySelectorAll(".scene-preset-button").forEach(button => {
    const scene = BUILT_IN_SCENES[button.dataset.scene];
    if (scene) {
      const label = state.lang === "zh" ? scene.zhName : scene.name;
      const cardTitle = button.querySelector("strong");
      if (cardTitle) {
        cardTitle.textContent = label;
      } else {
        button.textContent = label;
      }
    }
  });
  setText("#playerNameLabel", "nickname");
  setPlaceholder("#playerName", "yourName");
  setText(".competition-scoreboard div:first-child small", "seconds");
  setText(".competition-scoreboard div:last-child small", "creativity");
  setText("#recordPanel .panel-title span", "recordDemo");
  ui.recordDownload.textContent = t("download");
  ui.recordShare.textContent = t("share");
  if (!state.recording.blob && !state.recording.active) ui.recordMeta.textContent = t("recordMetaReady");
  setText(".metrics div:nth-child(1) small", "gaussians");
  setText(".metrics div:nth-child(2) small", "selected");
  if (!state.gesture.cameraOn && !state.competition.active) ui.interactionState.textContent = state.mode === "game" ? t("gameReady") : t("studioReady");
  updateStageModePill();
  setButtonTrailingText(ui.recordToggle, state.recording.active ? t("stop") : state.recording.blob ? t("again") : t("record"));
  ui.recordToggle.title = t("recordCanvas");
  ui.recordPill.textContent = state.recording.active ? t("recording") : state.recording.blob ? t("recorded") : t("ready");
  setButtonTrailingText(ui.roamToggle, state.roam.active ? t("exitRoam") : t("roam"));
  ui.roamToggle.title = t("roamCanvas");
  const roamHudTitle = ui.roamHud?.querySelector("strong");
  const roamHudHint = ui.roamHud?.querySelector("span");
  if (roamHudTitle) roamHudTitle.textContent = t("roamMode");
  if (roamHudHint) roamHudHint.textContent = t("roamHint");
  setText(".stage-timer small", "sec");
  setText("#gestureFeedbackTitle", "waitingForHand");
  setText("#gestureFeedbackDetail", "startThenShow");
  ui.handStatus.textContent = t("handNotTracked");
  ui.pinchStatus.textContent = t("openHand");
  const legendKeys = ["legendMove", "legendHammer", "legendRotate", "legendZoom", "legendDeform", "legendErase", "legendKeys"];
  document.querySelectorAll(".legend span").forEach((item, index) => {
    const swatch = item.querySelector("i")?.outerHTML || "";
    item.innerHTML = `${swatch}${t(legendKeys[index])}`;
  });
  setText("#onboarding .panel-title span", "onboardingTitle");
  const steps = [
    ["stepCameraTitle", "stepCameraBody"],
    ["stepHandTitle", "stepHandBody"],
    ["stepPinchTitle", "stepPinchBody"],
    ["stepHammerTitle", "stepHammerBody"],
    ["stepPalmTitle", "stepPalmBody"],
    ["stepTwoHandsTitle", "stepTwoHandsBody"]
  ];
  document.querySelectorAll("#onboarding .onboarding-steps li").forEach((item, index) => {
    item.querySelector("strong").textContent = t(steps[index][0]);
    item.querySelector("span").textContent = t(steps[index][1]);
  });
  ui.onboardingStart.textContent = t("startCamera");
  ui.onboardingSkip.textContent = t("skip");
  setText("#gameRulesModal .panel-title span", "rulesTitle");
  setText("#rulesStepRules", "rulesStepRules");
  setText("#rulesStepScene", "rulesStepScene");
  setText("#rulesStepName", "rulesStepName");
  setText("#rulesKicker", "rulesKicker");
  setText(".game-rules-hero strong", "rulesHeroTitle");
  setText(".game-rules-hero .rules-hero-body", "rulesHeroBody");
  setText("#flowPickScene", "flowPickScene");
  setText("#flowShareRoom", "flowShareRoom");
  setText("#flowSmashRank", "flowSmashRank");
  setText("#ruleFactTries", "ruleFactTries");
  setText("#ruleFactTime", "ruleFactTime");
  setText("#ruleFactBest", "ruleFactBest");
  setText("#gameRulesModal .field-row span", "yourNickname");
  setPlaceholder("#modalPlayerName", "enterNickname");
  setText("#modalSceneLibraryLabel", "scenePickerTitle");
  setText("#modalSceneLibraryHint", "scenePickerHint");
  setText("#sceneSourceBuiltIn", "sceneSourceBuiltIn");
  setText("#sceneSourceBuiltInHint", "sceneSourceBuiltInHint");
  setText("#sceneSourceUploadHint", "sceneSourceUploadHint");
  setText("#sceneStepTitle", "sceneStepTitle");
  setText("#sceneStepBody", "sceneStepBody");
  setText("#nameStepTitle", "nameStepTitle");
  setText("#nameStepBody", "nameStepBody");
  setText("#readyCardTitle", "readyCardTitle");
  setText("#readyCardBody", "readyCardBody");
  if (ui.gameRulesBack) ui.gameRulesBack.textContent = t("back");
  if (ui.modalUploadScene) ui.modalUploadScene.textContent = t("uploadOwnScene");
  const ruleSteps = [
    ["hostUploadTitle", "hostUploadBody"],
    ["shareInviteTitle", "shareInviteBody"],
    ["triesRuleTitle", "triesRuleBody"],
    ["creativityRuleTitle", "creativityRuleBody"]
  ];
  document.querySelectorAll("#gameRulesModal .onboarding-steps li").forEach((item, index) => {
    item.querySelector("strong").textContent = t(ruleSteps[index][0]);
    item.querySelector("span").textContent = t(ruleSteps[index][1]);
  });
  updateGameRulesStep();
  setText("#tryResultModal .panel-title span", "tryResult");
  if (!state.competition.score) ui.resultDelta.textContent = t("firstTryComplete");
  if (ui.resultTitle && !state.competition.score) ui.resultTitle.textContent = t("titleChaos");
  setText("#resultNextTry", "nextTry");
}

function updateStageModePill() {
  if (!ui.stageModeLabel || !ui.stageModeHint) return;
  ui.stageModeLabel.textContent = state.roam.active ? t("walkMode") : t("freeMode");
  ui.stageModeHint.textContent = state.roam.active ? t("tabSwitchFree") : t("tabSwitchWalk");
}

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
precision highp float;
varying vec3 vColor;
varying float vOpacity;
varying float vSelected;
void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float d = dot(uv, uv);
  if (d > 1.0) discard;
  float gaussian = exp(-d * 4.4);
  float edge = smoothstep(1.0, 0.06, d);
  float alpha = clamp(gaussian * edge * vOpacity * 0.92, 0.0, 0.96);
  vec3 base = pow(max(vColor, vec3(0.0)), vec3(0.88));
  vec3 color = mix(base, vec3(0.38, 0.83, 1.0), vSelected * 0.55);
  gl_FragColor = vec4(color * alpha, alpha);
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
applyLanguage();
initializeModeFromUrl();
requestAnimationFrame(render);

function bindUi() {
  ui.languageSelect.value = state.lang;
  ui.languageSelect.addEventListener("change", () => {
    state.lang = ui.languageSelect.value;
    localStorage.setItem("pinchgs-lang", state.lang);
    applyLanguage();
    if (state.mode === "game") {
      updateRoomUi();
      updateTryUi();
    } else {
      ui.interactionState.textContent = t("studioReady");
    }
  });
  ui.studioModeButton.addEventListener("click", enterStudioMode);
  ui.gameModeButton.addEventListener("click", () => enterGameMode());
  ui.copyRoomLink.addEventListener("click", copyInviteLink);

  ui.fileInput.addEventListener("change", event => {
    const file = event.target.files && event.target.files[0];
    if (file) loadFile(file);
  });
  ui.modalSceneInput?.addEventListener("change", event => {
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
      ui.interactionState.textContent = `${t("toolPrefix")}: ${button.textContent.trim()}`;
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
    ui.interactionState.textContent = t("sceneReset");
  });

  ui.cameraToggle.addEventListener("click", startCameraMode);
  ui.cameraStop.addEventListener("click", stopCameraMode);
  ui.maskSelect.addEventListener("change", () => {
    state.mask = ui.maskSelect.value;
    if (ui.characterSelect) ui.characterSelect.value = state.mask;
  });
  if (ui.characterSelect) {
    ui.characterSelect.value = state.mask;
    ui.characterSelect.addEventListener("change", () => {
      state.mask = ui.characterSelect.value;
      ui.maskSelect.value = state.mask;
    });
  }
  ui.onboardingStart.addEventListener("click", () => {
    hideOnboarding();
    startCameraMode();
  });
  ui.onboardingSkip.addEventListener("click", hideOnboarding);
  ui.onboardingClose.addEventListener("click", hideOnboarding);
  ui.gameRulesClose.addEventListener("click", hideGameRules);
  ui.gameRulesGotIt.addEventListener("click", handleGameRulesPrimary);
  ui.gameRulesBack?.addEventListener("click", () => setGameRulesStep(state.gameRulesStep - 1));
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
  ui.roamToggle.addEventListener("click", toggleRoamMode);
  ui.recordDownload.addEventListener("click", downloadRecording);
  ui.recordShare.addEventListener("click", shareRecording);
  ui.competitionStart.addEventListener("click", startCompetition);
  ui.stageCompetitionStart.addEventListener("click", startCompetition);
  document.querySelectorAll(".scene-preset-button").forEach(button => {
    button.addEventListener("click", () => loadBuiltInScene(button.dataset.scene));
  });

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
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", () => state.keyboard.keys.clear());
}

function isTypingTarget(target) {
  const tagName = target?.tagName;
  return target?.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
}

function normalizedWalkKey(event) {
  const key = event.key.toLowerCase();
  return key === "w" || key === "a" || key === "s" || key === "d" ? key : "";
}

function handleKeyDown(event) {
  const key = normalizedWalkKey(event);
  if (!key || isTypingTarget(event.target)) return;
  state.keyboard.keys.add(key);
  if (state.roam.active) event.preventDefault();
}

function handleKeyUp(event) {
  const key = normalizedWalkKey(event);
  if (!key) return;
  state.keyboard.keys.delete(key);
  if (state.roam.active) event.preventDefault();
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
  if (state.roam.active) exitRoamMode();
  state.mode = "studio";
  document.body.classList.add("studio-mode");
  document.body.classList.remove("game-mode");
  ui.studioModeButton.classList.add("is-active");
  ui.gameModeButton.classList.remove("is-active");
  ui.interactionState.textContent = t("studioReady");
}

async function enterGameMode(roomId = "") {
  if (state.roam.active) exitRoamMode();
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
  ui.interactionState.textContent = t("gameReady");
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
    ? t("roomReady", state.roomId)
    : t("roomNeedsScene", state.roomId);
  ui.copyRoomLink.disabled = false;
  updateGameRulesStep();
  ui.roomLinkText.textContent = location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? t("lanHint")
    : inviteUrl();
  const canStart = state.roomSceneLoaded && state.competition.triesLeft > 0 && !state.competition.active && !state.competition.preparing;
  setCompetitionButtons(!canStart, canStart ? t("startTry") : t("uploadFirst"));
}

async function copyInviteLink() {
  const name = normalizedPlayerName();
  if (!name) {
    showToast(t("enterNameCopy"));
    ui.playerName.focus();
    return;
  }
  const url = inviteUrl();
  const message = `${name} 邀请你一起来挑战 PinchGS：${url}`;
  try {
    await navigator.clipboard.writeText(message);
    ui.roomLinkText.textContent = t("inviteCopiedShort");
    showToast(t("inviteCopied"));
  } catch (error) {
    ui.roomLinkText.textContent = url;
    showToast(t("copyFailed"));
  }
}

function inviteUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("mode", "game");
  url.searchParams.set("room", state.roomId);
  return url.toString();
}

async function uploadRoomScene(filename, buffer) {
  ui.roomStatus.textContent = t("uploadShared");
  const response = await fetch(`/api/rooms/${state.roomId}/scene`, {
    method: "POST",
    headers: { "X-Scene-Name": encodeURIComponent(filename) },
    body: buffer
  });
  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
  state.roomSceneLoaded = true;
  updateRoomUi();
  updateTryUi();
  await loadLeaderboard();
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
  ui.interactionState.textContent = t("reading", file.name);
  const buffer = await file.arrayBuffer();

  try {
    loadSceneBuffer(buffer, file.name, file.size);
    if (state.mode === "game" && state.roomId) {
      await uploadRoomScene(file.name, buffer);
    }
    if (state.mode === "game" && ui.gameRulesModal.classList.contains("is-visible")) {
      setGameRulesStep(3);
    }
  } catch (error) {
    ui.interactionState.textContent = error.message;
    ui.fileMeta.textContent = t("importFailed", error.message);
  } finally {
    ui.fileInput.value = "";
    if (ui.modalSceneInput) ui.modalSceneInput.value = "";
  }
}

async function loadBuiltInScene(sceneId) {
  const scene = BUILT_IN_SCENES[sceneId];
  if (!scene) return;

  const label = state.lang === "zh" ? scene.zhName : scene.name;
  const buttons = Array.from(document.querySelectorAll(".scene-preset-button"));
  buttons.forEach(button => {
    button.disabled = true;
  });
  ui.interactionState.textContent = t("sceneLoading", label);

  try {
    const response = await fetch(scene.file);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const buffer = await readSceneResponse(response, label);
    ui.interactionState.textContent = t("sceneParsing", label);
    const filename = `${label}.ply`;
    loadSceneBuffer(buffer, filename, buffer.byteLength);
    state.activeBuiltInScene = sceneId;
    buttons.forEach(button => button.classList.toggle("is-active", button.dataset.scene === sceneId));
    if (state.mode === "game" && state.roomId) {
      await uploadRoomScene(filename, buffer);
    }
    ui.interactionState.textContent = t("sceneLoaded", label);
    if (state.mode === "game" && ui.gameRulesModal.classList.contains("is-visible")) {
      setGameRulesStep(3);
    }
  } catch (error) {
    ui.interactionState.textContent = t("importFailed", error.message);
  } finally {
    buttons.forEach(button => {
      button.disabled = false;
    });
  }
}

async function readSceneResponse(response, label) {
  const total = Number(response.headers.get("Content-Length") || 0);
  if (!response.body || !response.body.getReader) {
    const buffer = await response.arrayBuffer();
    updateSceneDownloadProgress(label, buffer.byteLength, total || buffer.byteLength);
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  let lastUpdate = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    const now = performance.now();
    if (now - lastUpdate > 180 || loaded === total) {
      updateSceneDownloadProgress(label, loaded, total);
      lastUpdate = now;
    }
  }

  updateSceneDownloadProgress(label, loaded, total);
  const buffer = new Uint8Array(loaded);
  let offset = 0;
  chunks.forEach(chunk => {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return buffer.buffer;
}

function updateSceneDownloadProgress(label, loadedBytes, totalBytes) {
  const loaded = (loadedBytes / 1024 / 1024).toFixed(1);
  const total = totalBytes ? (totalBytes / 1024 / 1024).toFixed(1) : "";
  const message = t("sceneDownloading", label, loaded, total);
  ui.interactionState.textContent = message;
  ui.fileMeta.textContent = message;
}

function loadSceneBuffer(buffer, filename, size = buffer.byteLength) {
  state.importSourceCount = 0;
  const extension = filename.split(".").pop().toLowerCase();
  let parsed;

  if (extension === "ply") {
    parsed = parsePly(buffer);
  } else if (extension === "splat") {
    parsed = parseSplat(buffer);
  } else {
    throw new Error("KSPLAT needs its dedicated decoder. The import slot is ready.");
  }

  state.points = normalizePoints(flipImportedY(parsed));
  state.original = clonePoints(state.points);
  state.selected.clear();
  state.thumbnailReady = false;
  updateStats();
  ui.fileStatusDot.classList.add("is-ready");
  const sourceCount = state.importSourceCount || state.points.count;
  const samplingNote = sourceCount > state.points.count ? ` / ${sourceCount.toLocaleString()} sampled` : "";
  ui.fileMeta.textContent = `${filename} | ${state.points.count.toLocaleString()}${samplingNote} gaussians | ${(size / 1024 / 1024).toFixed(2)} MB`;
  ui.interactionState.textContent = t("imported");
  window.setTimeout(updateSceneThumbnail, 80);
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

function flipImportedY(points) {
  for (let i = 0; i < points.count; i++) {
    points.positions[i * 3 + 1] *= -1;
  }
  return points;
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
  const sourceCount = Number(vertexLine.split(/\s+/)[2]);
  const count = Math.min(sourceCount, MAX_POINTS);
  state.importSourceCount = sourceCount;
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

  if (format === "ascii") return parseAsciiPly(bytes, headerEnd, sourceCount, count, properties);
  if (format === "binary_little_endian") return parseBinaryPly(buffer, headerEnd, sourceCount, count, properties);
  throw new Error(`${format} PLY is not supported yet.`);
}

function parseAsciiPly(bytes, start, sourceCount, count, properties) {
  const body = new TextDecoder().decode(bytes.slice(start));
  const lines = body.trim().split(/\r?\n/);
  const result = emptyPoints(count);

  for (let i = 0; i < count; i++) {
    const sourceIndex = sampleSourceIndex(i, count, sourceCount);
    const values = lines[sourceIndex].trim().split(/\s+/).map(Number);
    fillPointFromValues(i, values, properties, result);
  }

  return result;
}

function parseBinaryPly(buffer, start, sourceCount, count, properties) {
  const view = new DataView(buffer, start);
  const offsets = [];
  let stride = 0;

  for (const property of properties) {
    offsets.push(stride);
    stride += propertySize(property.type);
  }

  const result = emptyPoints(count);

  for (let i = 0; i < count; i++) {
    const sourceIndex = sampleSourceIndex(i, count, sourceCount);
    const base = sourceIndex * stride;
    const values = properties.map((property, index) => readProperty(view, base + offsets[index], property.type));
    fillPointFromValues(i, values, properties, result);
  }

  return result;
}

function parseSplat(buffer) {
  const rowLength = 32;
  const sourceCount = Math.floor(buffer.byteLength / rowLength);
  const count = Math.min(sourceCount, MAX_POINTS);
  state.importSourceCount = sourceCount;
  if (count <= 0) throw new Error("SPLAT file is empty.");
  const view = new DataView(buffer);
  const result = emptyPoints(count);

  for (let i = 0; i < count; i++) {
    const sourceIndex = sampleSourceIndex(i, count, sourceCount);
    const base = sourceIndex * rowLength;
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

function sampleSourceIndex(index, count, sourceCount) {
  if (count >= sourceCount) return index;
  if (count <= 1) return 0;
  return Math.min(sourceCount - 1, Math.round(index * (sourceCount - 1) / (count - 1)));
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
    points.scales[i] = clamp(points.scales[i] * scale, 0.012, 0.24);
  }

  return points;
}

function applyKeyboardWalk(now = performance.now()) {
  if (!state.roam.active || state.keyboard.keys.size === 0) {
    state.keyboard.lastWalkAt = now;
    return;
  }

  const keys = state.keyboard.keys;
  const forward = (keys.has("w") ? 1 : 0) - (keys.has("s") ? 1 : 0);
  const strafe = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
  if (!forward && !strafe) {
    state.keyboard.lastWalkAt = now;
    return;
  }

  const dt = Math.min(48, Math.max(12, now - (state.keyboard.lastWalkAt || now)));
  state.keyboard.lastWalkAt = now;
  const yaw = state.camera.yaw;
  const forwardVec = [-Math.sin(yaw), 0, -Math.cos(yaw)];
  const rightVec = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const speed = 0.0032 * dt;
  state.camera.target[0] += (forwardVec[0] * forward + rightVec[0] * strafe) * speed;
  state.camera.target[2] += (forwardVec[2] * forward + rightVec[2] * strafe) * speed;

  if (now - state.keyboard.lastFeedbackAt > 220) {
    const label = Array.from(keys).map(key => key.toUpperCase()).join("+");
    ui.pinchStatus.textContent = label;
    setGestureFeedback(t("keyboardWalking"), t("keyboardWalkingDetail", label), "hand");
    state.keyboard.lastFeedbackAt = now;
  }
}

function render(now) {
  resizeCanvas();
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.047, 0.051, 0.063, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.DEPTH_TEST);

  applyKeyboardWalk(now);
  gl.useProgram(program);
  bindAttributes();
  gl.uniformMatrix4fv(uniforms.viewProj, false, computeViewProjection());
  gl.uniform1f(uniforms.pixelRatio, window.devicePixelRatio || 1);
  gl.uniform1f(uniforms.baseSize, 5.8);
  gl.drawArrays(gl.POINTS, 0, state.points.count);

  state.fpsFrames++;
  if (now - state.fpsTime > 600) {
    ui.fpsCounter.textContent = Math.round((state.fpsFrames * 1000) / (now - state.fpsTime));
    state.fpsFrames = 0;
    state.fpsTime = now;
  }

  if (state.recording.active) {
    composeRecordingFrame();
  }

  if (!state.thumbnailReady) {
    updateSceneThumbnail();
  }

  requestAnimationFrame(render);
}

function composeRecordingFrame() {
  const recCanvas = state.recording.canvas;
  if (!state.recording.ctx) state.recording.ctx = recCanvas.getContext("2d");
  const ctx = state.recording.ctx;
  if (!ctx) return;

  if (recCanvas.width !== canvas.width || recCanvas.height !== canvas.height) {
    recCanvas.width = canvas.width;
    recCanvas.height = canvas.height;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, recCanvas.width, recCanvas.height);
  ctx.drawImage(canvas, 0, 0, recCanvas.width, recCanvas.height);
  drawRecordingHud(ctx, recCanvas.width, recCanvas.height);
  drawRecordingCameraInset(ctx, recCanvas.width, recCanvas.height);
}

function drawRecordingHud(ctx, width, height) {
  const ratio = window.devicePixelRatio || 1;
  const pad = Math.round(18 * ratio);
  const boxWidth = Math.round(Math.min(width * 0.34, 380 * ratio));
  const boxHeight = Math.round(86 * ratio);
  const accent = characterAccent();
  const name = normalizedPlayerName() || t("anonymous");
  const score = state.competition.active ? state.competition.score : state.competition.bestScore;
  ctx.save();
  roundedRectPath(ctx, pad, pad, boxWidth, boxHeight, Math.round(10 * ratio));
  ctx.fillStyle = "rgba(10, 12, 16, 0.68)";
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(2, 2 * ratio);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = `${Math.round(13 * ratio)}px Segoe UI, sans-serif`;
  ctx.fillText(state.roam.active ? t("roamMode") : t("videoHudMode"), pad + 14 * ratio, pad + 24 * ratio);
  ctx.fillStyle = "#f2f4f7";
  ctx.font = `900 ${Math.round(24 * ratio)}px Segoe UI, sans-serif`;
  ctx.fillText(name, pad + 14 * ratio, pad + 52 * ratio);
  ctx.fillStyle = "rgba(242, 244, 247, 0.78)";
  ctx.font = `800 ${Math.round(12 * ratio)}px Segoe UI, sans-serif`;
  ctx.fillText(state.competition.active ? t("videoHudScore", score) : t("videoHudBest", score), pad + 14 * ratio, pad + 74 * ratio);
  ctx.restore();
}

function drawRecordingCameraInset(ctx, width, height) {
  if (!state.gesture.cameraOn || !ui.cameraPreview.srcObject || ui.cameraPreview.readyState < 2) return;

  const insetWidth = Math.round(Math.min(width * 0.26, 340 * (window.devicePixelRatio || 1)));
  const insetHeight = Math.round(insetWidth * 0.75);
  const margin = Math.round(Math.max(18, width * 0.018));
  const x = width - insetWidth - margin;
  const y = height - insetHeight - margin;
  const radius = Math.round(Math.max(10, insetWidth * 0.035));

  ctx.save();
  roundedRectPath(ctx, x, y, insetWidth, insetHeight, radius);
  ctx.fillStyle = "rgba(8, 10, 13, 0.82)";
  ctx.fill();
  ctx.clip();
  ctx.translate(x + insetWidth, y);
  ctx.scale(-1, 1);
  ctx.drawImage(ui.cameraPreview, 0, 0, insetWidth, insetHeight);
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.drawImage(ui.handOverlay, 0, 0, insetWidth, insetHeight);
  ctx.restore();

  ctx.save();
  roundedRectPath(ctx, x, y, insetWidth, insetHeight, radius);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
  ctx.lineWidth = Math.max(2, width * 0.0018);
  ctx.stroke();
  ctx.restore();
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
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
    setGestureFeedback(t("uploadFirst"), t("uploadFirstDetail"), "");
    return;
  }
  const name = normalizedPlayerName();
  if (!name) {
    showToast(t("enterNameStart"));
    ui.playerName.focus();
    return;
  }
  if (state.competition.triesLeft <= 0) {
    setGestureFeedback(t("noTries"), t("noTriesDetail"), "");
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
  state.competition.lastCoverage = 0;
  state.competition.lastVariety = 0;
  state.competition.lastRhythmScore = 0;
  state.competition.lastSpatialPlay = 0;
  state.competition.lastEditAt = 0;
  state.competition.submitted = false;

  ui.competitionPill.textContent = t("ready");
  setCompetitionButtons(true, t("getReadyButton"));
  ui.competitionScore.textContent = "0";
  ui.competitionTimer.textContent = "15.0";
  ui.stageTimer.textContent = "15.0";
  ui.competitionBreakdown.textContent = breakdownText(0, 0, 0);
  setGestureFeedback(t("getReady"), t("getReadyDetail"), "pinch");
  await runPreStartCountdown();
  state.competition.preparing = false;
  state.competition.active = true;
  state.competition.startedAt = performance.now();
  ui.competitionPill.textContent = t("live");
  setCompetitionButtons(true, t("running"));
  setGestureFeedback(t("go"), t("goDetail"), "pinch");
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
  c.lastCoverage = coverage;
  c.lastVariety = variety;
  c.lastRhythmScore = rhythm;
  c.lastSpatialPlay = spatialPlay;
  c.score = Math.round(coverage + variety + rhythm + spatialPlay);

  ui.competitionScore.textContent = c.score.toLocaleString();
  ui.competitionBreakdown.textContent = breakdownText(coverage, variety, rhythm);
}

async function finishCompetition() {
  const c = state.competition;
  c.active = false;
  cancelAnimationFrame(c.raf);
  c.triesLeft = Math.max(0, c.triesLeft - 1);
  ui.competitionTimer.textContent = "0.0";
  ui.gameCountdown.classList.remove("is-visible");
  ui.competitionPill.textContent = t("done");
  setCompetitionButtons(c.triesLeft <= 0, c.triesLeft > 0 ? t("startNextTry") : t("noTries"));

  const previousBest = c.bestScore;
  const delta = c.score - previousBest;
  let scores = [];
  if (c.score > c.bestScore) {
    c.bestScore = c.score;
    showScoreFx(`+${delta.toLocaleString()}`, "up");
    updateTryUi();
    setGestureFeedback(t("newBest"), t("newBestDetail", c.bestScore), "hand");
    scores = await submitScore();
  } else {
    showScoreFx(`-${Math.abs(delta).toLocaleString()}`, "down");
    updateTryUi();
    setGestureFeedback(t("tryEnded"), t("tryEndedDetail", c.score, c.bestScore), "");
    scores = await loadLeaderboard();
  }
  showTryResult(delta, scores);
}

function updateTryUi() {
  ui.triesLeft.textContent = triesLeftText(state.competition.triesLeft);
  ui.bestScore.textContent = bestText(state.competition.bestScore);
  ui.competitionPill.textContent = state.competition.triesLeft > 0 ? triesText(state.competition.triesLeft) : t("done");
  const canStart = state.mode === "game" && state.roomSceneLoaded && state.competition.triesLeft > 0 && !state.competition.active && !state.competition.preparing;
  setCompetitionButtons(!canStart, canStart ? t("startTry") : state.competition.triesLeft > 0 ? t("uploadFirst") : t("noTries"));
}

function showTryResult(delta, scores) {
  ui.resultScore.textContent = state.competition.score.toLocaleString();
  ui.resultDelta.textContent = delta > 0
    ? t("newBestDelta", delta)
    : t("belowBest", delta);
  ui.resultTitle.textContent = performanceTitle();
  ui.resultAwards.innerHTML = [
    [t("coverage"), state.competition.lastCoverage],
    [t("variety"), state.competition.lastVariety],
    [t("rhythm"), state.competition.lastRhythmScore]
  ].map(([label, value]) => `<span>${label} ${Math.round(value)}</span>`).join("");
  ui.resultTries.textContent = triesLeftText(state.competition.triesLeft);
  ui.resultBest.textContent = bestText(state.competition.bestScore);
  ui.resultNextTry.disabled = state.competition.triesLeft <= 0;
  ui.resultNextTry.textContent = state.competition.triesLeft > 0 ? t("nextTry") : t("allTriesUsed");
  ui.resultLeaderboard.innerHTML = leaderboardMarkup(scores);
  ui.tryResultModal.classList.add("is-visible");
}

function performanceTitle() {
  const c = state.competition;
  if (c.tools.has("hammer") || c.lastRhythmScore > 230) return t("titleSmash");
  if (c.lastSpatialPlay > 130) return t("titleSpatial");
  if (c.lastRhythmScore > c.lastCoverage && c.lastRhythmScore > c.lastVariety) return t("titleRhythm");
  if (c.lastCoverage > 280 && c.lastVariety < 120) return t("titleSoft");
  return t("titleChaos");
}

function hideTryResult() {
  ui.tryResultModal.classList.remove("is-visible");
}

function showScoreFx(text, direction) {
  ui.scoreFx.textContent = text;
  ui.scoreFx.classList.remove("is-up", "is-down", "is-visible");
  ui.scoreFx.classList.add(direction === "up" ? "is-up" : "is-down", "is-visible");
  ui.scoreFx.style.setProperty("--fx-color", characterAccent());
  if (direction === "up") shakeStage(420);
  window.setTimeout(() => ui.scoreFx.classList.remove("is-visible"), 1200);
}

function triggerImpactFx(label = "SMASH") {
  const rect = canvas.getBoundingClientRect();
  const x = ((state.activeNdc[0] + 1) * 0.5) * rect.width;
  const y = ((1 - state.activeNdc[1]) * 0.5) * rect.height;
  const wave = document.createElement("div");
  wave.className = "impact-wave";
  wave.textContent = label;
  wave.style.left = `${x}px`;
  wave.style.top = `${y}px`;
  wave.style.setProperty("--impact-color", characterAccent());
  ui.stage.appendChild(wave);
  window.setTimeout(() => wave.remove(), 760);
  shakeStage(560);
}

function shakeStage(duration = 360) {
  window.clearTimeout(state.fx.shakeTimer);
  ui.stage.classList.add("is-shaking");
  state.fx.shakeTimer = window.setTimeout(() => ui.stage.classList.remove("is-shaking"), duration);
}

async function submitScore() {
  const name = ui.playerName.value.trim() || t("anonymous");
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
    setGestureFeedback(t("scoreSubmitted"), t("scoreSubmittedDetail", name, state.competition.bestScore), "hand");
    return payload.scores || [];
  } catch (error) {
    setGestureFeedback(t("scoreSavedLocal"), t("scoreSavedLocalDetail"), "");
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
    ui.leaderboard.innerHTML = `<li><span>-</span><strong>${t("noRanking")}</strong><em>0</em></li>`;
    return [];
  }
}

function renderLeaderboard(scores) {
  state.leaderboard = scores || [];
  ui.leaderboard.innerHTML = leaderboardMarkup(scores);
}

function leaderboardMarkup(scores) {
  if (!scores.length) {
    return `<li><span>-</span><strong>${t("noScores")}</strong><em>0</em></li>`;
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
    ui.cameraToggle.textContent = t("starting");
    ui.cameraToggle.disabled = true;
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
    ui.cameraPreview.srcObject = stream;
    await ui.cameraPreview.play();
    state.gesture.cameraOn = true;
    ui.cameraEmpty.classList.add("is-hidden");
    ui.cameraToggle.textContent = t("loadingTracking");
    ui.cameraToggle.disabled = true;
    ui.cameraStop.disabled = false;
    ui.gesturePill.textContent = t("camera");
    ui.interactionState.textContent = t("cameraLoadingState");
    setGestureFeedback(t("cameraOnTitle"), t("loadingModels"), "hand");
    await setupHandLandmarker();
    if (!state.gesture.cameraOn) return;
    ui.cameraToggle.textContent = t("cameraOn");
    ui.cameraToggle.disabled = true;
    ui.gesturePill.textContent = t("pinchReady");
    ui.interactionState.textContent = t("pinchInstruction");
    setGestureFeedback(t("showOneHand"), t("pinchStartDetail"), "hand");
    requestAnimationFrame(trackHands);
  } catch (error) {
    state.gesture.loading = false;
    state.gesture.ready = Boolean(state.gesture.landmarker);
    stopCameraMode();
    ui.cameraToggle.textContent = t("startCamera");
    ui.cameraToggle.disabled = false;
    ui.gesturePill.textContent = t("simulator");
    ui.interactionState.textContent = t("cameraFailed");
    setGestureFeedback(t("cameraUnavailable"), t("shiftDragSim"), "");
  }
}

function stopCameraMode() {
  if (state.roam.active) exitRoamMode();
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
  ui.cameraToggle.textContent = t("startCamera");
  ui.cameraToggle.disabled = false;
  ui.cameraStop.disabled = true;
  ui.gesturePill.textContent = t("simulator");
  ui.handStatus.textContent = t("handNotTracked");
  ui.pinchStatus.textContent = t("openHand");
  ui.pinchMeter.style.width = "0%";
  ui.gestureHud.classList.remove("is-active");
  ui.reticle.classList.remove("is-visible");
  ui.interactionState.textContent = t("cameraStopped");
  setGestureFeedback(t("cameraOffTitle"), t("realGestures"), "");
}

function toggleRecording() {
  if (state.recording.active) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  if (!state.recording.canvas.captureStream || typeof MediaRecorder === "undefined") {
    ui.recordMeta.textContent = t("recordUnsupported");
    return;
  }

  if (state.recording.url) {
    URL.revokeObjectURL(state.recording.url);
  }

  composeRecordingFrame();
  const stream = state.recording.canvas.captureStream(30);
  const mimeType = chooseRecordingMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  state.recording.active = true;
  state.recording.recorder = recorder;
  state.recording.chunks = [];
  state.recording.blob = null;
  state.recording.url = "";
  state.recording.startedAt = Date.now();

  ui.recordPill.textContent = t("recording");
  setButtonTrailingText(ui.recordToggle, t("stop"));
  ui.recordToggle.classList.add("is-recording");
  ui.recordDownload.disabled = true;
  ui.recordShare.disabled = true;
  ui.recordPreview.classList.remove("is-visible");
  ui.recordPreview.removeAttribute("src");
  ui.recordMeta.textContent = t("recordingNow");

  recorder.addEventListener("dataavailable", event => {
    if (event.data && event.data.size > 0) {
      state.recording.chunks.push(event.data);
    }
  });

  recorder.addEventListener("stop", finalizeRecording);
  recorder.start(250);
}

function toggleRoamMode() {
  if (state.roam.active) {
    exitRoamMode();
  } else {
    enterRoamMode();
  }
}

function enterRoamMode() {
  endGesture();
  bakeFreeViewIntoCamera();
  state.mode = "studio";
  document.body.classList.add("studio-mode");
  document.body.classList.remove("game-mode");
  state.roam.active = true;
  state.roam.lookActive = false;
  state.roam.lastMoveAt = performance.now();
  state.roam.savedCamera = {
    yaw: state.camera.yaw,
    pitch: state.camera.pitch,
    distance: state.camera.distance,
    target: [...state.camera.target]
  };
  ui.reticle.classList.remove("is-visible");
  ui.stage.classList.add("is-roaming");
  ui.studioModeButton.classList.remove("is-active");
  ui.gameModeButton.classList.remove("is-active");
  ui.roamToggle.classList.add("is-active");
  setButtonTrailingText(ui.roamToggle, t("exitRoam"));
  updateStageModePill();
  setGestureFeedback(t("roamOnTitle"), t("roamOnDetail"), "hand");
}

function bakeFreeViewIntoCamera() {
  if (Math.abs(state.freeView.yaw) < 0.0001 && Math.abs(state.freeView.pitch) < 0.0001) return;
  state.camera.yaw -= state.freeView.yaw;
  state.camera.pitch = clamp(state.camera.pitch - state.freeView.pitch, -1.2, 1.2);
  state.freeView.yaw = 0;
  state.freeView.pitch = 0;
}

function exitRoamMode() {
  state.roam.active = false;
  state.roam.lookActive = false;
  state.roam.lastMoveAt = 0;
  ui.stage.classList.remove("is-roaming");
  ui.roamToggle.classList.remove("is-active");
  if (state.mode !== "game") ui.studioModeButton.classList.add("is-active");
  setButtonTrailingText(ui.roamToggle, t("roam"));
  updateStageModePill();
  setGestureFeedback(t("roamOffTitle"), t("roamOffDetail"), "");
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

  ui.recordPill.textContent = t("recorded");
  setButtonTrailingText(ui.recordToggle, t("again"));
  ui.recordToggle.classList.remove("is-recording");
  ui.recordDownload.disabled = false;
  ui.recordShare.disabled = !canShareRecording(blob);
  ui.recordPreview.src = url;
  ui.recordPreview.classList.add("is-visible");
  ui.recordMeta.textContent = t("videoReady", duration);
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
    ui.recordMeta.textContent = t("shareUnavailable");
    return;
  }

  try {
    await navigator.share({
      files: [file],
      title: "PinchGS demo",
      text: "Gesture-edited 3D Gaussian scene demo."
    });
    ui.recordMeta.textContent = t("shared");
  } catch (error) {
    ui.recordMeta.textContent = t("shareCancelled");
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

function updateSceneThumbnail() {
  if (!ui.sceneThumb) return;
  const ctx = ui.sceneThumb.getContext("2d");
  const size = 96;
  ui.sceneThumb.width = size;
  ui.sceneThumb.height = size;
  ctx.clearRect(0, 0, size, size);
  try {
    ctx.drawImage(canvas, 0, 0, size, size);
  } catch {
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#62d3ff");
    gradient.addColorStop(1, "#77e08f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  ui.dropZone.classList.add("has-scene");
  state.thumbnailReady = true;
}

async function setupHandLandmarker() {
  if (state.gesture.recognizer || state.gesture.landmarker || state.gesture.loading) return;
  state.gesture.loading = true;
  const { FilesetResolver, GestureRecognizer, HandLandmarker, FaceLandmarker } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs");
  const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm");
  const gestureOptions = delegate => ({
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
      delegate
    },
    runningMode: "VIDEO",
    numHands: 2,
    minHandDetectionConfidence: 0.45,
    minHandPresenceConfidence: 0.45,
    minTrackingConfidence: 0.45
  });
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
    state.gesture.recognizer = await GestureRecognizer.createFromOptions(vision, gestureOptions("GPU"));
  } catch (error) {
    try {
      state.gesture.recognizer = await GestureRecognizer.createFromOptions(vision, gestureOptions("CPU"));
    } catch {
      try {
        state.gesture.landmarker = await HandLandmarker.createFromOptions(vision, handOptions("GPU"));
      } catch {
        state.gesture.landmarker = await HandLandmarker.createFromOptions(vision, handOptions("CPU"));
      }
    }
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
      const results = state.gesture.recognizer
        ? state.gesture.recognizer.recognizeForVideo(ui.cameraPreview, timestamp)
        : state.gesture.landmarker.detectForVideo(ui.cameraPreview, timestamp);
      handleHandResults(results);
    } catch (error) {
      ui.handStatus.textContent = t("trackingError");
      ui.pinchStatus.textContent = t("checkConsole");
      setGestureFeedback(t("trackingPaused"), error.message || t("handTrackingFailed"), "");
    }
  }

  requestAnimationFrame(trackHands);
}

function handleHandResults(results) {
  const hands = getHandLandmarks(results);
  state.handedness = getPrimaryHandedness(results);
  state.recognizedGesture = getPrimaryGesture(results);
  const hand = hands[0] || null;
  drawHandOverlay(hands);

  if (!hand) {
    state.gesture.framesWithoutHand++;
    ui.handStatus.textContent = t("handNotTracked");
    ui.pinchStatus.textContent = t("openHand");
    ui.pinchMeter.style.width = "0%";
    ui.gestureHud.classList.remove("is-active");
    const detail = state.gesture.framesWithoutHand > 30
      ? t("modelRunningNoHand")
      : t("placeHand");
    setGestureFeedback(t("lookingForHand"), detail, "");
    endGesture(t("showHandCamera"));
    return;
  }
  state.gesture.framesWithoutHand = 0;

  const thumbTip = hand[4];
  const indexTip = hand[8];
  const wrist = hand[0];
  const indexMcp = hand[5];
  if (!thumbTip || !indexTip || !wrist || !indexMcp) {
    resetTransformGestures();
    setGestureFeedback(t("handVisible"), t("completeLandmarks"), "hand");
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
  ui.handStatus.textContent = t("handVisible");
  ui.pinchStatus.textContent = state.gesture.active ? t("pinching") : t("openHand");
  ui.pinchMeter.style.width = `${Math.round(pinchAmount * 100)}%`;
  ui.gestureHud.classList.toggle("is-active", state.gesture.active);

  if (handleModeSwitchGesture(hand)) {
    return;
  }

  if (handleViewResetGesture()) {
    return;
  }

  const fistDetected = isFist(hand);
  if (state.roam.active) {
    handleRoamGesture({ hands, hand, midpoint, pinchRatio, fistDetected });
    return;
  }

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
    endGesture(t("pinchReleased"));
  } else if (pinchRatio > 0.95) {
    handleOpenPalmRotate(hand);
  } else {
    resetTransformGestures();
    ui.interactionState.textContent = t("pinchMeter", Math.round(pinchAmount * 100));
    setGestureFeedback(t("handVisible"), t("handVisibleDetail"), "hand");
  }
}

function getHandLandmarks(results) {
  const landmarks = results.landmarks || results.handLandmarks || [];
  return landmarks;
}

function getPrimaryHandedness(results) {
  const item = (results.handednesses || results.handedness || [])[0];
  const category = Array.isArray(item) ? item[0] : item;
  return category?.categoryName || category?.displayName || "";
}

function getPrimaryGesture(results) {
  const item = (results.gestures || [])[0];
  const category = Array.isArray(item) ? item[0] : item;
  return category?.categoryName || "";
}

function handleModeSwitchGesture(hand) {
  const now = performance.now();
  const ok = isOkGesture(hand);
  if (!ok) {
    state.modeSwitch.okStartedAt = 0;
    state.modeSwitch.target = "";
    return false;
  }

  if (now < state.modeSwitch.cooldownUntil) {
    return true;
  }

  if (state.gesture.active) endGesture();
  resetTransformGestures();

  if (!state.modeSwitch.okStartedAt) {
    state.modeSwitch.okStartedAt = now;
    state.modeSwitch.target = state.roam.active ? "free" : "walk";
  }

  const progress = clamp((now - state.modeSwitch.okStartedAt) / 1000, 0, 1);
  const percent = Math.round(progress * 100);
  const goingToWalk = state.modeSwitch.target === "walk";
  ui.gestureHud.classList.add("is-active");
  ui.handStatus.textContent = t("okGesture");
  ui.pinchStatus.textContent = goingToWalk ? t("switchingToWalk") : t("switchingToFree");
  ui.pinchMeter.style.width = `${percent}%`;
  setGestureFeedback(t("modeSwitchHold"), t("modeSwitchDetail", percent), "pinch");

  if (progress >= 1) {
    if (goingToWalk) {
      enterRoamMode();
    } else {
      exitRoamMode();
    }
    state.modeSwitch.okStartedAt = 0;
    state.modeSwitch.target = "";
    state.modeSwitch.cooldownUntil = now + 1800;
    ui.pinchMeter.style.width = "0%";
  }

  return true;
}

function handleViewResetGesture() {
  const now = performance.now();
  if (state.recognizedGesture !== "Thumb_Up") {
    state.viewReset.startedAt = 0;
    return false;
  }

  if (now < state.viewReset.cooldownUntil) {
    return true;
  }

  if (!state.viewReset.startedAt) {
    state.viewReset.startedAt = now;
  }

  const progress = clamp((now - state.viewReset.startedAt) / 800, 0, 1);
  const percent = Math.round(progress * 100);
  ui.gestureHud.classList.add("is-active");
  ui.handStatus.textContent = t("resetView");
  ui.pinchStatus.textContent = t("resetViewHold");
  ui.pinchMeter.style.width = `${percent}%`;
  setGestureFeedback(t("resetViewHold"), t("resetViewDetail", percent), "hand");

  if (progress >= 1) {
    resetView();
    state.viewReset.startedAt = 0;
    state.viewReset.cooldownUntil = now + 1600;
    ui.pinchMeter.style.width = "0%";
    setGestureFeedback(t("resetViewDone"), t("studioReady"), "hand");
  }

  return true;
}

function resetView() {
  state.camera.yaw = -0.48;
  state.camera.pitch = 0.32;
  state.camera.distance = 4.2;
  state.camera.target = [0, 0, 0];
  state.freeView.yaw = 0;
  state.freeView.pitch = 0;
  resetTransformGestures();
  ui.reticle.classList.remove("is-visible");
  ui.interactionState.textContent = t("resetViewDone");
}

function isOkGesture(hand) {
  if (!hand || !hand[0] || !hand[4] || !hand[5] || !hand[8] || !hand[10] || !hand[12] || !hand[14] || !hand[16] || !hand[18] || !hand[20]) {
    return false;
  }
  const palmSize = Math.max(landmarkDistance(hand[0], hand[5]), 0.04);
  const thumbIndex = landmarkDistance(hand[4], hand[8]) / palmSize;
  const extended = [12, 16, 20].filter(tipIndex => {
    const pipIndex = tipIndex - 2;
    return landmarkDistance(hand[tipIndex], hand[0]) > landmarkDistance(hand[pipIndex], hand[0]) * 1.08;
  }).length;
  const spread = Math.max(landmarkDistance(hand[12], hand[16]), landmarkDistance(hand[16], hand[20])) / palmSize;
  return thumbIndex < 0.48 && extended >= 2 && spread > 0.28;
}

function handleRoamGesture({ hands, hand, midpoint, pinchRatio, fistDetected }) {
  endGesture();
  ui.reticle.classList.remove("is-visible");
  ui.gestureHud.classList.add("is-active");

  if (pinchRatio < 0.62) {
    handleRoamLook(midpoint);
    return;
  }
  state.roam.lookActive = false;

  const palm = palmCenter(hand);
  if (!palm) return;
  const now = performance.now();
  const dt = Math.min(48, Math.max(12, now - (state.roam.lastMoveAt || now)));
  state.roam.lastMoveAt = now;

  const moveX = 0;
  const moveZ = walkGestureMoveZ(hands);
  const speed = 0.0026 * dt;
  const yaw = state.camera.yaw;
  const forwardVec = [-Math.sin(yaw), 0, -Math.cos(yaw)];
  const rightVec = [Math.cos(yaw), 0, -Math.sin(yaw)];
  state.camera.target[0] += (forwardVec[0] * moveZ + rightVec[0] * moveX) * speed;
  state.camera.target[2] += (forwardVec[2] * moveZ + rightVec[2] * moveX) * speed;

  const moving = Math.abs(moveX) + Math.abs(moveZ) > 0;
  const direction = roamDirectionLabel(moveX, moveZ);
  ui.pinchStatus.textContent = moving ? direction : `${t("roamIdle")} · ${state.recognizedGesture || "None"}`;
  setGestureFeedback(moving ? direction : t("roamMoving"), moving ? t("roamMovingDetail") : t("roamOnDetail"), "hand");
}

function roamDirectionLabel(moveX, moveZ) {
  return moveZ >= 0 ? t("roamForward") : t("roamBackward");
}

function walkGestureMoveZ(hands) {
  if (hands.length >= 2) return -1;
  if (state.recognizedGesture === "Open_Palm") return 1;
  return 0;
}

function handleRoamLook(midpoint) {
  const point = cameraLandmarkToCanvas(midpoint);
  if (!state.roam.lookActive) {
    state.roam.lookActive = true;
    state.roam.lastLookX = point.x;
    state.roam.lastLookY = point.y;
    ui.pinchStatus.textContent = t("roamLooking");
    setGestureFeedback(t("roamLooking"), t("roamHint"), "pinch");
    return;
  }

  const dx = point.x - state.roam.lastLookX;
  const dy = point.y - state.roam.lastLookY;
  state.roam.lastLookX = point.x;
  state.roam.lastLookY = point.y;
  state.camera.yaw += dx * 0.0065;
  state.camera.pitch = clamp(state.camera.pitch + dy * 0.0045, -1.2, 1.2);
  ui.pinchStatus.textContent = t("roamLooking");
}

function twoHandRoamBoost(hands) {
  const a = palmCenter(hands[0]);
  const b = palmCenter(hands[1]);
  if (!a || !b) return 1;
  const distance = Math.hypot(a.x - b.x, a.y - b.y);
  return distance > 0.42 ? 2.15 : 1;
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
  ui.pinchStatus.textContent = t("pinching");
  ui.gestureHud.classList.add("is-active");
  setGestureFeedback(t("pinchLocked"), t("pinchLockedDetail"), "pinch");
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
    setGestureFeedback(t("rotateMode"), t("rotateModeDetail"), "hand");
    return;
  }

  const dx = palm.x - state.gesture.lastPalmX;
  const dy = palm.y - state.gesture.lastPalmY;
  state.gesture.lastPalmX = palm.x;
  state.gesture.lastPalmY = palm.y;
  state.freeView.yaw -= dx * 3.2;
  state.freeView.pitch = clamp(state.freeView.pitch - dy * 2.0, -0.85, 0.85);
  ui.pinchStatus.textContent = t("rotating");
  ui.interactionState.textContent = t("rotatingState");
  setGestureFeedback(t("rotating"), t("rotatingDetail"), "hand");
}

function handleTwoHandZoom(hands) {
  const a = palmCenter(hands[0]);
  const b = palmCenter(hands[1]);
  if (!a || !b) return;
  const distance = Math.hypot(a.x - b.x, a.y - b.y);

  if (!state.gesture.zoomActive) {
    state.gesture.zoomActive = true;
    state.gesture.lastHandDistance = distance;
    setGestureFeedback(t("zoomMode"), t("zoomModeDetail"), "hand");
    return;
  }

  const delta = distance - state.gesture.lastHandDistance;
  state.gesture.lastHandDistance = distance;
  state.camera.distance = clamp(state.camera.distance * (1 - delta * 1.8), 0.8, 20);
  ui.pinchStatus.textContent = t("zooming");
  ui.interactionState.textContent = t("zoomingState");
  setGestureFeedback(t("zooming"), t("zoomingDetail"), "hand");
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
    if (now - state.gesture.lastHammerAt > 420) {
      state.gesture.lastHammerAt = now;
      const point = cameraLandmarkToCanvas(palm);
      setGestureWorldPoint(point.x, point.y);
      applyHammerSmash(0, 0.05);
    } else {
      ui.pinchStatus.textContent = t("fistReady");
      setGestureFeedback(t("fistReadyTitle"), t("fistReadyDetail"), "hand");
    }
    return;
  }

  const dx = palm.x - state.gesture.lastFistX;
  const dy = palm.y - state.gesture.lastFistY;
  state.gesture.lastFistX = palm.x;
  state.gesture.lastFistY = palm.y;

  if (dy > 0.024 && now - state.gesture.lastHammerAt > 360) {
    state.gesture.lastHammerAt = now;
    const point = cameraLandmarkToCanvas(palm);
    setGestureWorldPoint(point.x, point.y);
    applyHammerSmash(dx, dy);
  } else {
    ui.interactionState.textContent = t("fistDetected");
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
  ui.pinchStatus.textContent = t("hammer");
  ui.interactionState.textContent = t("hammerState", selected);
  setGestureFeedback(t("hammerSmash"), t("hammerDetail", selected), "pinch");
  triggerImpactFx("SMASH");
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

function setGameRulesStep(step) {
  state.gameRulesStep = clamp(Math.round(step), 1, 3);
  updateGameRulesStep();
}

function updateGameRulesStep() {
  if (!ui.gameRulesModal || !ui.gameRulesGotIt) return;
  const step = state.gameRulesStep || 1;
  const card = ui.gameRulesModal.querySelector(".game-rules-card");
  if (card) card.dataset.step = String(step);
  ui.gameRulesModal.querySelectorAll("[data-rules-step]").forEach(section => {
    section.classList.toggle("is-active", Number(section.dataset.rulesStep) === step);
  });
  ui.gameRulesModal.querySelectorAll("[data-rules-step-dot]").forEach(dot => {
    dot.classList.toggle("is-active", Number(dot.dataset.rulesStepDot) === step);
    dot.classList.toggle("is-complete", Number(dot.dataset.rulesStepDot) < step);
  });
  if (ui.gameRulesBack) {
    ui.gameRulesBack.hidden = step === 1;
  }
  if (step === 1) {
    ui.gameRulesGotIt.disabled = false;
    ui.gameRulesGotIt.textContent = t("nextScene");
  } else if (step === 2) {
    ui.gameRulesGotIt.disabled = !state.roomSceneLoaded;
    ui.gameRulesGotIt.textContent = state.roomSceneLoaded ? t("nextName") : t("chooseSceneToContinue");
  } else {
    ui.gameRulesGotIt.disabled = false;
    ui.gameRulesGotIt.textContent = t("enterChallenge");
  }
}

function handleGameRulesPrimary() {
  if (state.gameRulesStep === 1) {
    setGameRulesStep(state.roomSceneLoaded ? 3 : 2);
    return;
  }
  if (state.gameRulesStep === 2) {
    if (!state.roomSceneLoaded) {
      showToast(t("chooseSceneToContinue"));
      return;
    }
    setGameRulesStep(3);
    return;
  }
  normalizedPlayerName();
  hideGameRules();
}

function showGameRules() {
  setGameRulesStep(state.roomSceneLoaded ? 3 : 1);
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

  if (state.mask === "thanos") {
    drawThanosMask(ctx, cx, cy, size);
  } else if (state.mask === "ironMan") {
    drawIronManMask(ctx, cx, cy, size);
  } else if (state.mask === "joker") {
    drawJokerMask(ctx, cx, cy, size);
  } else if (state.mask === "pixelFace") {
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

function drawThanosMask(ctx, cx, cy, size) {
  ctx.fillStyle = "rgba(111, 81, 158, 0.94)";
  ctx.strokeStyle = "rgba(229, 185, 78, 0.98)";
  roundedMask(ctx, cx, cy + size * 0.03, size * 0.92, size * 1.1);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(229, 185, 78, 0.95)";
  ctx.fillRect(cx - size * 0.38, cy - size * 0.54, size * 0.76, size * 0.12);
  ctx.fillRect(cx - size * 0.08, cy - size * 0.64, size * 0.16, size * 0.24);
  ctx.strokeStyle = "rgba(54, 38, 84, 0.78)";
  ctx.lineWidth = size * 0.035;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * size * 0.09, cy - size * 0.28);
    ctx.lineTo(cx + i * size * 0.045, cy + size * 0.34);
    ctx.stroke();
  }
  drawEye(ctx, cx - size * 0.18, cy - size * 0.07, size * 0.07, "#ffe9a6");
  drawEye(ctx, cx + size * 0.18, cy - size * 0.07, size * 0.07, "#ffe9a6");
}

function drawIronManMask(ctx, cx, cy, size) {
  ctx.fillStyle = "rgba(169, 36, 39, 0.96)";
  ctx.strokeStyle = "rgba(255, 204, 91, 0.95)";
  roundedMask(ctx, cx, cy, size * 0.92, size * 1.04);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 204, 91, 0.96)";
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.32, cy - size * 0.42);
  ctx.lineTo(cx + size * 0.32, cy - size * 0.42);
  ctx.lineTo(cx + size * 0.24, cy + size * 0.24);
  ctx.lineTo(cx, cy + size * 0.42);
  ctx.lineTo(cx - size * 0.24, cy + size * 0.24);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(102, 235, 255, 0.96)";
  ctx.fillRect(cx - size * 0.27, cy - size * 0.12, size * 0.2, size * 0.055);
  ctx.fillRect(cx + size * 0.07, cy - size * 0.12, size * 0.2, size * 0.055);
  ctx.fillStyle = "rgba(92, 23, 30, 0.85)";
  ctx.fillRect(cx - size * 0.13, cy + size * 0.26, size * 0.26, size * 0.04);
}

function drawJokerMask(ctx, cx, cy, size) {
  ctx.fillStyle = "rgba(245, 244, 237, 0.95)";
  ctx.strokeStyle = "rgba(77, 178, 102, 0.9)";
  roundedMask(ctx, cx, cy + size * 0.02, size * 0.9, size * 1.02);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(77, 178, 102, 0.96)";
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.43, cy - size * 0.38);
  ctx.quadraticCurveTo(cx - size * 0.16, cy - size * 0.72, cx + size * 0.02, cy - size * 0.45);
  ctx.quadraticCurveTo(cx + size * 0.22, cy - size * 0.72, cx + size * 0.43, cy - size * 0.36);
  ctx.lineTo(cx + size * 0.3, cy - size * 0.5);
  ctx.quadraticCurveTo(cx, cy - size * 0.38, cx - size * 0.3, cy - size * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(202, 35, 65, 0.95)";
  ctx.lineWidth = size * 0.045;
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.13, size * 0.24, 0.14 * Math.PI, 0.86 * Math.PI);
  ctx.stroke();
  drawEye(ctx, cx - size * 0.17, cy - size * 0.09, size * 0.07, "#272a30");
  drawEye(ctx, cx + size * 0.17, cy - size * 0.09, size * 0.07, "#272a30");
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
  const viewProj = multiplyMat4(proj, view);
  return state.roam.active ? viewProj : multiplyMat4(viewProj, freeViewMatrix());
}

function freeViewMatrix() {
  const yaw = state.freeView.yaw;
  const pitch = state.freeView.pitch;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cx = Math.cos(pitch);
  const sx = Math.sin(pitch);
  const yawMatrix = new Float32Array([
    cy, 0, -sy, 0,
    0, 1, 0, 0,
    sy, 0, cy, 0,
    0, 0, 0, 1
  ]);
  const pitchMatrix = new Float32Array([
    1, 0, 0, 0,
    0, cx, sx, 0,
    0, -sx, cx, 0,
    0, 0, 0, 1
  ]);
  return multiplyMat4(yawMatrix, pitchMatrix);
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
