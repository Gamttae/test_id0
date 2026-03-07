/* ============================================================
   3D Interactive Digital ID Card
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
    particleCount: 60,
    hintDelayMs: 15000, // 15 seconds
  };

  // ─── State ───
  let flipCount = 0;
  let currentRotationY = 0;   // continuous rotation tracking
  let studentIdRevealed = false;
  let userIdRevealed = false;
  let tiltX = 0;
  let tiltY = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let isTouching = false;
  let loadingComplete = false;
  let hintTimer = null;
  let hintShown = false;

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
          }, 900);
        }, 500);
      }
    }, interval);
  }

  runLoading();

  // ═══════════════════════════════════════════════════════════
  // HINT TIMER — show after 15s of no flip
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
  // 3. DYNAMIC BACKGROUND — Endfield atmospheric style
  // ═══════════════════════════════════════════════════════════
  const bgCtx = $bgCanvas.getContext('2d');
  let particles = [];
  let floatingShapes = [];
  let bgAnimId;
  let bgFrame = 0;

  function resizeBgCanvas() {
    $bgCanvas.width = window.innerWidth;
    $bgCanvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = [];
    const w = $bgCanvas.width;
    const h = $bgCanvas.height;

    // Dust particles — slow horizontal drift
    for (let i = 0; i < CONFIG.particleCount; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() * 0.3 + 0.05) * (Math.random() < 0.5 ? 1 : -1),
        vy: (Math.random() - 0.5) * 0.1,
        r: Math.random() * 1.2 + 0.2,
        alpha: Math.random() * 0.3 + 0.03,
        hue: 30 + Math.random() * 20,
        sat: 30 + Math.random() * 40,
      });
    }

    // Floating geometric shapes
    floatingShapes = [];
    for (let i = 0; i < 5; i++) {
      floatingShapes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.1,
        size: 15 + Math.random() * 25,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.003,
        alpha: 0.03 + Math.random() * 0.04,
        type: Math.floor(Math.random() * 3), // 0=diamond, 1=triangle, 2=hexagon
      });
    }
  }

  function drawParticles() {
    const w = $bgCanvas.width;
    const h = $bgCanvas.height;
    bgCtx.clearRect(0, 0, w, h);
    bgFrame++;

    // Subtle vignette for depth
    const vigGrad = bgCtx.createRadialGradient(w/2, h/2, w*0.15, w/2, h/2, w*0.75);
    vigGrad.addColorStop(0, 'transparent');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.25)');
    bgCtx.fillStyle = vigGrad;
    bgCtx.fillRect(0, 0, w, h);

    // Draw floating geometric shapes — visible on dark bg
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
      bgCtx.strokeStyle = `rgba(212, 168, 83, ${s.alpha * 2})`;
      bgCtx.lineWidth = 0.6;
      bgCtx.beginPath();

      if (s.type === 0) {
        // Diamond
        bgCtx.moveTo(0, -s.size/2);
        bgCtx.lineTo(s.size/2, 0);
        bgCtx.lineTo(0, s.size/2);
        bgCtx.lineTo(-s.size/2, 0);
        bgCtx.closePath();
      } else if (s.type === 1) {
        // Triangle
        const r = s.size / 2;
        for (let v = 0; v < 3; v++) {
          const angle = (v * Math.PI * 2 / 3) - Math.PI / 2;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (v === 0) bgCtx.moveTo(px, py);
          else bgCtx.lineTo(px, py);
        }
        bgCtx.closePath();
      } else {
        // Hexagon
        const r = s.size / 2;
        for (let v = 0; v < 6; v++) {
          const angle = (v * Math.PI * 2 / 6) - Math.PI / 2;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (v === 0) bgCtx.moveTo(px, py);
          else bgCtx.lineTo(px, py);
        }
        bgCtx.closePath();
      }
      bgCtx.stroke();
      bgCtx.restore();
    }

    // Connecting lines between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) {
          bgCtx.beginPath();
          bgCtx.moveTo(particles[i].x, particles[i].y);
          bgCtx.lineTo(particles[j].x, particles[j].y);
          bgCtx.strokeStyle = `rgba(212, 168, 83, ${0.04 * (1 - dist / 80)})`;
          bgCtx.lineWidth = 0.4;
          bgCtx.stroke();
        }
      }
    }

    // Draw dust particles
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      bgCtx.fillStyle = `hsla(${p.hue}, ${p.sat}%, 55%, ${p.alpha})`;
      bgCtx.fill();
    }

    // Occasional horizontal light streak
    if (Math.random() < 0.003) {
      const fy = Math.random() * h;
      const grad = bgCtx.createLinearGradient(0, fy, w, fy);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.3, 'rgba(212, 168, 83, 0.03)');
      grad.addColorStop(0.5, 'rgba(212, 168, 83, 0.06)');
      grad.addColorStop(0.7, 'rgba(212, 168, 83, 0.03)');
      grad.addColorStop(1, 'transparent');
      bgCtx.fillStyle = grad;
      bgCtx.fillRect(0, fy, w, 1);
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
  // 4. 3D CARD INTERACTION — rock-solid directional flip
  // ═══════════════════════════════════════════════════════════
  let isFlipping = false; // hard lock — blocks ALL input during animation
  let flipUnlockTimer = null;

  function setCardTransform(rx, ry) {
    $card.style.animation = 'none';
    $card.style.transition = 'none';
    $card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
  }

  function resetCardFloat() {
    $card.style.transition = 'none';
    $card.style.setProperty('--ry', currentRotationY + 'deg');
    void $card.offsetHeight;
    $card.style.transform = '';
    $card.style.animation = '';
  }

  function unlockFlip() {
    if (!isFlipping) return; // already unlocked
    isFlipping = false;
    isTouching = false;
    mouseDown = false;
    if (flipUnlockTimer) {
      clearTimeout(flipUnlockTimer);
      flipUnlockTimer = null;
    }
    resetCardFloat();
  }

  // Touch Events
  document.addEventListener('touchstart', (e) => {
    if (!loadingComplete || isFlipping) return;
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    isTouching = true;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!loadingComplete || !isTouching || isFlipping) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;

    const maxTilt = 15;
    tiltX = -(dy / window.innerHeight) * maxTilt * 2;
    tiltY = (dx / window.innerWidth) * maxTilt * 2;
    tiltX = Math.max(-maxTilt, Math.min(maxTilt, tiltX));
    tiltY = Math.max(-maxTilt, Math.min(maxTilt, tiltY));

    setCardTransform(tiltX, currentRotationY + tiltY);
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!loadingComplete || !isTouching || isFlipping) return;
    isTouching = false;

    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(t.clientY - touchStartY);

    if (absDx > 50 && absDx > absDy * 1.2) {
      // Swipe left (dx<0) → rotate card to the left (−180)
      // Swipe right (dx>0) → rotate card to the right (+180)
      flipCard(dx < 0 ? -180 : 180);
    } else {
      resetCardFloat();
    }
  }, { passive: true });

  // Mouse fallback
  let mouseDown = false;
  let mouseStartX = 0;
  document.addEventListener('mousedown', (e) => {
    if (!loadingComplete || isFlipping) return;
    mouseDown = true;
    mouseStartX = e.clientX;
  });
  document.addEventListener('mouseup', (e) => {
    if (!loadingComplete || !mouseDown || isFlipping) return;
    mouseDown = false;
    const dx = e.clientX - mouseStartX;
    if (Math.abs(dx) > 50) {
      flipCard(dx < 0 ? -180 : 180);
    }
  });

  function flipCard(direction) {
    if (isFlipping) return; // absolute guard
    isFlipping = true;

    currentRotationY += direction;
    flipCount++;
    $hudFlipCount.textContent = flipCount;

    // Stop float animation, apply transition
    $card.style.animation = 'none';
    void $card.offsetHeight; // force reflow between removing animation and setting transition
    $card.style.transition = 'transform 0.65s cubic-bezier(0.4, 0.0, 0.2, 1)';
    $card.style.transform = `rotateY(${currentRotationY}deg)`;

    // One-shot transitionend listener
    function onTransitionDone(e) {
      if (e.propertyName === 'transform') {
        $card.removeEventListener('transitionend', onTransitionDone);
        unlockFlip();
      }
    }
    $card.addEventListener('transitionend', onTransitionDone);

    // Safety fallback timeout
    flipUnlockTimer = setTimeout(() => {
      $card.removeEventListener('transitionend', onTransitionDone);
      unlockFlip();
    }, 750);

    checkReveal();

    if (flipCount >= 1) {
      hideHint();
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 5. FRONT FACE — DYNAMIC PHOTO GLITCH (Canvas)
  // ═══════════════════════════════════════════════════════════
  const photoCtx = $photoCanvas.getContext('2d');
  let photoGlitchId;

  function generateBasePhoto() {
    const w = $photoCanvas.width;
    const h = $photoCanvas.height;

    // Warm dark background
    photoCtx.fillStyle = '#12100d';
    photoCtx.fillRect(0, 0, w, h);

    // Head circle
    photoCtx.beginPath();
    photoCtx.arc(w / 2, h * 0.3, 20, 0, Math.PI * 2);
    photoCtx.fillStyle = '#2a2318';
    photoCtx.fill();

    // Shoulders/body
    photoCtx.beginPath();
    photoCtx.moveTo(w / 2 - 32, h * 0.52);
    photoCtx.quadraticCurveTo(w / 2, h * 0.45, w / 2 + 32, h * 0.52);
    photoCtx.lineTo(w / 2 + 38, h * 0.85);
    photoCtx.quadraticCurveTo(w / 2, h * 0.9, w / 2 - 38, h * 0.85);
    photoCtx.closePath();
    photoCtx.fillStyle = '#2a2318';
    photoCtx.fill();

    // Subtle face features
    photoCtx.beginPath();
    photoCtx.arc(w / 2, h * 0.32, 13, 0, Math.PI * 2);
    photoCtx.fillStyle = '#332b1f';
    photoCtx.fill();
  }

  function applyGlitch() {
    const w = $photoCanvas.width;
    const h = $photoCanvas.height;

    const imageData = photoCtx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Random horizontal slice shift
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

    // RGB channel split — warm bias
    if (Math.random() < 0.3) {
      const ry = Math.floor(Math.random() * h);
      const rh = 2 + Math.floor(Math.random() * 6);
      for (let y = ry; y < Math.min(ry + rh, h); y++) {
        for (let x = 0; x < w - 3; x++) {
          const idx = (y * w + x) * 4;
          data[idx] = Math.min(255, (data[idx + 8] || data[idx]) + 15); // warm red shift
          data[idx + 2] = Math.max(0, (data[idx - 8] || data[idx + 2]) - 10);
        }
      }
    }

    // Noise pixels — warm tones
    for (let i = 0; i < 60; i++) {
      const px = Math.floor(Math.random() * w);
      const py = Math.floor(Math.random() * h);
      const idx = (py * w + px) * 4;
      if (Math.random() < 0.5) {
        // Amber noise
        data[idx] = 160 + Math.floor(Math.random() * 60);
        data[idx + 1] = 120 + Math.floor(Math.random() * 40);
        data[idx + 2] = 40 + Math.floor(Math.random() * 30);
      } else {
        const v = Math.random() < 0.5 ? 0 : 40 + Math.floor(Math.random() * 30);
        data[idx] = v;
        data[idx + 1] = v;
        data[idx + 2] = v;
      }
    }

    // Occasional warm tint band
    if (Math.random() < 0.2) {
      const by = Math.floor(Math.random() * h);
      const bh = 1 + Math.floor(Math.random() * 3);
      for (let y = by; y < Math.min(by + bh, h); y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          data[idx] = Math.min(255, data[idx] + 25);     // red
          data[idx + 1] = Math.min(255, data[idx + 1] + 15); // green
        }
      }
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
      photoGlitchId = requestAnimationFrame(glitchLoop);
    }
    glitchLoop();
  }

  // ═══════════════════════════════════════════════════════════
  // 6. BACK FACE — TEXT SCRAMBLE & REVEAL
  // ═══════════════════════════════════════════════════════════
  const scrambleChars = '!@#$%^&*()_+-={}|<>?0123456789ABCDEF';
  let scrambleAnimId;

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
      scrambleAnimId = requestAnimationFrame(loop);
    }
    loop();
  }

  function typeReveal(element, text, callback) {
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
        if (callback) callback();
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
  // BARCODE CANVAS — warm tone
  // ═══════════════════════════════════════════════════════════
  function startBarcode() {
    const ctx = $barcodeCanvas.getContext('2d');
    const w = $barcodeCanvas.width;
    const h = $barcodeCanvas.height;

    ctx.fillStyle = '#0e0d0b';
    ctx.fillRect(0, 0, w, h);

    let x = 4;
    while (x < w - 4) {
      const barW = 1 + Math.floor(Math.random() * 3);
      const isFilled = Math.random() > 0.35;
      if (isFilled) {
        const alpha = 0.2 + Math.random() * 0.35;
        ctx.fillStyle = `rgba(212, 168, 83, ${alpha})`;
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

