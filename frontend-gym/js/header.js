// js/header.js
document.addEventListener('DOMContentLoaded', () => {
  const userEl = document.getElementById('currentUserDisplay');
  const logoutBtn = document.getElementById('logoutBtn');

  function renderLoggedOut() {
    if (!userEl) return;
    userEl.innerHTML = '';
    const a = document.createElement('a');
    a.href = 'login.html';
    a.textContent = 'Iniciar sesión';
    a.className = 'text-sm text-blue-600 hover:underline';
    userEl.appendChild(a);
  }

  function handleLogout() {
    // Limpiar localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    
    // Redirigir a login
    window.location.href = 'login.html';
  }

  // Adjuntar handler de logout al botón si existe
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  try {
    const raw = localStorage.getItem('authUser') || null;
    const user = raw ? JSON.parse(raw) : null;

    if (!user) {
      renderLoggedOut();
      return;
    }

    // Determinar nombre a mostrar
    const name =
      user.nombre || user.name || (user.usuario && (user.usuario.nombre || user.usuario.apellido)) || user.email || '';

    if (userEl) {
      // Intentar leer el rol desde varias propiedades posibles
      const rawRole = user.rol || user.role || user.rol_name || (user.usuario && user.usuario.rol) || '';
      const role = rawRole ? String(rawRole).toLowerCase() : '';

      // Formatear rol legible
      const roleLabel = role
        ? `<span class="ml-2 inline-block px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">${role.charAt(0).toUpperCase() + role.slice(1)}</span>`
        : '';

      userEl.innerHTML = name ? `Hola, ${name}` + roleLabel : (roleLabel || '');
      userEl.classList.add('text-sm', 'text-gray-700');
    }
  } catch (e) {
    renderLoggedOut();
  }
});

// Control de visibilidad de módulos por rol
document.addEventListener('DOMContentLoaded', () => {
  try {
    const raw = localStorage.getItem('authUser') || null;
    const user = raw ? JSON.parse(raw) : null;

    // Mapeo cliente-side por defecto (mejor si el backend devuelve permisos)
    const roleModules = {
      admin: ['dashboard', 'membresias', 'clientes', 'usuarios', 'reportes', 'cliente_detalle', 'clientes_vencimientos'],
      recepcionista: ['dashboard', 'membresias', 'clientes', 'cliente_detalle', 'clientes_vencimientos', 'reportes'],
      entrenador: ['clientes', 'cliente_detalle']
    };

    const role = user ? (String(user.rol || user.role || '').toLowerCase()) : '';
    const allowed = (user && user.modules) ? user.modules : (roleModules[role] || []);

    // Ocultar/mostrar enlaces con data-module
    document.querySelectorAll('[data-module]').forEach(el => {
      const mod = el.getAttribute('data-module');
      if (!allowed.includes(mod)) el.classList.add('hidden');
      else el.classList.remove('hidden');
    });
  } catch (err) {
    // no hacemos nada si hay fallo
  }
});
