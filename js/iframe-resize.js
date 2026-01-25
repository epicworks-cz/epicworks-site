/* =========================================================
   EpicWorks — iframe auto-height helper
   ---------------------------------------------------------
   - Resizes section iframes to fit their content
   - Static-safe
   - No dependencies
   - Runs once on load and on resize
   ========================================================= */

(function () {
  function resizeIframes() {
    const frames = document.querySelectorAll('.section-frame');

    frames.forEach(frame => {
      try {
        const doc = frame.contentDocument || frame.contentWindow.document;
        if (!doc) return;

        const height = doc.documentElement.scrollHeight;
        frame.style.height = height + 'px';
      } catch (e) {
        // Fail silently (cross-origin safety)
      }
    });
  }

  // Resize when iframes load
  window.addEventListener('load', resizeIframes);

  // Resize on viewport change
  window.addEventListener('resize', resizeIframes);
})();
/* =========================================================
   END iframe auto-height helper
   ========================================================= */