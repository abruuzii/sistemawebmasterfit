// js/auth_guard.js
function getToken() {
  return localStorage.getItem('authToken')
    || localStorage.getItem('token')
    || localStorage.getItem('access_token');
}

async function getMe() {
  const token = getToken();
  if (!token) return null;

  try {
    if (window.loader) loader.show();
    const resp = await fetch(`${API_BASE_URL}/me`, {
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/json',
      },
    });

    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    return null;
  } finally {
    if (window.loader) loader.hide();
  }
}

// allowedRoles: ['admin','recepcionista', ...]
async function guardPage(allowedRoles = []) {
  const token = getToken();
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const me = await getMe();
  if (!me || !me.rol) {
    localStorage.removeItem('authToken');
    window.location.href = 'login.html';
    return;
  }

  const role = String(me.rol).toLowerCase();

  // Guarda user por si quieres usarlo en navbar ("Hola, ...")
  localStorage.setItem('authUser', JSON.stringify(me));

  if (allowedRoles.length && !allowedRoles.includes(role)) {
    // Determinar página válida según el rol
    const roleDefaultPages = {
      admin: 'dashboard.html',
      recepcionista: 'dashboard.html',
      entrenador: 'cliente_detalle.html'
    };

    // Mapeo de módulos permitidos por rol (igual al de header.js)
    const roleModules = {
      admin: ['dashboard', 'membresias', 'clientes', 'usuarios', 'reportes', 'cliente_detalle', 'clientes_vencimientos'],
      recepcionista: ['dashboard', 'membresias', 'clientes', 'cliente_detalle', 'clientes_vencimientos', 'reportes'],
      entrenador: ['clientes', 'cliente_detalle']
    };

    // Obtener módulos permitidos para este rol
    const allowedModules = roleModules[role] || [];
    
    // Mapear módulos a páginas HTML
    const moduleToPage = {
      'dashboard': 'dashboard.html',
      'membresias': 'membresias.html',
      'clientes': 'clientes.html',
      'cliente_detalle': 'cliente_detalle.html',
      'clientes_vencimientos': 'clientes_vencimientos.html',
      'usuarios': 'usuarios.html',
      'reportes': 'reportes.html'
    };

    // Buscar la primera página válida del rol
    let validPage = roleDefaultPages[role] || 'login.html';
    for (let mod of allowedModules) {
      if (moduleToPage[mod]) {
        validPage = moduleToPage[mod];
        break;
      }
    }

    localStorage.setItem('lastSafePage', validPage);
    
    // Opción 1: mandar a una página 403
    window.location.href = '403.html';
    // Opción 2: mandar al dashboard
    // window.location.href = 'dashboard.html';
    return;
  }
}
