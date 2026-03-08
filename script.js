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
    // Random increment to simulate real loading
    progress += Math.random() * 5 + 2; 
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
      // Slight delay to remove from DOM
      setTimeout(() => {
        loadingScreen.style.display = 'none';
        init3DCard();
      }, 800);
    }, 500);
  }

  // --- 3. Mosaic Canvas Effect ---
  const canvas = document.getElementById('mosaic-canvas');
  const ctx = canvas.getContext('2d');
  const blockSize = 15;
  
  function drawMosaic() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let x = 0; x < canvas.width; x += blockSize) {
      for (let y = 0; y < canvas.height; y += blockSize) {
        // Generate random grayscale shades
        const shade = Math.floor(Math.random() * 200 + 55); 
        ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
        ctx.fillRect(x, y, blockSize, blockSize);
      }
    }
  }
  // Change mosaic pixels frequently
  setInterval(drawMosaic, 100);

  // --- 4. 3D Card Floating & Flipping Logic ---
  const card = document.getElementById('id-card');
  let currentY = 0;      // Current vertical offset
  let targetY = 0;       // Target vertical offset
  let currentFlip = 0;   // Current Y rotation (flipping)
  let targetFlip = 0;    // Target Y rotation
  
  let flipCount = 0;     // Number of times card was flipped to the back

  let isTouching = false;
  let startX = 0;
  let startY = 0;

  function init3DCard() {
    document.addEventListener('touchstart', (e) => {
      isTouching = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      card.classList.remove('flip-animating');
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (!isTouching) return;
      // Prevent default scrolling to allow 3D card movement instead
      e.preventDefault(); 
      
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      
      const deltaX = touchX - startX;
      const deltaY = touchY - startY;

      // Vertical translation (floating up/down)
      targetY += deltaY * 0.1;
      // Constrain vertical floating
      if (targetY > 150) targetY = 150;
      if (targetY < -150) targetY = -150;

      startY = touchY;
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      if (!isTouching) return;
      isTouching = false;
      
      const endX = e.changedTouches[0].clientX;
      const swipeDistanceX = endX - startX;

      // Swipe horizontally to flip logic
      if (Math.abs(swipeDistanceX) > 50) {
        card.classList.add('flip-animating');
        if (swipeDistanceX > 0) {
          // Swipe Right
          targetFlip += 180;
        } else {
          // Swipe Left
          targetFlip -= 180;
        }
        
        // Ensure flip resolves to an exact multiple of 180
        targetFlip = Math.round(targetFlip / 180) * 180;
        
        // If the card is now showing its back (180, 540, etc)
        const isBack = Math.abs(targetFlip / 180) % 2 === 1;
        if (isBack) {
          flipCount++;
          updateSecretValues();
        }

      }
      
      // Gradually bring Y back to center after release
      targetY = 0;
    });

    // Animation Loop
    function animate() {
      // Smooth lerp for Y translation
      currentY += (targetY - currentY) * 0.1;
      
      // If we're animating flip via CSS transition, we just set the transform
      // We also apply tilt based on current floating Y for extra depth
      const tiltX = -currentY * 0.2; 
      
      card.style.transform = `translateY(${currentY}px) rotateX(${tiltX}deg) rotateY(${targetFlip}deg)`;
      
      requestAnimationFrame(animate);
    }
    animate();
  }

  // --- 5. Pachinko / Secret Reveal Logic ---
  const secretElements = document.querySelectorAll('.secret-value');
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  
  secretElements.forEach(el => {
    const originalText = el.innerText;
    const targetText = el.getAttribute('data-target');
    const reqFlips = parseInt(el.getAttribute('data-req'), 10);
    
    // Pachinko effect interval
    el.pachinkoInterval = setInterval(() => {
      // Only run pachinko if not revealed
      if (!el.classList.contains('revealed')) {
        let randomString = '';
        for(let i=0; i<targetText.length; i++) {
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
        // Reveal!
        el.classList.add('revealed');
        el.innerText = targetText;
        clearInterval(el.pachinkoInterval);
        el.style.color = '#fff';
        el.style.textShadow = '0 0 10px #fff';
      }
    });
  }
});
