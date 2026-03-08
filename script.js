document.addEventListener('DOMContentLoaded', () => {

  // Desktop Warning
  function checkDevice() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    const warning = document.getElementById('desktop-warning');
    if (!isMobile) {
      warning.classList.add('visible');
    } else {
      warning.classList.remove('visible');
    }
  }
  window.addEventListener('resize', checkDevice);
  checkDevice();

  // CMD Style Loading Screen
  const loadingScreen = document.getElementById('loading-screen');
  const mainContent = document.getElementById('main-content');
  const progressBar = document.getElementById('cmd-progress-bar');
  const percentageText = document.getElementById('cmd-percentage');

  let progress = 0;
  const totalLength = 40; // Length of the ascii bar

  const loadingInterval = setInterval(() => {
    // Slower, jittery loading typical of old terminals
    progress += Math.random() * 4 + 0.5;
    if (progress >= 100) {
      progress = 100;
      clearInterval(loadingInterval);
      completeLoading();
    }

    // Build ASCII string: [#####.....]
    const filledLength = Math.floor((progress / 100) * totalLength);
    let barStr = '[';
    for (let i = 0; i < totalLength; i++) {
      if (i < filledLength) barStr += '#';
      else barStr += '.';
    }
    barStr += ']';

    progressBar.textContent = barStr;
    percentageText.textContent = `${Math.floor(progress)}%`;
  }, 100);

  function completeLoading() {
    setTimeout(() => {
      loadingScreen.style.opacity = '0';
      mainContent.style.opacity = '1';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
        init3DCard();
      }, 600);
    }, 600);
  }

  // Glitchy Mosaic Canvas Profile Pic
  const canvas = document.getElementById('mosaic-canvas');
  const ctx = canvas.getContext('2d');
  const blockSize = 10;
  const cyberColors = ['#000000', '#1a1a1a', '#00f0ff', '#ff003c', '#ffffff'];

  function drawMosaic() {
    if (!canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let x = 0; x < canvas.width; x += blockSize) {
      for (let y = 0; y < canvas.height; y += blockSize) {
        const rand = Math.random();
        let color = '#333';
        if (rand < 0.4) color = cyberColors[0];
        else if (rand < 0.7) color = cyberColors[1];
        else if (rand < 0.75) color = cyberColors[2]; // cyan burst
        else if (rand < 0.8) color = cyberColors[3]; // magenta burst
        else if (rand < 0.85) color = cyberColors[4]; // white static

        ctx.fillStyle = color;
        ctx.fillRect(x, y, blockSize, blockSize);
      }
    }

    // Occasional horizontal glitch line
    if (Math.random() > 0.8) {
      ctx.fillStyle = `rgba(0, 240, 255, 0.5)`;
      ctx.fillRect(0, Math.random() * canvas.height, canvas.width, Math.random() * 10 + 2);
    }
  }
  setInterval(drawMosaic, 100);

  // 3D Card Interactivity (Cyber-tuned)
  const card = document.getElementById('id-card');
  let currentY = 0, targetY = 0;
  let currentFlip = 0, targetFlip = 0;
  let flipCount = 0;
  let isTouching = false;
  let startX = 0, startY = 0, startFlip = 0;

  function init3DCard() {
    document.addEventListener('touchstart', (e) => {
      if (window.innerWidth > 768) return;
      isTouching = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startFlip = targetFlip;
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (!isTouching || window.innerWidth > 768) return;
      e.preventDefault();

      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const deltaX = touchX - startX;
      const deltaY = touchY - startY;

      targetY = deltaY * 0.3; // Stiffer vertical movement
      if (targetY > 100) targetY = 100;
      if (targetY < -100) targetY = -100;

      let proposedFlip = startFlip + (deltaX * 0.9);
      if (proposedFlip > startFlip + 180) proposedFlip = startFlip + 180;
      if (proposedFlip < startFlip - 180) proposedFlip = startFlip - 180;
      targetFlip = proposedFlip;
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      if (!isTouching) return;
      isTouching = false;

      let flipDiff = targetFlip - startFlip;
      // cyber-snap is more prone to locking (easier to trigger)
      if (Math.abs(flipDiff) > 50) {
        targetFlip = flipDiff > 0 ? startFlip + 180 : startFlip - 180;
      } else {
        targetFlip = startFlip;
      }

      if (targetFlip !== startFlip) {
        const isBack = Math.abs(targetFlip / 180) % 2 === 1;
        if (isBack) {
          flipCount++;
          updateSecretValues();
        }
      }
      targetY = 0;
    });

    function animate() {
      // Snappier physics for cyberpunk feel
      currentY += (targetY - currentY) * 0.15;
      if (isTouching) {
        currentFlip += (targetFlip - currentFlip) * 0.5;
      } else {
        currentFlip += (targetFlip - currentFlip) * 0.2;
      }
      const tiltX = -currentY * 0.15;
      card.style.transform = `translateY(${currentY}px) rotateX(${tiltX}deg) rotateY(${currentFlip}deg)`;
      requestAnimationFrame(animate);
    }
    animate();
  }

  // Pachinko / Glitch Text Reveal
  const secretElements = document.querySelectorAll('.secret-value');
  // Include weird symbols for better cyber-glitch feel
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789§±!@#$%^&*()_+><\\|[]{}';

  secretElements.forEach(el => {
    const targetText = el.getAttribute('data-target');
    el.pachinkoInterval = setInterval(() => {
      if (!el.classList.contains('revealed')) {
        let randomString = '';
        for (let i = 0; i < targetText.length; i++) {
          randomString += chars[Math.floor(Math.random() * chars.length)];
        }
        el.innerText = randomString;
      }
    }, 50);
  });

  function updateSecretValues() {
    secretElements.forEach(el => {
      const targetText = el.getAttribute('data-target');
      const reqFlips = parseInt(el.getAttribute('data-req'), 10);

      if (flipCount >= reqFlips && !el.classList.contains('revealed')) {
        el.classList.add('revealed');
        // Glitch to final text
        let iterations = 0;
        const glitchInterval = setInterval(() => {
          let tempStr = '';
          for (let i = 0; i < targetText.length; i++) {
            if (i < iterations) tempStr += targetText[i];
            else tempStr += chars[Math.floor(Math.random() * chars.length)];
          }
          el.innerText = tempStr;
          iterations += 0.5;
          if (iterations >= targetText.length) {
            clearInterval(glitchInterval);
            el.innerText = targetText;
          }
        }, 30);

        clearInterval(el.pachinkoInterval);
      }
    });
  }

  // Cyber Background Particles (Datastreams)
  function initParticles() {
    const canvas = document.getElementById('bg-particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    });

    const particles = [];
    const particleCount = 60; // Datastream lines

    class Particle {
      constructor() { this.reset(); this.y = Math.random() * h; }
      reset() {
        this.x = Math.random() * w;
        this.y = -100; // Start top
        this.length = Math.random() * 40 + 10;
        this.speedY = Math.random() * 5 + 2; // Fast fall like digital rain
        // Cyan and Magenta colors
        this.color = Math.random() > 0.5 ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 0, 60, 0.4)';
      }
      update() {
        this.y += this.speedY;
        if (this.y > h + this.length) this.reset();
      }
      draw() {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y - this.length);
        ctx.stroke();
      }
    }

    for (let i = 0; i < particleCount; i++) particles.push(new Particle());

    function animateParticles() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => { p.update(); p.draw(); });
      requestAnimationFrame(animateParticles);
    }
    animateParticles();
  }
  initParticles();
});
