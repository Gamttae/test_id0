/* ============================================================
   3D Interactive Digital ID Card
   — Real-time finger-tracking card flip
   — Google Test Site light theme
   ============================================================ */

(function () {
  'use strict';

  // ─── Configuration ───
  const CONFIG = {
    studentId: '20231234',
    userId: 'honggildong',
    flipRevealStudentId: 2,
    flipRevealUserId: 7,
    loadingDuration: 4000,
    particleCount: 40,
    hintDelayMs: 15000,
  };

  // ─── State ───
  let flipCount = 0;
  let currentRotationY = 0;       // The committed rotation (always multiple of 180)
  let liveRotationY = 0;          // Real-time rotation as finger moves
  let studentIdRevealed = false;
  let userIdRevealed = false;
  let loadingComplete = false;
  let hintTimer = null;
  let hintShown = false;

  // Drag state
  let isDragging = false;
  let isSnapping = false;          // True during snap-back/complete animation
  let dragStartX = 0;
  let dragStartRotation = 0;
  let dragDeltaX = 0;

  // Tilt state (vertical parallax)
  let tiltX = 0;
  let targetTiltX = 0;

  // ─── DOM References ───
  const $overlay = document.getElementById('desktop-overlay');
  const $loading = document.getElementById('loading-screen');
  const $scene = document.getElementById('scene');
  const $terminalBody = document.getElementById('terminal-body');
  const $progressBar = document.getElementById('progress-bar');
  const $card = document.getElementById('card');
  const $cardContainer = document.getElementById('card-container');
  const $bgCanvas = document.getElementById('bg-canvas');
  const $photoCanvas = document.getElementById('photo-canvas');
  const $barcodeCanvas = document.getElementById('barcode-canvas');
  const $studentIdDisplay = document.getElementById('student-id-display');
  const $userIdDisplay = document.getElementById('user-id-display');
  const $hudFlipCount = document.getElementById('hud-flip-count');
  const $hudTime = document.getElementById('hud-time');
  const $flipHint = document.getElementById('flip-hint');

  // ═══════════════════════════════════════════════════════════
  // 1. DEVICE RESTRICTION
  // ═══════════════════════════════════════════════════════════
  function checkDevice() {
    const ua = navigator.userAgent || '';
    const isMobile = /Android|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isNarrow = window.innerWidth <= 768;
    const isPortrait = window.innerHeight > window.innerWidth;

    if (!isMobile && !isNarrow) {
      $overlay.classList.add('active');
    } else if (!isPortrait) {
      $overlay.classList.add('active');
    } else {
      $overlay.classList.remove('active');
    }
  }

  window.addEventListener('resize', checkDevice);
  window.addEventListener('orientationchange', () => setTimeout(checkDevice, 200));
  checkDevice();

  // ═══════════════════════════════════════════════════════════
  // 2. CLI LOADING SEQUENCE
  // ═══════════════════════════════════════════════════════════
  const terminalLines = [
    '> Booting system kernel...',
    '> Loading identity modules...',
    '> Initializing 3D renderer...',
    '> Connecting to secure database...',
    '> Fetching user credentials...',
    '> Decrypting identity payload...',
    '> Verifying certificate chain...',
    '> Applying holographic layer...',
    '> Rendering card surfaces...',
    '> System ready.',
  ];

  let lineIndex = 0;

  function addTerminalLine(text) {
    const div = document.createElement('div');
    div.className = 'terminal-line';
    div.textContent = text;
    $terminalBody.appendChild(div);
    $terminalBody.scrollTop = $terminalBody.scrollHeight;
  }

  function updateProgressBar(pct) {
    const total = 28;
    const filled = Math.round((pct / 100) * total);
    const empty = total - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    $progressBar.textContent = `[${bar}] ${pct}%`;
  }

  function runLoading() {
    const steps = terminalLines.length;
    const interval = CONFIG.loadingDuration / 100;
    let progress = 0;

    const timer = setInterval(() => {
      progress++;
      updateProgressBar(progress);

      const lineThreshold = Math.floor((progress / 100) * steps);
      while (lineIndex < lineThreshold && lineIndex < steps) {
        addTerminalLine(terminalLines[lineIndex]);
        lineIndex++;
      }

      if (progress >= 100) {
        clearInterval(timer);
        while (lineIndex < steps) {
          addTerminalLine(terminalLines[lineIndex]);
          lineIndex++;
        }
        setTimeout(() => {
          $loading.classList.add('fade-out');
          setTimeout(() => {
            $loading.style.display = 'none';
            $scene.classList.add('active');
            loadingComplete = true;
            startBackgroundAnimation();
            startPhotoGlitch();
            startScrambleAnimation();
            startBarcode();
            startHUDClock();
            startHintTimer();
            startTiltLoop();
          }, 900);
        }, 500);
      }
    }, interval);
  }

  runLoading();

  // ═══════════════════════════════════════════════════════════
  // HINT TIMER
  // ═══════════════════════════════════════════════════════════
  function startHintTimer() {
    hintTimer = setTimeout(() => {
      if (flipCount === 0 && !hintShown) {
        showHint();
      }
    }, CONFIG.hintDelayMs);
  }

  function showHint() {
    hintShown = true;
    $flipHint.classList.remove('hidden');
    $flipHint.classList.add('visible');
  }

  function hideHint() {
    $flipHint.classList.remove('visible');
    $flipHint.classList.add('hidden');
    if (hintTimer) {
      clearTimeout(hintTimer);
      hintTimer = null;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 3. DYNAMIC BACKGROUND — Light theme particles
  // ═══════════════════════════════════════════════════════════
  const bgCtx = $bgCanvas.getContext('2d');
  let particles = [];
  let floatingShapes = [];
  let bgAnimId;

  function resizeBgCanvas() {
    $bgCanvas.width = window.innerWidth;
    $bgCanvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = [];
    const w = $bgCanvas.width;
    const h = $bgCanvas.height;

    for (let i = 0; i < CONFIG.particleCount; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() * 0.3 + 0.05) * (Math.random() < 0.5 ? 1 : -1),
        vy: (Math.random() - 0.5) * 0.1,
        r: Math.random() * 1.2 + 0.3,
        alpha: Math.random() * 0.15 + 0.03,
      });
    }

    floatingShapes = [];
    for (let i = 0; i < 4; i++) {
      floatingShapes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.08,
        size: 15 + Math.random() * 25,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.003,
        alpha: 0.04 + Math.random() * 0.04,
        type: Math.floor(Math.random() * 3),
      });
    }
  }

  function drawParticles() {
    const w = $bgCanvas.width;
    const h = $bgCanvas.height;
    bgCtx.clearRect(0, 0, w, h);

    // Floating geometric shapes — dark strokes on light bg
    for (const s of floatingShapes) {
      s.x += s.vx;
      s.y += s.vy;
      s.rotation += s.rotSpeed;

      if (s.x < -50) s.x = w + 50;
      if (s.x > w + 50) s.x = -50;
      if (s.y < -50) s.y = h + 50;
      if (s.y > h + 50) s.y = -50;

      bgCtx.save();
      bgCtx.translate(s.x, s.y);
      bgCtx.rotate(s.rotation);
      bgCtx.strokeStyle = `rgba(0, 0, 0, ${s.alpha})`;
      bgCtx.lineWidth = 0.6;
      bgCtx.beginPath();

      if (s.type === 0) {
        bgCtx.moveTo(0, -s.size/2);
        bgCtx.lineTo(s.size/2, 0);
        bgCtx.lineTo(0, s.size/2);
        bgCtx.lineTo(-s.size/2, 0);
        bgCtx.closePath();
      } else if (s.type === 1) {
        const r = s.size / 2;
        for (let v = 0; v < 3; v++) {
          const angle = (v * Math.PI * 2 / 3) - Math.PI / 2;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (v === 0) bgCtx.moveTo(px, py); else bgCtx.lineTo(px, py);
        }
        bgCtx.closePath();
      } else {
        const r = s.size / 2;
        for (let v = 0; v < 6; v++) {
          const angle = (v * Math.PI * 2 / 6) - Math.PI / 2;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (v === 0) bgCtx.moveTo(px, py); else bgCtx.lineTo(px, py);
        }
        bgCtx.closePath();
      }
      bgCtx.stroke();
      bgCtx.restore();
    }

    // Connecting lines — dark on light
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) {
          bgCtx.beginPath();
          bgCtx.moveTo(particles[i].x, particles[i].y);
          bgCtx.lineTo(particles[j].x, particles[j].y);
          bgCtx.strokeStyle = `rgba(0, 0, 0, ${0.03 * (1 - dist / 80)})`;
          bgCtx.lineWidth = 0.4;
          bgCtx.stroke();
        }
      }
    }

    // Draw dust particles — dark dots
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      bgCtx.fillStyle = `rgba(0, 0, 0, ${p.alpha})`;
      bgCtx.fill();
    }

    bgAnimId = requestAnimationFrame(drawParticles);
  }

  function startBackgroundAnimation() {
    resizeBgCanvas();
    createParticles();
    drawParticles();
  }

  window.addEventListener('resize', () => {
    resizeBgCanvas();
    createParticles();
  });

  // ═══════════════════════════════════════════════════════════
  // 4. 3D CARD INTERACTION — Real-time finger-tracking flip
  // ═══════════════════════════════════════════════════════════

  // Helper: apply transform directly (no transition)
  function setCardTransform(rotY, tX) {
    $card.style.transform = `rotateX(${tX}deg) rotateY(${rotY}deg)`;
  }

  // Enable floating animation
  function enableFloat() {
    $card.style.setProperty('--ry', currentRotationY + 'deg');
    $card.style.transform = '';
    $card.classList.add('floating');
  }

  // Disable floating animation
  function disableFloat() {
    $card.classList.remove('floating');
  }

  // Smooth tilt loop (vertical parallax, runs constantly)
  function startTiltLoop() {
    function loop() {
      tiltX += (targetTiltX - tiltX) * 0.1;
      if (Math.abs(tiltX - targetTiltX) < 0.01) tiltX = targetTiltX;

      // Only apply direct tilt if dragging (not during snap animation or float)
      if (isDragging) {
        setCardTransform(liveRotationY, tiltX);
      }

      requestAnimationFrame(loop);
    }
    loop();
  }

  // ─── TOUCH EVENTS ───
  document.addEventListener('touchstart', (e) => {
    if (!loadingComplete || isSnapping) return;
    const t = e.touches[0];
    dragStartX = t.clientX;
    dragStartRotation = currentRotationY;
    dragDeltaX = 0;
    isDragging = true;

    // Stop floating & snap animations
    disableFloat();
    $card.classList.remove('snap-animating');
    liveRotationY = currentRotationY;
    setCardTransform(liveRotationY, tiltX);
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!loadingComplete || !isDragging || isSnapping) return;

    const t = e.touches[0];
    dragDeltaX = t.clientX - dragStartX;

    // Map horizontal drag to rotation: full screen width ≈ 180°
    const screenW = window.innerWidth;
    const dragRotation = (dragDeltaX / screenW) * 180;
    liveRotationY = dragStartRotation + dragRotation;

    // Vertical tilt (parallax)
    const dragDeltaY = t.clientY - (window.innerHeight / 2);
    targetTiltX = -(dragDeltaY / window.innerHeight) * 12;
    targetTiltX = Math.max(-15, Math.min(15, targetTiltX));

    setCardTransform(liveRotationY, tiltX);
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!loadingComplete || !isDragging || isSnapping) return;
    isDragging = false;
    targetTiltX = 0;

    // Decide: snap to next face or snap back?
    const offset = liveRotationY - dragStartRotation;
    const threshold = 45; // degrees — if dragged past 45° from current face, complete flip

    let targetRotation;
    if (Math.abs(offset) > threshold) {
      // Complete the flip
      if (offset > 0) {
        targetRotation = dragStartRotation + 180; // right swipe
      } else {
        targetRotation = dragStartRotation - 180; // left swipe
      }
      // Count the flip
      flipCount++;
      $hudFlipCount.textContent = flipCount;
      checkReveal();
      if (flipCount >= 1) hideHint();
    } else {
      // Snap back
      targetRotation = dragStartRotation;
    }

    snapToRotation(targetRotation);
  }, { passive: true });

  // ─── MOUSE EVENTS (desktop fallback) ───
  let mouseDown = false;
  let mouseStartX = 0;

  document.addEventListener('mousedown', (e) => {
    if (!loadingComplete || isSnapping) return;
    mouseDown = true;
    mouseStartX = e.clientX;
    dragStartX = e.clientX;
    dragStartRotation = currentRotationY;
    dragDeltaX = 0;
    isDragging = true;

    disableFloat();
    $card.classList.remove('snap-animating');
    liveRotationY = currentRotationY;
    setCardTransform(liveRotationY, tiltX);
  });

  document.addEventListener('mousemove', (e) => {
    if (!mouseDown || !isDragging || isSnapping) return;
    dragDeltaX = e.clientX - dragStartX;
    const screenW = window.innerWidth;
    liveRotationY = dragStartRotation + (dragDeltaX / screenW) * 180;
    setCardTransform(liveRotationY, tiltX);
  });

  document.addEventListener('mouseup', (e) => {
    if (!mouseDown || !isDragging || isSnapping) return;
    mouseDown = false;
    isDragging = false;
    targetTiltX = 0;

    const offset = liveRotationY - dragStartRotation;
    const threshold = 45;
    let targetRotation;

    if (Math.abs(offset) > threshold) {
      targetRotation = offset > 0 ? dragStartRotation + 180 : dragStartRotation - 180;
      flipCount++;
      $hudFlipCount.textContent = flipCount;
      checkReveal();
      if (flipCount >= 1) hideHint();
    } else {
      targetRotation = dragStartRotation;
    }

    snapToRotation(targetRotation);
  });

  // ─── SNAP ANIMATION ───
  function snapToRotation(target) {
    isSnapping = true;
    currentRotationY = target;

    // Apply CSS transition for smooth snap
    $card.classList.add('snap-animating');
    void $card.offsetHeight; // force reflow
    setCardTransform(currentRotationY, 0); // reset tiltX to 0

    function onTransitionDone(e) {
      if (e.propertyName === 'transform') {
        $card.removeEventListener('transitionend', onTransitionDone);
        finishSnap();
      }
    }
    $card.addEventListener('transitionend', onTransitionDone);

    // Safety timeout
    setTimeout(() => {
      $card.removeEventListener('transitionend', onTransitionDone);
      finishSnap();
    }, 600);
  }

  function finishSnap() {
    if (!isSnapping) return;
    isSnapping = false;
    $card.classList.remove('snap-animating');
    enableFloat();
  }

  // ═══════════════════════════════════════════════════════════
  // 5. FRONT FACE — DYNAMIC PHOTO GLITCH
  // ═══════════════════════════════════════════════════════════
  const photoCtx = $photoCanvas.getContext('2d');

  function generateBasePhoto() {
    const w = $photoCanvas.width;
    const h = $photoCanvas.height;

    photoCtx.fillStyle = '#111';
    photoCtx.fillRect(0, 0, w, h);

    // Head
    photoCtx.beginPath();
    photoCtx.arc(w / 2, h * 0.3, 20, 0, Math.PI * 2);
    photoCtx.fillStyle = '#2a2a2a';
    photoCtx.fill();

    // Body
    photoCtx.beginPath();
    photoCtx.moveTo(w / 2 - 32, h * 0.52);
    photoCtx.quadraticCurveTo(w / 2, h * 0.45, w / 2 + 32, h * 0.52);
    photoCtx.lineTo(w / 2 + 38, h * 0.85);
    photoCtx.quadraticCurveTo(w / 2, h * 0.9, w / 2 - 38, h * 0.85);
    photoCtx.closePath();
    photoCtx.fillStyle = '#2a2a2a';
    photoCtx.fill();

    // Face
    photoCtx.beginPath();
    photoCtx.arc(w / 2, h * 0.32, 13, 0, Math.PI * 2);
    photoCtx.fillStyle = '#333';
    photoCtx.fill();
  }

  function applyGlitch() {
    const w = $photoCanvas.width;
    const h = $photoCanvas.height;
    const imageData = photoCtx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Slice shifts
    const numSlices = 2 + Math.floor(Math.random() * 3);
    for (let s = 0; s < numSlices; s++) {
      const sliceY = Math.floor(Math.random() * h);
      const sliceH = 1 + Math.floor(Math.random() * 5);
      const offset = Math.floor((Math.random() - 0.5) * 16) * 4;
      for (let y = sliceY; y < Math.min(sliceY + sliceH, h); y++) {
        for (let x = 0; x < w; x++) {
          const srcIdx = (y * w + x) * 4;
          const dstX = x + offset / 4;
          if (dstX >= 0 && dstX < w) {
            const dstIdx = (y * w + Math.floor(dstX)) * 4;
            data[dstIdx] = data[srcIdx];
            data[dstIdx + 1] = data[srcIdx + 1];
            data[dstIdx + 2] = data[srcIdx + 2];
          }
        }
      }
    }

    // Noise
    for (let i = 0; i < 60; i++) {
      const px = Math.floor(Math.random() * w);
      const py = Math.floor(Math.random() * h);
      const idx = (py * w + px) * 4;
      const v = Math.random() < 0.5 ? 0 : 40 + Math.floor(Math.random() * 30);
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
    }

    photoCtx.putImageData(imageData, 0, 0);
  }

  function startPhotoGlitch() {
    generateBasePhoto();
    let frame = 0;
    function glitchLoop() {
      frame++;
      if (frame % 5 === 0) {
        generateBasePhoto();
        applyGlitch();
      }
      requestAnimationFrame(glitchLoop);
    }
    glitchLoop();
  }

  // ═══════════════════════════════════════════════════════════
  // 6. BACK FACE — TEXT SCRAMBLE & REVEAL
  // ═══════════════════════════════════════════════════════════
  const scrambleChars = '!@#$%^&*()_+-={}|<>?0123456789ABCDEF';

  function randomScramble(length) {
    let s = '';
    for (let i = 0; i < length; i++) {
      s += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
    }
    return s;
  }

  function startScrambleAnimation() {
    $studentIdDisplay.classList.add('scrambling');
    $userIdDisplay.classList.add('scrambling');
    function loop() {
      if (!studentIdRevealed) {
        $studentIdDisplay.textContent = randomScramble(CONFIG.studentId.length);
      }
      if (!userIdRevealed) {
        $userIdDisplay.textContent = randomScramble(CONFIG.userId.length);
      }
      requestAnimationFrame(loop);
    }
    loop();
  }

  function typeReveal(element, text) {
    element.classList.remove('scrambling');
    element.classList.add('revealed');
    let idx = 0;
    const chars = text.split('');
    const interval = setInterval(() => {
      let display = '';
      for (let i = 0; i < chars.length; i++) {
        if (i <= idx) {
          display += chars[i];
        } else {
          display += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
        }
      }
      element.textContent = display;
      if (idx >= chars.length - 1) {
        clearInterval(interval);
        element.textContent = text;
      }
      idx++;
    }, 65);
  }

  function checkReveal() {
    if (!studentIdRevealed && flipCount >= CONFIG.flipRevealStudentId) {
      studentIdRevealed = true;
      setTimeout(() => typeReveal($studentIdDisplay, CONFIG.studentId), 400);
    }
    if (!userIdRevealed && flipCount >= CONFIG.flipRevealUserId) {
      userIdRevealed = true;
      setTimeout(() => typeReveal($userIdDisplay, CONFIG.userId), 400);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // BARCODE CANVAS
  // ═══════════════════════════════════════════════════════════
  function startBarcode() {
    const ctx = $barcodeCanvas.getContext('2d');
    const w = $barcodeCanvas.width;
    const h = $barcodeCanvas.height;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, w, h);

    let x = 4;
    while (x < w - 4) {
      const barW = 1 + Math.floor(Math.random() * 3);
      if (Math.random() > 0.35) {
        const alpha = 0.2 + Math.random() * 0.35;
        ctx.fillStyle = `rgba(200, 200, 200, ${alpha})`;
        ctx.fillRect(x, 3, barW, h - 6);
      }
      x += barW + 1;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // HUD CLOCK
  // ═══════════════════════════════════════════════════════════
  function startHUDClock() {
    function update() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      $hudTime.textContent = `${h}:${m}:${s}`;
    }
    update();
    setInterval(update, 1000);
  }

})();
