// js/membresias.js
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // ====== ELEMENTOS ======
  const form = document.getElementById('formMembresia');
  const formTitle = document.getElementById('formTitle');
  const errorBox = document.getElementById('errorBox');

  const nombre = document.getElementById('nombre');
  const descripcion = document.getElementById('descripcion');
  const precio = document.getElementById('precio');
  const duracionTipo = document.getElementById('duracionTipo');
  const duracionValor = document.getElementById('duracionValor');
  const activo = document.getElementById('activo');

  const btnGuardar = document.getElementById('btnGuardar');
  const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');

  // Tabla (desktop)
  const tbody = document.getElementById('tbodyMembresias');
  const countLabel = document.getElementById('countLabel');

  // Cards (móvil)
  const cardsContainer = document.getElementById('membresiasCards');

  // Panel formulario + botón toggle
  const formPanel = document.getElementById('formPanel');
  const btnToggleForm = document.getElementById('btnToggleForm');

  let editingId = null;
  let cache = [];
  let errorTimer = null;

  // ====== UI: abrir/cerrar formulario ======
  function setFormOpen(open) {
    if (!formPanel) return;
    if (open) {
      formPanel.classList.remove('hidden');
      if (btnToggleForm) btnToggleForm.textContent = 'Ocultar formulario';
    } else {
      formPanel.classList.add('hidden');
      if (btnToggleForm) btnToggleForm.textContent = '+ Nueva membresía';
    }
  }

  function scrollToForm() {
    if (!formPanel) return;
    formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Form oculto por defecto (como pediste)
  setFormOpen(false);

  if (btnToggleForm) {
    btnToggleForm.addEventListener('click', () => {
      const isHidden = formPanel?.classList.contains('hidden');
      setFormOpen(isHidden); // si estaba oculto -> abrir, si estaba abierto -> ocultar
      if (isHidden) scrollToForm();
    });
  }

  // ====== ERRORES ======
  function clearError() {
    if (!errorBox) return;
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
  }

  function showError(msg, ms = 2500) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');

    if (errorTimer) clearTimeout(errorTimer);
    errorTimer = setTimeout(() => clearError(), ms);
  }

  // ====== HELPERS ======
  function duracionLabel(m) {
    const dias = Number(m?.duracion_dias || 0);
    const meses = Number(m?.duracion_meses || 0);
    if (dias > 0) return `${dias} día${dias === 1 ? '' : 's'}`;
    if (meses > 0) return `${meses} mes${meses === 1 ? '' : 'es'}`;
    return '-';
  }

  function resetForm() {
    editingId = null;
    if (formTitle) formTitle.textContent = 'Nueva membresía';
    if (btnGuardar) btnGuardar.textContent = 'Guardar membresía';
    if (btnCancelarEdicion) btnCancelarEdicion.classList.add('hidden');

    form.reset();
    duracionTipo.value = 'meses';
    activo.checked = true;

    // después de guardar/cancelar: ocultamos el formulario
    setFormOpen(false);
    clearError();
  }

  function fillForm(m) {
    editingId = m.id;
    if (formTitle) formTitle.textContent = `Editar membresía #${m.id}`;
    if (btnGuardar) btnGuardar.textContent = 'Actualizar membresía';
    if (btnCancelarEdicion) btnCancelarEdicion.classList.remove('hidden');

    nombre.value = m.nombre ?? '';
    descripcion.value = m.descripcion ?? '';
    precio.value = m.precio ?? 0;

    const dias = Number(m.duracion_dias || 0);
    const meses = Number(m.duracion_meses || 0);

    if (dias > 0) {
      duracionTipo.value = 'dias';
      duracionValor.value = dias;
    } else {
      duracionTipo.value = 'meses';
      duracionValor.value = meses > 0 ? meses : 1;
    }

    activo.checked = !!m.activo;

    // ✅ Abrir formulario al editar
    setFormOpen(true);
    scrollToForm();
  }

  function friendlyApiError(resp, data, action) {
    const rawMsg = (data?.message ?? '').toString();

    if (resp.status === 403 && (action === 'update' || action === 'delete')) {
      return 'No tienes permiso para realizar esta acción.';
    }
    if (rawMsg) return rawMsg;
    return 'Ocurrió un error inesperado.';
  }

  // ====== RENDER: Desktop tabla + Mobile cards ======
  function render() {
    if (countLabel) countLabel.textContent = `${cache.length} membresía(s)`;

    // ----- DESKTOP TABLA -----
    if (tbody) {
      tbody.innerHTML = '';

      if (cache.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="6" class="px-3 py-4 text-center text-gray-500">No hay membresías registradas.</td>`;
        tbody.appendChild(tr);
      } else {
        cache.forEach((m) => {
          const tr = document.createElement('tr');
          tr.className = 'border-b';

          tr.innerHTML = `
            <td class="px-3 py-2">${m.id}</td>
            <td class="px-3 py-2">${m.nombre ?? '-'}</td>
            <td class="px-3 py-2">$ ${Number(m.precio ?? 0).toFixed(2)}</td>
            <td class="px-3 py-2">${duracionLabel(m)}</td>
            <td class="px-3 py-2">
              <span class="px-2 py-1 rounded text-xs ${m.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
                ${m.activo ? 'Activa' : 'Inactiva'}
              </span>
            </td>
            <td class="px-3 py-2">
              <div class="flex gap-2 justify-end">
                <button
                  class="btn-edit inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold
                         bg-blue-50 text-blue-700 hover:bg-blue-100 ring-1 ring-inset ring-blue-200"
                  data-id="${m.id}">
                  ✏️ <span class="hidden lg:inline">Editar</span>
                </button>
              </div>
            </td>
          `;

          tbody.appendChild(tr);
        });
      }
    }

    // ----- MOBILE CARDS -----
    if (cardsContainer) {
      cardsContainer.innerHTML = '';

      if (cache.length === 0) {
        cardsContainer.innerHTML =
          `<div class="p-4 text-sm text-gray-500 text-center border rounded bg-gray-50">No hay membresías registradas.</div>`;
      } else {
        cache.forEach((m) => {
          const estadoBadge = m.activo
            ? `<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Activa</span>`
            : `<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">Inactiva</span>`;

          const card = document.createElement('div');
          card.className = 'bg-white border rounded-lg p-4 shadow-sm';
          card.innerHTML = `
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-sm text-gray-500">ID: <span class="font-medium text-gray-800">${m.id}</span></div>
                <div class="text-lg font-semibold text-gray-900 leading-tight mt-1">${m.nombre ?? '-'}</div>
                <div class="text-sm text-gray-600 mt-2">
                  <span class="font-medium text-gray-700">Precio:</span> $ ${Number(m.precio ?? 0).toFixed(2)}
                </div>
                <div class="text-sm text-gray-600 mt-1">
                  <span class="font-medium text-gray-700">Duración:</span> ${duracionLabel(m)}
                </div>
              </div>

              <div class="flex flex-col items-end gap-2">
                ${estadoBadge}
              </div>
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                class="btn-edit inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold
                       bg-blue-50 text-blue-700 hover:bg-blue-100 ring-1 ring-inset ring-blue-200"
                data-id="${m.id}">
                ✏️ Editar
              </button>
            </div>
          `;
          cardsContainer.appendChild(card);
        });
      }
    }
  }

  // ====== CARGAR LISTA ======
  async function cargar() {
    clearError();
    try {
      if (window.loader) loader.show();

      const resp = await fetch(`${API_BASE_URL}/membresias`, {
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/json',
        },
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.message || 'Error al cargar membresías');

      cache = Array.isArray(data) ? data : (data?.data ?? []);
      render();
    } catch (e) {
      console.error(e);
      showError(e.message || 'Error inesperado');
      cache = [];
      render();
    } finally {
      if (window.loader) loader.hide();
    }
  }

  // ====== CREAR / ACTUALIZAR ======
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    try {
      const tipo = duracionTipo.value; // dias | meses
      const val = parseInt(duracionValor.value, 10);

      if (!nombre.value.trim()) throw new Error('Nombre requerido.');
      if (!descripcion.value.trim()) throw new Error('Descripción requerida.');
      if (isNaN(val) || val < 1) throw new Error('Duración inválida, debe ser >= 1.');

      const payload = {
        nombre: nombre.value.trim(),
        descripcion: descripcion.value.trim(),
        precio: Number(precio.value || 0),
        activo: !!activo.checked,
      };

      if (tipo === 'dias') {
        payload.duracion_dias = val;
        payload.duracion_meses = null;
      } else {
        payload.duracion_meses = val;
        payload.duracion_dias = null;
      }

      btnGuardar.disabled = true;
      if (window.loader) loader.show();

      const url = editingId
        ? `${API_BASE_URL}/membresias/${editingId}`
        : `${API_BASE_URL}/membresias`;

      const method = editingId ? 'PUT' : 'POST';

      const resp = await fetch(url, {
        method,
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const action = editingId ? 'update' : 'create';
        throw new Error(friendlyApiError(resp, data, action));
      }

      resetForm();
      await cargar();
    } catch (e) {
      console.error(e);
      showError(e.message || 'Error inesperado');
    } finally {
      btnGuardar.disabled = false;
      if (window.loader) loader.hide();
    }
  });

  // Cancelar edición
  btnCancelarEdicion.addEventListener('click', () => resetForm());

  // ====== ACCIONES: Editar (tabla + cards) ======
  function handleEditClick(e) {
    const btnEdit = e.target.closest('.btn-edit');
    if (!btnEdit) return;

    const id = Number(btnEdit.dataset.id);
    const m = cache.find(x => Number(x.id) === id);
    if (m) fillForm(m);
  }

  if (tbody) tbody.addEventListener('click', handleEditClick);
  if (cardsContainer) cardsContainer.addEventListener('click', handleEditClick);

  // init
  resetForm();
  cargar();
});
