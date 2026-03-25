
// ===== HAMBURGER MENU TOGGLE =====
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.getElementById('navLinks');
  
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('open');
    });
    
    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        hamburger.classList.remove('active');
        navLinks.classList.remove('open');
      }
    });
  }

  // ===== TRUCK 3D PARALLAX EFFECT =====
  const truckCards = document.querySelectorAll('.truck-card');
  
  truckCards.forEach(card => {
    const container = card.querySelector('.truck-3d-container');
    const truck = card.querySelector('.truck-image');
    
    // Mouse move 3D tilt effect
    card.addEventListener('mousemove', (e) => {
      if (!container) return;
      
      const rect = card.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const rotateX = ((mouseY - centerY) / centerY) * 10;
      const rotateY = ((mouseX - centerX) / centerX) * -10;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
      
      if (truck) {
        truck.style.transform = `scale(1) rotateY(${rotateY * 0.5}deg) rotateX(${-rotateX * 0.5}deg) translateY(-15px)`;
      }
    });
    
    // Reset on mouse leave
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(-10px)';
      if (truck) {
        truck.style.transform = 'scale(1) rotateY(5deg) rotateX(-3deg) translateY(-15px)';
      }
    });
  });

  // ===== SCROLL PARALLAX FOR TRUCKS =====
  window.addEventListener('scroll', () => {
    truckCards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const scrollProgress = 1 - (rect.top / window.innerHeight);
      
      if (scrollProgress > -0.5 && scrollProgress < 1.5) {
        const parallaxValue = scrollProgress * 30;
        card.style.transform = `translateY(${-parallaxValue}px)`;
      }
    });
  });

  // ===== DYNAMIC SHADOW EFFECT =====
  truckCards.forEach(card => {
    const truck = card.querySelector('.truck-image');
    if (!truck) return;
    
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      
      const shadowX = (x - 0.5) * 40;
      const shadowY = (y - 0.5) * 40;
      
      truck.style.filter = `drop-shadow(${shadowX}px ${30 + shadowY}px 60px rgba(255, 30, 30, 0.25))`;
    });
    
    card.addEventListener('mouseleave', () => {
      truck.style.filter = 'drop-shadow(10px 30px 50px rgba(255, 30, 30, 0.2))';
    });
  });
});

// ===== CONFIGURATION =====
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbylb_cxvWH_5xhH3u9aDolm4_wn8rczAG1mDDP1sDWeyt8TfmDOVRrpDkDdYZ19QXtj/exec'; // Replace with your Web App URL after deploying

// ===== ANIMATED COUNTERS =====
function animateCounter(el, target, suffix = '+') {
  let current = 0;
  const step = Math.ceil(target / 60);
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = current + suffix;
  }, 30);
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCounter(document.getElementById('statTrips'), 500, '+');
      animateCounter(document.getElementById('statRoutes'), 15, '+');
      observer.disconnect();
    }
  });
}, { threshold: 0.5 });
observer.observe(document.querySelector('.stats-bar'));

// ===== SCROLL REVEAL =====
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.collab-card, .service-card, .route-item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  revealObserver.observe(el);
});

// ===== SMOOTH SCROLL HANDLER =====
// This avoids "Unsafe attempt to load URL" errors in local file:// environments
// while also providing a smoother navigation experience.
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;
    
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      e.preventDefault();
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      
      // Close mobile menu if open
      document.getElementById('navLinks').classList.remove('open');
    }
  });
});