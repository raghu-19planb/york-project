// The story player: a card in the Stories row opens its story in a tall frame, nine wide to sixteen high, the
// shape of a short video on a phone. The story itself is the real page, opened in story mode (short.js), so there
// is one of each thing and nothing is recorded. The frame can be made as tall as the screen and back, and a link
// goes to the full page with its notes and sources. Without JavaScript the cards are plain links to those pages.
(function () {
  const dialog = document.getElementById('short-dialog'); if (!dialog || !dialog.showModal) return;
  const frame = dialog.querySelector('iframe'), title = dialog.querySelector('.short-title'), full = dialog.querySelector('.short-full'), max = dialog.querySelector('.short-max'), close = dialog.querySelector('.short-close');
  function setMax(on) { dialog.classList.toggle('max', on); max.textContent = on ? 'Smaller' : 'Maximize'; max.setAttribute('aria-pressed', String(on)); }
  function shut() { frame.src = 'about:blank'; setMax(false); if (dialog.open) dialog.close(); } // stopping the page stops its sound too
  document.querySelectorAll('.story-card[data-short]').forEach(card => card.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; // a new tab or window is the visitor's choice
    e.preventDefault();
    title.textContent = card.querySelector('b').textContent; full.href = card.dataset.page || card.getAttribute('href');
    frame.title = title.textContent; frame.src = card.dataset.short; setMax(false); dialog.showModal();
  }));
  max.addEventListener('click', () => setMax(!dialog.classList.contains('max')));
  close.addEventListener('click', shut);
  dialog.addEventListener('close', () => { frame.src = 'about:blank'; setMax(false); });
  dialog.addEventListener('click', e => { if (e.target === dialog) shut(); }); // a click on the backdrop
})();
