// js/auth.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const errorBox = document.getElementById('errorBox');
  const loginButton = document.getElementById('loginButton');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    errorBox.classList.add('hidden');
    errorBox.textContent = '';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    loginButton.disabled = true;
    loginButton.textContent = 'Ingresando...';

    try {
      if (window.loader) loader.show();
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        errorBox.textContent = data.message || 'Error al iniciar sesión';
        errorBox.classList.remove('hidden');
      } else {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('authUser', JSON.stringify(data.user));
        localStorage.setItem('rol', data.user.rol);
        // Redirección por rol (ajusta según tu política)
        const role = (data.user.rol || data.user.role || '').toLowerCase();
        const redirectMap = {
          admin: 'dashboard.html',
          recepcionista: 'dashboard.html',
          entrenador: 'clientes.html'
        };

        window.location.href = redirectMap[role] || 'dashboard.html';
      }
    } catch (err) {
      errorBox.textContent = 'Error al conectarse al servidor';
      errorBox.classList.remove('hidden');
    } finally {
      if (window.loader) loader.hide();
      loginButton.disabled = false;
      loginButton.textContent = 'Ingresar';
    }
  });

  // Toggle para mostrar/ocultar contraseña
  const togglePasswordBtn = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  const eyeIcon = document.getElementById('eyeIcon');

  if (togglePasswordBtn) {
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
