(function () {
  const search = document.getElementById('cmd-search');
  const body = document.getElementById('commands-body');
  const empty = document.getElementById('commands-empty');
  if (!search || !body) return;

  const categories = body.querySelectorAll('.cmd-category');
  const cards = body.querySelectorAll('.cmd-card');

  function filterCommands() {
    const q = search.value.trim().toLowerCase();
    let visibleCards = 0;

    categories.forEach((cat) => {
      let catVisible = 0;
      cat.querySelectorAll('.cmd-card').forEach((card) => {
        const match = !q || (card.dataset.search || '').includes(q);
        card.classList.toggle('hidden', !match);
        if (match) {
          catVisible += 1;
          visibleCards += 1;
        }
      });
      cat.classList.toggle('hidden', catVisible === 0);
    });

    if (empty) empty.classList.toggle('hidden', visibleCards > 0);
  }

  search.addEventListener('input', filterCommands);
})();
