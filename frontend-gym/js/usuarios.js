// js/usuarios.js
const token = localStorage.getItem('authToken');
if (!token) window.location.href = 'login.html';

let usuarios = [];
let usuarioLogueadoId = null;

document.addEventListener('DOMContentLoaded', () => {
  cargarHomeUsuarios();

  const busqueda = document.getElementById('busqueda');
  if (busqueda) busqueda.addEventListener('input', filtrarUsuarios);
});

// ===============================
// Helpers de errores
// ===============================
function mostrarError(msg) {
  const box = document.getElementById('errorBox');
  if (!box) return;
  box.textContent = msg;
  box.classList.remove('hidden');
}

function ocultarError() {
  const box = document.getElementById('errorBox');
  if (!box) return;
  box.textContent = '';
  box.classList.add('hidden');
}

// ===============================
// ✅ 1 sola petición: /usuarios-home
// ===============================
async function cargarHomeUsuarios() {
  try {
    ocultarError();
    if (window.loader) loader.show();

    const resp = await fetch(`${API_BASE_URL}/usuarios-home`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (resp.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.location.href = 'login.html';
      return;
    }

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.message || 'Error al cargar usuarios');

    // me
    const me = data.me || {};
    usuarioLogueadoId = me?.id ?? null;

    // Guarda authUser para que header.js lo use sin pedir /me
    try {
      localStorage.setItem('authUser', JSON.stringify(me));
    } catch {}

    // usuarios
    usuarios = Array.isArray(data.usuarios) ? data.usuarios : [];
    renderVista(usuarios);
  } catch (e) {
    console.error(e);
    mostrarError(e.message || 'Error inesperado');
    renderVista([]);
  } finally {
    if (window.loader) loader.hide();
  }
}

// ===============================
// Render: Desktop tabla + Móvil cards
// ===============================
function renderVista(lista) {
  renderTabla(lista);
  renderCards(lista);
}

// ===============================
// Renderizar tabla (DESKTOP)
// ===============================
function renderTabla(lista) {
  if (!Array.isArray(lista)) lista = [];

  const tbody = document.getElementById('tablaUsuarios');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (lista.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" class="px-3 py-3 text-center text-gray-500">No hay usuarios.</td>`;
    tbody.appendChild(tr);
    return;
  }

  lista.forEach((u) => {
    const rol = (u.rol || '').toLowerCase();
    const rolBadge =
      rol === 'admin'
        ? `<span class="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">Admin</span>`
        : `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">${u.rol ?? '-'}</span>`;

    const activo = !!u.is_active;
    const estadoBadge = activo
      ? `<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Activo</span>`
      : `<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">Inactivo</span>`;

    const toggleText = activo ? 'Desactivar' : 'Activar';
    const toggleBtnClass = activo
      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 ring-amber-200'
      : 'bg-green-50 text-green-700 hover:bg-green-100 ring-green-200';

    let acciones = `
      <div class="flex justify-end items-center gap-2 whitespace-nowrap">
        <button type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold
                 bg-blue-50 text-blue-700 hover:bg-blue-100 ring-1 ring-inset ring-blue-200"
          data-action="edit" data-id="${u.id}" title="Editar">
          ✏️ <span class="hidden sm:inline">Editar</span>
        </button>

        <button type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold
                 ring-1 ring-inset ${toggleBtnClass}"
          data-action="toggle" data-id="${u.id}" title="${toggleText}">
          ☑️ <span class="hidden sm:inline">${toggleText}</span>
        </button>
      </div>
    `;

    const nombreCompleto = `${u.nombre ?? '-'} ${u.apellido ?? ''}`.trim();

    const tr = document.createElement('tr');
    tr.className = 'border-t hover:bg-gray-50';
    tr.innerHTML = `
      <td class="p-3">${u.id ?? '-'}</td>
      <td class="p-3">${nombreCompleto}</td>
      <td class="p-3">${u.email ?? '-'}</td>
      <td class="p-3">${rolBadge}</td>
      <td class="p-3">${estadoBadge}</td>
      <td class="p-3 text-right">${acciones}</td>
    `;
    tbody.appendChild(tr);
  });

  bindAcciones(tbody);
}

