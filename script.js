document.addEventListener('DOMContentLoaded', () => {

  // --- 1. Desktop Warning Check ---
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

  // --- 2. Loading Screen Logic ---
  const loadingScreen = document.getElementById('loading-screen');
  const mainContent = document.getElementById('main-content');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const percentageText = document.getElementById('loading-percentage');

  let progress = 0;
  const loadingInterval = setInterval(() => {
    progress += Math.random() * 8 + 2;
    if (progress >= 100) {
      progress = 100;
      clearInterval(loadingInterval);
      completeLoading();
    }

    progressBarFill.style.width = `${progress}%`;
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
    }, 400);
  }

  // --- 3. Mosaic Canvas Effect (Google colors mixed) ---
  const canvas = document.getElementById('mosaic-canvas');
  const ctx = canvas.getContext('2d');
  const blockSize = 10;
  const colors = ['#4285f4', '#ea4335', '#fbbc04', '#34a853', '#e8eaed', '#bdc1c6'];

  function drawMosaic() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let x = 0; x < canvas.width; x += blockSize) {
      for (let y = 0; y < canvas.height; y += blockSize) {
        // High chance of grey, low chance of brand colors
        const rand = Math.random();
        let color = colors[4]; // default light grey
        if (rand < 0.1) color = colors[0]; // blue
        else if (rand < 0.2) color = colors[1]; // red
        else if (rand < 0.3) color = colors[2]; // yellow
        else if (rand < 0.4) color = colors[3]; // green
        else if (rand < 0.7) color = colors[5]; // darker grey

        ctx.fillStyle = color;
        ctx.fillRect(x, y, blockSize, blockSize);
      }
    }
  }
  setInterval(drawMosaic, 150);

  // --- 4. 3D Card Floating & Flipping Logic ---
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
      if (window.innerWidth > 768) return; // Ignore on desktop mock
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

      // Vertical translation (floating up/down)
      targetY = deltaY * 0.4;
      if (targetY > 120) targetY = 120;
      if (targetY < -120) targetY = -120;

      // Card follows finger horizontally: 1px move -> 0.8deg rotate
      let proposedFlip = startFlip + (deltaX * 0.8);

      // Strict constraint: Only allow up to 180 degrees flip per swipe
      if (proposedFlip > startFlip + 180) proposedFlip = startFlip + 180;
      if (proposedFlip < startFlip - 180) proposedFlip = startFlip - 180;

      targetFlip = proposedFlip;
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      if (!isTouching) return;
      isTouching = false;

      // Snap to nearest 180
      let flipDiff = targetFlip - startFlip;

      // If swiped more than 60 degrees, complete the flip
      if (Math.abs(flipDiff) > 60) {
        if (flipDiff > 0) {
          targetFlip = startFlip + 180;
        } else {
          targetFlip = startFlip - 180;
        }
      } else {
        // Did not swipe enough, snap back to initial face
        targetFlip = startFlip;
      }

      // Check if it's a new face and increment count
      if (targetFlip !== startFlip) {
        const isBack = Math.abs(targetFlip / 180) % 2 === 1;
        if (isBack) {
          flipCount++;
          updateSecretValues();
        }
      }

      // Reset Y float
      targetY = 0;
    });

    // RequestAnimationFrame Loop for smooth interpolation
    function animate() {
      // Lerp Y translation smoothly
      currentY += (targetY - currentY) * 0.1;

      // Lerp flip angle
      if (isTouching) {
        // Higher responsiveness when finger is on screen
        currentFlip += (targetFlip - currentFlip) * 0.4;
      } else {
        // Smooth snap when finger is released
        currentFlip += (targetFlip - currentFlip) * 0.15;
      }

      // Apply slight vertical tilt based on y position
      const tiltX = -currentY * 0.1;

      card.style.transform = `translateY(${currentY}px) rotateX(${tiltX}deg) rotateY(${currentFlip}deg)`;

      requestAnimationFrame(animate);
    }
    animate();
  }

  // --- 5. Pachinko / Secret Reveal Logic ---
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
        el.style.color = '#fbbc04'; // Lock to Google Yellow
      }
    });
  }

  // --- 6. Background Particles ---
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
    const particleCount = 40; // Tech-particle density

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.size = Math.random() * 2 + 1;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = (Math.random() - 0.5) * 0.4 - 0.1; // slow drift upwards
        this.life = Math.random() * Math.PI * 2;
        // Shapes: dot, square, small cross
        const rand = Math.random();
        this.type = rand > 0.8 ? 'cross' : (rand > 0.5 ? 'square' : 'dot');
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life += 0.015;

        // Wrap around
        if (this.x < 0) this.x = w;
        if (this.x > w) this.x = 0;
        if (this.y < 0) this.y = h;
        if (this.y > h) this.y = 0;
      }
      draw() {
        // Pulsing alpha
        const alpha = (Math.sin(this.life) * 0.5 + 0.5) * 0.4 + 0.1;
        ctx.fillStyle = `rgba(154, 160, 166, ${alpha})`;
        ctx.strokeStyle = `rgba(154, 160, 166, ${alpha})`;
        ctx.lineWidth = 1;

        ctx.beginPath();
        if (this.type === 'dot') {
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (this.type === 'square') {
          ctx.rect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
          ctx.fill();
        } else if (this.type === 'cross') {
          ctx.moveTo(this.x - this.size * 2, this.y);
          ctx.lineTo(this.x + this.size * 2, this.y);
          ctx.moveTo(this.x, this.y - this.size * 2);
          ctx.lineTo(this.x, this.y + this.size * 2);
          ctx.stroke();
        }
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function animateParticles() {
      ctx.clearRect(0, 0, w, h);

      // Draw faint connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            // opacity based on distance
            const opacity = 0.15 * (1 - dist / 80);
            ctx.strokeStyle = `rgba(154, 160, 166, ${opacity})`;
            ctx.stroke();
          }
        }
      }

      particles.forEach(p => {
        p.update();
        p.draw();
      });

      requestAnimationFrame(animateParticles);
    }
    animateParticles();
  }

  initParticles();

});
