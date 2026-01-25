/* =========================================================
   EpicWorks — iframe auto-height helper
   ---------------------------------------------------------
   - Resizes section iframes to fit their content
   - Static-safe
   - No dependencies
   - Runs once on load and on resize
   ========================================================= */

(function () {
  function resizeIframe(frame) {
    try {
      const doc = frame.contentDocument || frame.contentWindow.document;
      if (!doc) return;

      const height = doc.documentElement.scrollHeight;
      frame.style.height = height + 'px';
    } catch (e) {
      // Fail silently (cross-origin safety)
    }
  }

  function resizeAllIframes() {
    document.querySelectorAll('.section-frame').forEach(resizeIframe);
  }

  // Resize each iframe when it loads
  document.querySelectorAll('.section-frame').forEach(frame => {
    frame.addEventListener('load', () => resizeIframe(frame));
  });

  // Also resize all on window load
  window.addEventListener('load', resizeAllIframes);

  // Resize all on viewport change
  window.addEventListener('resize', resizeAllIframes);
})();
/* =========================================================
   END iframe auto-height helper
   ========================================================= */