/* =========================================================
   EpicWorks — iframe navigation helper
   ---------------------------------------------------------
   - Replaces anchor navigation
   - Scrolls to iframe sections
   - No dependencies
   - No side effects
   ========================================================= */

(function () {
  document.addEventListener('click', function (e) {
    const link = e.target.closest('[data-scroll]');
    if (!link) return;

    e.preventDefault();

    const targetId = link.getAttribute('data-scroll');
    const target = document.getElementById(targetId);

    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
})();
