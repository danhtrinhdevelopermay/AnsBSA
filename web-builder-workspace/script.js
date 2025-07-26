// landing-page.js

// --- Utilities ---
const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const smoothScroll = (target, duration = 500) => {
  const targetPosition = target.offsetTop;
  let startPosition = window.pageYOffset;
  const startTime = null;

  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1);

  const animation = (currentTime) => {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);
    const position = startPosition + (targetPosition - startPosition) * easeInOutCubic(progress);

    window.scrollTo(0, position);
    if (progress < 1) requestAnimationFrame(animation);
  };

  requestAnimationFrame(animation);
};


// --- Interactive Elements ---
const heroSection = document.querySelector('.hero');
const featureSections = document.querySelectorAll('.feature');
const contactForm = document.getElementById('contactForm');

// Hero section animation (example - parallax effect)
if (heroSection) {
  window.addEventListener('scroll', () => {
    const scrollPosition = window.pageYOffset;
    heroSection.style.backgroundPositionY = `${scrollPosition * 0.3}px`; // Adjust 0.3 for speed
  });
}

// Feature section animations (example - reveal on scroll)
featureSections.forEach(section => {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        section.classList.add('show');
      }
    });
  });
  observer.observe(section);
});

// Mobile-friendly interactions (example - hamburger menu)
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

if (hamburger && navMenu) {
  hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('active');
  });
}


// --- Form Handling ---
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(contactForm);
    const data = {};
    formData.forEach((value, key) => data[key] = value);

    try {
      const response = await fetch('/submit', { // Replace '/submit' with your backend endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Success message
      alert('Form submitted successfully!');
      contactForm.reset();
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error submitting form. Please try again later.');
    }
  });
}


// --- Smooth Scrolling on Links ---
const scrollLinks = document.querySelectorAll('a[href^="#"]');

scrollLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = link.getAttribute('href');
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      smoothScroll(targetElement);
    }
  });
});


// ---  Responsive adjustments (example) ---
if (isMobile()) {
  // Add mobile-specific styles or functionalities here
  console.log('Mobile device detected');
}