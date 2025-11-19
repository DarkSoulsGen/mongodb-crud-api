// breadcrumb.js
document.addEventListener('DOMContentLoaded', () => {
  const bc = window.BREADCRUMB;
  const ol = document.getElementById('breadcrumb');
  if (!bc || !ol) return;

  ol.classList.add('breadcrumb', 'mb-0', 'text-light');

  ol.innerHTML = bc
    .map((item, idx) => {
      const isLast = idx === bc.length - 1;
      if (isLast || !item.href) {
        return `<li class="breadcrumb-item active text-light" aria-current="page">${item.label}</li>`;
      }
      return `<li class="breadcrumb-item">
                <a href="${item.href}" class="text-info">${item.label}</a>
              </li>`;
    })
    .join('');
});