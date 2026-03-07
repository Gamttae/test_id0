/* ============================================================
   3D Interactive Digital ID Card — Main Script
   ============================================================ */

(function () {
  'use strict';

  // ─── Configuration ───
  const CONFIG = {
    studentId: '20231234',
    userId: 'honggildong',
    flipRevealStudentId: 2,
    flipRevealUserId: 7,
    loadingDuration: 4000, // ms
    particleCount: 70,
  };

  // ─── State ───
  let flipCount = 0;
  let isFlipped = false;
  let studentIdRevealed = false;
  let userIdRevealed = false;
  let tiltX = 0;
  let tiltY = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let isTouching = false;
  let loadingComplete = false;

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
    '> Booting ID_VERIFY kernel...',
    '> Loading biometric modules...',
    '> Initializing 3D renderer...',
    '> Connecting to secure database...',
    '> Fetching user credentials...',
    '> Decrypting identity payload...',
    '> Verifying certificate chain...',
    '> Applying holographic filters...',
    '> Rendering card surfaces...',
    '> System ready.',
  ];

  let loadProgress = 0;
  let lineIndex = 0;

  function addTerminalLine(text) {
    const div = document.createElement('div');
    div.className = 'terminal-line';
    div.textContent = text;
    $terminalBody.appendChild(div);
    $terminalBody.scrollTop = $terminalBody.scrollHeight;
  }

  function updateProgressBar(pct) {
    const total = 30;
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

      // Add lines at evenly spaced intervals
      const lineThreshold = Math.floor((progress / 100) * steps);
      while (lineIndex < lineThreshold && lineIndex < steps) {
        addTerminalLine(terminalLines[lineIndex]);
        lineIndex++;
      }

      if (progress >= 100) {
        clearInterval(timer);
        // Add final line
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
          }, 800);
        }, 400);
      }
    }, interval);
  }

  runLoading();

  // ═══════════════════════════════════════════════════════════
  // 3. DYNAMIC BACKGROUND (Particles + Grid)
  // ═══════════════════════════════════════════════════════════
  const bgCtx = $bgCanvas.getContext('2d');
  let particles = [];
  let bgAnimId;

  function resizeBgCanvas() {
    $bgCanvas.width = window.innerWidth;
    $bgCanvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
      particles.push({
        x: Math.random() * $bgCanvas.width,
        y: Math.random() * $bgCanvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }
  }

  function drawParticles() {
    bgCtx.clearRect(0, 0, $bgCanvas.width, $bgCanvas.height);

    // Draw connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          bgCtx.beginPath();
          bgCtx.moveTo(particles[i].x, particles[i].y);
          bgCtx.lineTo(particles[j].x, particles[j].y);
          bgCtx.strokeStyle = `rgba(0, 229, 255, ${0.06 * (1 - dist / 120)})`;
          bgCtx.lineWidth = 0.5;
          bgCtx.stroke();
        }
      }
    }

    // Draw particles
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around
      if (p.x < 0) p.x = $bgCanvas.width;
      if (p.x > $bgCanvas.width) p.x = 0;
      if (p.y < 0) p.y = $bgCanvas.height;
      if (p.y > $bgCanvas.height) p.y = 0;

      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      bgCtx.fillStyle = `rgba(0, 229, 255, ${p.alpha})`;
      bgCtx.fill();
    }

    // Occasional HUD flicker elements
    if (Math.random() < 0.005) {
      const fy = Math.random() * $bgCanvas.height;
      bgCtx.fillStyle = 'rgba(0, 229, 255, 0.03)';
      bgCtx.fillRect(0, fy, $bgCanvas.width, 1 + Math.random() * 3);
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
  // 4. 3D CARD INTERACTION
  // ═══════════════════════════════════════════════════════════
  // Disable float animation when user touches to apply tilt directly
  function setCardTransform(rx, ry) {
    $card.style.animation = 'none';
    $card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
  }

  function resetCardFloat() {
    $card.style.animation = '';
    $card.style.setProperty('--ry', isFlipped ? '180deg' : '0deg');
    $card.style.transform = '';
  }

  // Touch Events
  document.addEventListener('touchstart', (e) => {
    if (!loadingComplete) return;
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    isTouching = true;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!loadingComplete || !isTouching) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;

    // Parallax tilt
    const maxTilt = 18;
    tiltX = -(dy / window.innerHeight) * maxTilt * 2;
    tiltY = (dx / window.innerWidth) * maxTilt * 2;

    // Clamp
    tiltX = Math.max(-maxTilt, Math.min(maxTilt, tiltX));
    tiltY = Math.max(-maxTilt, Math.min(maxTilt, tiltY));

    const baseRY = isFlipped ? 180 : 0;
    setCardTransform(tiltX, baseRY + tiltY);
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!loadingComplete || !isTouching) return;
    isTouching = false;

    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(t.clientY - touchStartY);

    // Detect horizontal swipe (more X than Y, over 50px)
    if (absDx > 50 && absDx > absDy * 1.2) {
      flipCard();
    } else {
      // Reset to floating
      resetCardFloat();
    }
  }, { passive: true });

  // Mouse fallback (for testing on desktop)
  let mouseDown = false;
  let mouseStartX = 0;
  document.addEventListener('mousedown', (e) => {
    if (!loadingComplete) return;
    mouseDown = true;
    mouseStartX = e.clientX;
  });
  document.addEventListener('mouseup', (e) => {
    if (!loadingComplete || !mouseDown) return;
    mouseDown = false;
    const dx = e.clientX - mouseStartX;
    if (Math.abs(dx) > 50) flipCard();
  });

  function flipCard() {
    isFlipped = !isFlipped;
    flipCount++;
    $hudFlipCount.textContent = flipCount;

    // Apply flip
    $card.style.animation = 'none';
    $card.style.transition = 'transform 0.7s cubic-bezier(0.4, 0.0, 0.2, 1)';
    $card.style.transform = `rotateY(${isFlipped ? 180 : 0}deg)`;

    // After transition, restore float
    setTimeout(() => {
      $card.style.transition = '';
      resetCardFloat();
    }, 750);

    // Check reveal conditions
    checkReveal();

    // Hide hint after first flip
    if (flipCount >= 1) {
      $flipHint.style.opacity = '0';
      setTimeout(() => { $flipHint.style.display = 'none'; }, 500);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 5. FRONT FACE — DYNAMIC PHOTO GLITCH (Canvas)
  // ═══════════════════════════════════════════════════════════
  const photoCtx = $photoCanvas.getContext('2d');
  let photoGlitchId;

  function generateBasePhoto() {
    // Procedural "person silhouette" placeholder
    const w = $photoCanvas.width;
    const h = $photoCanvas.height;

    // Dark background
    photoCtx.fillStyle = '#0d0d1a';
    photoCtx.fillRect(0, 0, w, h);

    // Head circle
    photoCtx.beginPath();
    photoCtx.arc(w / 2, h * 0.32, 22, 0, Math.PI * 2);
    photoCtx.fillStyle = '#1a2a3a';
    photoCtx.fill();

    // Body
    photoCtx.beginPath();
    photoCtx.ellipse(w / 2, h * 0.72, 30, 40, 0, 0, Math.PI * 2);
    photoCtx.fillStyle = '#1a2a3a';
    photoCtx.fill();

    // Shoulder line
    photoCtx.beginPath();
    photoCtx.moveTo(w / 2 - 35, h * 0.55);
    photoCtx.quadraticCurveTo(w / 2, h * 0.48, w / 2 + 35, h * 0.55);
    photoCtx.lineTo(w / 2 + 35, h * 0.65);
    photoCtx.quadraticCurveTo(w / 2, h * 0.58, w / 2 - 35, h * 0.65);
    photoCtx.fillStyle = '#1a2a3a';
    photoCtx.fill();
  }

  function applyGlitch() {
    const w = $photoCanvas.width;
    const h = $photoCanvas.height;

    // Get current image data
    const imageData = photoCtx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Random horizontal slice shift
    const numSlices = 2 + Math.floor(Math.random() * 4);
    for (let s = 0; s < numSlices; s++) {
      const sliceY = Math.floor(Math.random() * h);
      const sliceH = 1 + Math.floor(Math.random() * 6);
      const offset = Math.floor((Math.random() - 0.5) * 20) * 4;

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

    // RGB channel split on random rows
    if (Math.random() < 0.3) {
      const ry = Math.floor(Math.random() * h);
      const rh = 2 + Math.floor(Math.random() * 8);
      for (let y = ry; y < Math.min(ry + rh, h); y++) {
        for (let x = 0; x < w - 3; x++) {
          const idx = (y * w + x) * 4;
          data[idx] = data[idx + 8] || data[idx];     // shift red
          data[idx + 2] = data[idx - 8] || data[idx + 2]; // shift blue
        }
      }
    }

    // Add noise pixels
    for (let i = 0; i < 80; i++) {
      const px = Math.floor(Math.random() * w);
      const py = Math.floor(Math.random() * h);
      const idx = (py * w + px) * 4;
      const v = Math.random() < 0.5 ? 0 : 200 + Math.floor(Math.random() * 55);
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v + (Math.random() < 0.3 ? 80 : 0);
    }

    // Occasional cyan tint band
    if (Math.random() < 0.2) {
      const by = Math.floor(Math.random() * h);
      const bh = 1 + Math.floor(Math.random() * 4);
      for (let y = by; y < Math.min(by + bh, h); y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          data[idx + 1] = Math.min(255, data[idx + 1] + 40);
          data[idx + 2] = Math.min(255, data[idx + 2] + 60);
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
      if (frame % 4 === 0) { // Every ~4 frames
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
  const scrambleChars = '!@#$%^&*()_+-=[]{}|;:,.<>?0123456789ABCDEF';
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
      // Build string: revealed chars + scrambled remaining
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
    }, 60);
  }

  function checkReveal() {
    if (!studentIdRevealed && flipCount >= CONFIG.flipRevealStudentId) {
      studentIdRevealed = true;
      setTimeout(() => {
        typeReveal($studentIdDisplay, CONFIG.studentId);
      }, 300);
    }
    if (!userIdRevealed && flipCount >= CONFIG.flipRevealUserId) {
      userIdRevealed = true;
      setTimeout(() => {
        typeReveal($userIdDisplay, CONFIG.userId);
      }, 300);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // BARCODE CANVAS
  // ═══════════════════════════════════════════════════════════
  function startBarcode() {
    const ctx = $barcodeCanvas.getContext('2d');
    const w = $barcodeCanvas.width;
    const h = $barcodeCanvas.height;

    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, w, h);

    let x = 4;
    while (x < w - 4) {
      const barW = 1 + Math.floor(Math.random() * 3);
      const isFilled = Math.random() > 0.35;
      if (isFilled) {
        ctx.fillStyle = `rgba(0, 229, 255, ${0.3 + Math.random() * 0.4})`;
        ctx.fillRect(x, 4, barW, h - 8);
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

