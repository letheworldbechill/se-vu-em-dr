document.addEventListener('DOMContentLoaded', () => {
  /* ---- Splash Fade ---- */
  const splash = document.getElementById('splash');
  if (splash) {
    setTimeout(() => splash.classList.add('fade'), 1600);
    setTimeout(() => splash.remove(), 2600);
  }

  /* ---- DOM Refs ---- */
  const stage = document.getElementById('stage');
  const dotWrap = document.getElementById('dotWrapper');
  const dot = document.getElementById('dot');
  const startStop = document.getElementById('startStop');
  const menuBtn = document.getElementById('menuBtn');
  const menu = document.getElementById('menu');
  const speedRange = document.getElementById('speedRange');
  const speedLabel = document.getElementById('speedLabel');
  const durationSelect = document.getElementById('durationSelect');
  const setsInput = document.getElementById('setsInput');
  const pauseInput = document.getElementById('pauseInput');
  const timerDisplay = document.getElementById('timer');
  const heartbeat = document.getElementById('heartbeat');
  const themeSelect = document.getElementById('themeSelect');
  const darkToggle = document.getElementById('darkToggle');
  const evalModal = document.getElementById('evalModal');
  const continueBtn = document.getElementById('continueBtn');

  /* ---- Audio Context & Stereo Panning ---- */
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioCtx();
  const mediaSource = audioCtx.createMediaElementSource(heartbeat);
  const panner = audioCtx.createStereoPanner();
  mediaSource.connect(panner).connect(audioCtx.destination);

  /* ---- State ---- */
  let running = false;
  let direction = 1;          // 1 = right, -1 = left
  let pos = 0;                // 0…1 across stage
  let lastTimestamp = null;
  let animFrame = null;

  /* Preferences */
  let speedBPM = 60;
  let durationSec = 45;
  let totalSets = 8;
  let pauseSec = 8;
  let currentSet = 1;

  /* Countdown */
  let timerInterval = null;
  let timerSeconds = 0;

  /* ---- Helpers ---- */
  const clampBPM = (bpm) => Math.max(60, bpm);
  const updateSpeedLabel = () => speedLabel.textContent = speedBPM;
  const formatTime = (s) => ('0' + Math.floor(s)).slice(-2);
  const updateTimerDisplay = () => timerDisplay.textContent = `${formatTime(timerSeconds)} s`;

  /* Position the dot */
  const updateDotPos = () => {
    const stageW = stage.clientWidth;
    const dotW = dot.clientWidth;
    const offset = 20;
    const travel = stageW - dotW - offset * 2;
    const x = offset + pos * travel;
    dotWrap.style.transform = `translate(${x}px, -50%)`;
  };

  /* ---- Countdown Logic ---- */
  function startCountdown(sec, onFinish) {
    clearInterval(timerInterval);
    timerSeconds = sec;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      timerSeconds--;
      if (timerSeconds < 0) timerSeconds = 0;   // safety
      updateTimerDisplay();
      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        onFinish();
      }
    }, 1000);
  }

  /* ---- Audio & Haptics ---- */
  const playBeat = () => {
    heartbeat.currentTime = 0;
    heartbeat.play().catch(() => {});
    if (navigator.vibrate) navigator.vibrate(50);
    panner.pan.value = direction;
  };

  let beatTimer = null;

  function startBeatLoop() {
    stopBeatLoop();
    playBeat();                                      // first beat immediately
    const interval = 60000 / speedBPM;
    beatTimer = setInterval(playBeat, interval);
  }

  function stopBeatLoop() {
    if (beatTimer) {
      clearInterval(beatTimer);
      beatTimer = null;
    }
    heartbeat.pause();
    heartbeat.currentTime = 0;
  }

  /* ---- Sequencer ---- */
  function startSet() {
    startBeatLoop();
    startCountdown(durationSec, onSetComplete);
  }

  function onSetComplete() {
    stopBeatLoop();
    if (currentSet >= totalSets) {
      stopSession();                                 // finished all sets
      return;
    }
    currentSet++;
    startPause();
  }

  function startPause() {
    startCountdown(pauseSec, startSet);              // ball keeps moving, only beats paused
  }

  /* ---- Main Flow ---- */
  function startSession() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    running = true;
    pos = 0;
    direction = 1;
    currentSet = 1;
    startStop.textContent = 'Stop';
    startSet();
    animFrame = requestAnimationFrame(step);
  }

  function stopSession() {
    running = false;
    startStop.textContent = 'Start';
    stopBeatLoop();
    clearInterval(timerInterval);
    if (animFrame) cancelAnimationFrame(animFrame);
  }

  /* ---- Animation Loop ---- */
  const step = (timestamp) => {
    if (!running) return;
    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    const bps = speedBPM / 60;
    const cycleTime = 2 / bps;               // L–R–L = 2 beats
    const distancePerSec = 2 / cycleTime;    // pos units / sec

    pos += direction * distancePerSec * dt;
    if (pos >= 1) { pos = 1; direction = -1; }
    else if (pos <= 0) { pos = 0; direction = 1; }

    updateDotPos();
    animFrame = requestAnimationFrame(step);
  };

  /* ---- Menu & Inputs ---- */
  menuBtn.addEventListener('click', () => {
    menu.classList.toggle('hidden');
    menu.setAttribute('aria-hidden', menu.classList.contains('hidden'));
  });

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !menuBtn.contains(e.target) && !menu.classList.contains('hidden')) {
      menu.classList.add('hidden');
      menu.setAttribute('aria-hidden', 'true');
    }
  });

  speedRange.addEventListener('input', () => {
    speedBPM = clampBPM(parseInt(speedRange.value, 10));
    updateSpeedLabel();
    if (running) startBeatLoop();
  });

  durationSelect.addEventListener('change', () => durationSec = parseInt(durationSelect.value, 10));
  setsInput.addEventListener('change', () => totalSets = parseInt(setsInput.value, 10));
  pauseInput.addEventListener('change', () => pauseSec = parseInt(pauseInput.value, 10));

  startStop.addEventListener('click', () => running ? stopSession() : startSession());

  /* ---- Init ---- */
  speedBPM = clampBPM(parseInt(speedRange.value, 10));
  updateSpeedLabel();
  updateDotPos();
  window.addEventListener('resize', updateDotPos);
});
