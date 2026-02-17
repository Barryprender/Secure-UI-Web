/**
 * Navigation Enhancement (OPTIONAL)
 *
 * This file is NOT required for navigation to work.
 * It only adds nice-to-have features:
 * - Active page highlighting based on current URL
 * - Auto-close mobile menu after clicking link
 * - Smooth scroll to top when clicking logo
 *
 * Total size: ~1KB
 */

(function() {
  'use strict';

  // 1. Highlight active page
  function setActivePage() {
    const currentPath = window.location.pathname;
    const links = document.querySelectorAll('.navbar-menu a');

    links.forEach(link => {
      // Remove existing active class
      link.classList.remove('active');
      link.removeAttribute('aria-current');

      // Check if link matches current page
      const linkPath = new URL(link.href).pathname;
      if (currentPath === linkPath || (linkPath !== '/' && currentPath.startsWith(linkPath))) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  // 2. Auto-close mobile menu after clicking a link
  function autoCloseMobileMenu() {
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelectorAll('.navbar-menu a');

    if (!navToggle) return;

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        // Uncheck the toggle (closes menu)
        navToggle.checked = false;
      });
    });
  }

  // 3. Smooth scroll to top when clicking logo (optional UX nicety)
  function smoothScrollToTop() {
    const logo = document.querySelector('.navbar-brand');

    if (!logo) return;

    logo.addEventListener('click', (e) => {
      // Only if on same page
      if (window.location.pathname === '/' && logo.href === window.location.href) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    setActivePage();
    autoCloseMobileMenu();
    smoothScrollToTop();
  }
})();