// ===============================
// Renderizar CARDS (MÓVIL)
// ===============================
function renderCards(lista) {
  if (!Array.isArray(lista)) lista = [];

  const cont = document.getElementById('usuariosCards');
  if (!cont) return;

  cont.innerHTML = '';

  if (lista.length === 0) {
    cont.innerHTML = `<div class="p-4 text-sm text-gray-500 text-center border rounded bg-gray-50">No hay usuarios.</div>`;
    return;
  }

  lista.forEach((u) => {
    const nombreCompleto = `${u.nombre ?? '-'} ${u.apellido ?? ''}`.trim();

    const rol = (u.rol || '').toLowerCase();
    const rolBadge =
      rol === 'admin'
        ? `<span class="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">Admin</span>`
        : `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">${u.rol ?? '-'}</span>`;

    const activo = !!u.is_active;
    const estadoBadge = activo
      ? `<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Activo</span>`
      : `<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">Inactivo</span>`;

    const toggleText = activo ? 'Desactivar' : 'Activar';
    const toggleBtnClass = activo
      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 ring-amber-200'
      : 'bg-green-50 text-green-700 hover:bg-green-100 ring-green-200';

    // Botones (mismo data-action para reutilizar handlers)
    let botones = `
      <div class="mt-3 flex flex-wrap gap-2">
        <button type="button"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold
                 bg-blue-50 text-blue-700 hover:bg-blue-100 ring-1 ring-inset ring-blue-200"
          data-action="edit" data-id="${u.id}">
          ✏️ Editar
        </button>

        <button type="button"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold
                 ring-1 ring-inset ${toggleBtnClass}"
          data-action="toggle" data-id="${u.id}">
          ☑️ ${toggleText}
        </button>
    `;

    if (usuarioLogueadoId && u.id !== usuarioLogueadoId) {
      botones += `
        <button type="button"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold
                 bg-red-50 text-red-700 hover:bg-red-100 ring-1 ring-inset ring-red-200"
          data-action="delete" data-id="${u.id}">
          🗑️ Eliminar
        </button>
      `;
    }

    botones += `</div>`;

    const card = document.createElement('div');
    card.className = 'bg-white border rounded-lg p-4 shadow-sm';
    card.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-sm text-gray-500">ID: <span class="font-medium text-gray-800">${u.id ?? '-'}</span></div>
          <div class="text-lg font-semibold text-gray-900 leading-tight mt-1">${nombreCompleto}</div>
          <div class="text-sm text-gray-600 mt-1 break-all">${u.email ?? '-'}</div>
        </div>
        <div class="flex flex-col items-end gap-2">
          ${rolBadge}
          ${estadoBadge}
        </div>
      </div>

      ${botones}
    `;
    cont.appendChild(card);
  });

  bindAcciones(cont);
}

// ===============================
// ✅ Un solo binder de acciones para tabla y cards
// ===============================
function bindAcciones(container) {
  container.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const action = btn.dataset.action;
      if (action === 'edit') editarUsuario(id);
      if (action === 'toggle') toggleActivo(id);
      if (action === 'delete') eliminarUsuario(id);
    });
  });
}

// ===============================
// Filtro
// ===============================
function filtrarUsuarios() {
  const input = document.getElementById('busqueda');
  const valor = (input?.value || '').toLowerCase();

  const filtrados = usuarios.filter((u) => {
    const nombre = `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    return nombre.includes(valor) || email.includes(valor);
  });

  renderVista(filtrados);
}

// ===============================
// Modal
// ===============================
function abrirModalCrear() {
  document.getElementById('modalTitulo').textContent = 'Nuevo Usuario';

  document.getElementById('usuario_id').value = '';
  document.getElementById('nombre').value = '';
  document.getElementById('apellido').value = '';
  document.getElementById('usuario').value = '';
  document.getElementById('email').value = '';
  document.getElementById('password').value = '';
  document.getElementById('rol').value = '';

  const info = document.getElementById('passwordInfo');
  if (info) info.textContent = '(obligatorio)';

  // Mostrar campos usuario y password en modo creación
  document.getElementById('usuarioWrapper').classList.remove('hidden');
  document.getElementById('passwordWrapper').classList.remove('hidden');

  ocultarError();
  document.getElementById('modalUsuario').classList.remove('hidden');
}

function cerrarModal() {
  document.getElementById('modalUsuario').classList.add('hidden');
}

