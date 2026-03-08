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

  // Loading Screen (Line Progress & Spinner)
  const loadingScreen = document.getElementById('loading-screen');
  const mainContent = document.getElementById('main-content');
  const progressFill = document.getElementById('cmd-progress-fill');
  const spinnerChars = ['/', '-', '\\', '|'];
  const spinnerElement = document.getElementById('cmd-spinner');

  let progress = 0;
  let spinnerIdx = 0;

  const spinnerInterval = setInterval(() => {
    spinnerIdx = (spinnerIdx + 1) % spinnerChars.length;
    spinnerElement.textContent = spinnerChars[spinnerIdx];
  }, 100);

  const loadingInterval = setInterval(() => {
    progress += Math.random() * 8 + 2;
    if (progress >= 100) {
      progress = 100;
      clearInterval(loadingInterval);
      clearInterval(spinnerInterval);
      spinnerElement.textContent = '-';
      completeLoading();
    }

    progressFill.style.width = `${progress}%`;
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

  // Mosaic Canvas Profile Pic
  const canvas = document.getElementById('mosaic-canvas');
  const ctx = canvas.getContext('2d');
  const blockSize = 15;
  const cyberColors = ['#1a1d24', '#333333', '#ffffff', '#cccccc', '#fcee0a'];

  function drawMosaic() {
    if (!canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let x = 0; x < canvas.width; x += blockSize) {
      for (let y = 0; y < canvas.height; y += blockSize) {
        const rand = Math.random();
        let color = '#222';
        if (rand < 0.4) color = cyberColors[0];
        else if (rand < 0.7) color = cyberColors[1];
        else if (rand < 0.8) color = cyberColors[2];
        else if (rand < 0.9) color = cyberColors[3];
        else if (rand < 0.95) color = cyberColors[4]; // rare yellow

        ctx.fillStyle = color;
        ctx.fillRect(x, y, blockSize, blockSize);
      }
    }
  }
  setInterval(drawMosaic, 80);

  // 3D Card Interactivity
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

      targetY = deltaY * 0.3;
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

  // Pachinko Text Reveal
  const secretElements = document.querySelectorAll('.secret-value');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789§±!@#$%^&*';

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
        // Typewriter reveal
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

  // Background Particles (Swarm cloud, as in Image 2)
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
    const particleCount = 200; // Dense cloud

    class Particle {
      constructor() { this.reset(); this.x = Math.random() * w; }
      reset() {
        this.x = Math.random() * w;
        // Spawn mostly in lower-middle screen where the ship/device is
        this.y = h * 0.6 + (Math.random() - 0.5) * h * 0.5;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 1.5; // Flow horizontally
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.baseAlpha = Math.random() * 0.6 + 0.1;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Wrap around horizontally
        if (this.x > w + 20) this.x = -20;
        if (this.x < -20) this.x = w + 20;
        // Bounce vertically softly
        if (this.y < h * 0.2 || this.y > h * 0.9) this.speedY *= -1;
      }
      draw() {
        // Twinkle effect
        const alpha = this.baseAlpha + Math.sin(Date.now() / 200 + this.x) * 0.2;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, alpha)})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
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
