document.addEventListener('DOMContentLoaded', () => {

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

  // Loading Screen
  const loadingScreen = document.getElementById('loading-screen');
  const mainContent = document.getElementById('main-content');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const percentageText = document.getElementById('loading-percentage');

  let progress = 0;
  const loadingInterval = setInterval(() => {
    progress += Math.random() * 5 + 1;
    if (progress >= 100) {
      progress = 100;
      clearInterval(loadingInterval);
      completeLoading();
    }

    progressBarFill.style.width = `${progress}%`;
    percentageText.textContent = `${Math.floor(progress)}`;
  }, 100);

  function completeLoading() {
    setTimeout(() => {
      loadingScreen.style.opacity = '0';
      mainContent.style.opacity = '1';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
        init3DCard();
      }, 800);
    }, 500);
  }

  // Mosaic Canvas
  const canvas = document.getElementById('mosaic-canvas');
  const ctx = canvas.getContext('2d');
  const blockSize = 8;
  const colors = ['#ffffff', '#8c92a2', '#333333', '#111111', '#f2e022'];

  function drawMosaic() {
    if (!canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let x = 0; x < canvas.width; x += blockSize) {
      for (let y = 0; y < canvas.height; y += blockSize) {
        const rand = Math.random();
        let color = '#1a1d24'; // base
        if (rand < 0.1) color = colors[0];
        else if (rand < 0.3) color = colors[1];
        else if (rand < 0.5) color = colors[2];
        else if (rand < 0.05) color = colors[4]; // rare yellow

        ctx.fillStyle = color;
        ctx.fillRect(x, y, blockSize, blockSize);
      }
    }
  }
  setInterval(drawMosaic, 150);

  // 3D Card
  const card = document.getElementById('id-card');
  let currentY = 0;
  let targetY = 0;
  let currentFlip = 0;
  let targetFlip = 0;
  let flipCount = 0;
  let isTouching = false;
  let startX = 0;
  let startY = 0;
  let startFlip = 0;

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

      targetY = deltaY * 0.4;
      if (targetY > 120) targetY = 120;
      if (targetY < -120) targetY = -120;

      let proposedFlip = startFlip + (deltaX * 0.8);
      if (proposedFlip > startFlip + 180) proposedFlip = startFlip + 180;
      if (proposedFlip < startFlip - 180) proposedFlip = startFlip - 180;

      targetFlip = proposedFlip;
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      if (!isTouching) return;
      isTouching = false;

      let flipDiff = targetFlip - startFlip;
      if (Math.abs(flipDiff) > 60) {
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
      currentY += (targetY - currentY) * 0.1;
      if (isTouching) {
        currentFlip += (targetFlip - currentFlip) * 0.4;
      } else {
        currentFlip += (targetFlip - currentFlip) * 0.15;
      }
      const tiltX = -currentY * 0.1;
      card.style.transform = `translateY(${currentY}px) rotateX(${tiltX}deg) rotateY(${currentFlip}deg)`;
      requestAnimationFrame(animate);
    }
    animate();
  }

  // Pachinko Reveal
  const secretElements = document.querySelectorAll('.secret-value');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';

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
    }, 60);
  });

  function updateSecretValues() {
    secretElements.forEach(el => {
      const targetText = el.getAttribute('data-target');
      const reqFlips = parseInt(el.getAttribute('data-req'), 10);

      if (flipCount >= reqFlips && !el.classList.contains('revealed')) {
        el.classList.add('revealed');
        el.innerText = targetText;
        clearInterval(el.pachinkoInterval);
      }
    });
  }

  // Background Particles
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
    const particleCount = 100;

    class Particle {
      constructor() { this.reset(); this.y = Math.random() * h; }
      reset() {
        this.x = Math.random() * w;
        this.y = h + 10;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = -(Math.random() * 0.5 + 0.2); // flow upwards
        this.life = Math.random();
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.y < -10) this.reset();
      }
      draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.life * 0.8})`;
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