function editarUsuario(id) {
  const u = usuarios.find((x) => x.id === id);
  if (!u) return;

  document.getElementById('modalTitulo').textContent = 'Editar Usuario';

  document.getElementById('usuario_id').value = u.id;
  document.getElementById('nombre').value = u.nombre ?? '';
  document.getElementById('apellido').value = u.apellido ?? '';
  document.getElementById('usuario').value = u.usuario ?? '';
  document.getElementById('email').value = u.email ?? '';
  document.getElementById('password').value = '';
  document.getElementById('rol').value = u.rol ?? '';

  // Ocultar campos usuario y password en modo edición
  document.getElementById('usuarioWrapper').classList.add('hidden');
  document.getElementById('passwordWrapper').classList.add('hidden');

  ocultarError();
  document.getElementById('modalUsuario').classList.remove('hidden');
}

// ===============================
// Validaciones
// ===============================
function validarFormulario(esEdicion = false) {
  const nombre = document.getElementById('nombre').value.trim();
  const apellido = document.getElementById('apellido').value.trim();
  const usuario = document.getElementById('usuario').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const rol = document.getElementById('rol').value;

  if (!nombre) return 'El nombre es obligatorio';
  if (!apellido) return 'El apellido es obligatorio';
  // En creación: usuario es obligatorio. En edición: no se valida (está oculto)
  if (!esEdicion && !usuario) return 'El usuario es obligatorio';
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return 'Email inválido';
  if (!rol) return 'Debe seleccionar un rol';
  // En creación: password es obligatorio. En edición: no se valida (está oculto)
  if (!esEdicion && !password) return 'El password es obligatorio al crear';

  return null;
}

// ===============================
// Guardar (crear/editar)
// ===============================
async function guardarUsuario() {
  ocultarError();

  const id = document.getElementById('usuario_id').value;
  const esEdicion = !!id;

  const error = validarFormulario(esEdicion);
  if (error) {
    mostrarError(error);
    return;
  }

  const payload = {
    nombre: document.getElementById('nombre').value.trim(),
    apellido: document.getElementById('apellido').value.trim(),
    usuario: document.getElementById('usuario').value.trim(),
    email: document.getElementById('email').value.trim(),
    rol: document.getElementById('rol').value,
  };

  const password = document.getElementById('password').value.trim();
  if (password) payload.password = password;

  const url = esEdicion ? `${API_BASE_URL}/usuarios/${id}` : `${API_BASE_URL}/usuarios`;
  const method = esEdicion ? 'PUT' : 'POST';

  try {
    if (window.loader) loader.show();
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = 'login.html';
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      mostrarError(data.message || 'Error al guardar');
      return;
    }

    cerrarModal();
    await cargarHomeUsuarios();
  } catch (e) {
    console.error(e);
    mostrarError('Error de conexión');
  } finally {
    if (window.loader) loader.hide();
  }
}

// ===============================
// Activar / Desactivar
// ===============================
async function toggleActivo(id) {
  if (!confirm('¿Cambiar estado de este usuario?')) return;

  try {
    if (window.loader) loader.show();
    const res = await fetch(`${API_BASE_URL}/usuarios/${id}/toggle-active`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = 'login.html';
      return;
    }

    if (!res.ok) {
      alert(data.message || 'Error al cambiar estado');
      return;
    }

    await cargarHomeUsuarios();
  } catch (e) {
    alert('Error de conexión');
  } finally {
    if (window.loader) loader.hide();
  }
}

// ===============================
// Eliminar
// ===============================
async function eliminarUsuario(id) {
  if (!confirm('¿Seguro que quieres eliminar este usuario?')) return;

  try {
    if (window.loader) loader.show();
    const res = await fetch(`${API_BASE_URL}/usuarios/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = 'login.html';
      return;
    }

    await cargarHomeUsuarios();
  } catch (e) {
    alert('Error de conexión');
  } finally {
    if (window.loader) loader.hide();
  }
}

// Toggle para mostrar/ocultar contraseña
document.addEventListener('DOMContentLoaded', () => {
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const passwordInput = document.getElementById('password');
  const eyeIcon = document.getElementById('eyeIconModal');

  if (togglePasswordBtn && passwordInput && eyeIcon) {
    togglePasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      
      // Cambiar icono entre ojo abierto y cerrado
      if (isPassword) {
        // Mostrar icono de ojo cerrado
        eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
      } else {
        // Mostrar icono de ojo abierto
        eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
      }
    });
  }
});
