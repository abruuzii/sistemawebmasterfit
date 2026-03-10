// js/loader.js
// Simple global loader with reference counting to support concurrent requests.
(function(){
  const existing = document.getElementById('globalLoader');
  if (existing) {
    window.loader = existing._loaderApi;
    return;
  }

  let count = 0;

  const div = document.createElement('div');
  div.id = 'globalLoader';
  div.style.position = 'fixed';
  div.style.inset = '0';
  div.style.background = 'rgba(0,0,0,0.25)';
  div.style.display = 'none';
  div.style.zIndex = '9999';
  div.style.alignItems = 'center';
  div.style.justifyContent = 'center';

  const spinner = document.createElement('div');
  spinner.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
      <div class="loader-dot" style="width:48px;height:48px;border-radius:50%;border:6px solid rgba(255,255,255,0.2);border-top-color:white;animation:spin 1s linear infinite"></div>
      <div style="color:white;font-weight:600">Cargando...</div>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg);}}</style>
  `;

  div.appendChild(spinner);
  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(div);
  });

  const api = {
    show() {
      count = Math.max(0, count + 1);
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.justifyContent = 'center';
    },
    hide(force = false) {
      if (force) count = 0;
      else count = Math.max(0, count - 1);
      if (count <= 0) {
        count = 0;
        div.style.display = 'none';
      }
    }
  };

  div._loaderApi = api;
  window.loader = api;
})();