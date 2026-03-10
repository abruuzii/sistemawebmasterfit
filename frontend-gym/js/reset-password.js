const form = document.getElementById('formReset');
const pass1 = document.getElementById('password');
const pass2 = document.getElementById('password2');
const msg = document.getElementById('msg');

const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const email = params.get('email');

function showMsg(text, type = 'ok') {
  msg.classList.remove('hidden');
  msg.textContent = text;

  msg.className = 'mb-4 rounded-lg p-3 text-sm ' + (
    type === 'ok'
      ? 'bg-green-50 text-green-700 border border-green-200'
      : 'bg-red-50 text-red-700 border border-red-200'
  );
}

if (!token || !email) {
  showMsg('El enlace es inválido o está incompleto. Solicita uno nuevo.', 'err');
  form.querySelector('button[type="submit"]').disabled = true;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.classList.add('hidden');

  const password = pass1.value;
  const password_confirmation = pass2.value;

  if (password !== password_confirmation) {
    return showMsg('Las contraseñas no coinciden.', 'err');
  }

  try {
    const resp = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email, token, password, password_confirmation }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      // Laravel suele devolver errores por campo
      const firstErr =
        data?.errors
          ? Object.values(data.errors).flat()[0]
          : null;

      throw new Error(firstErr || data?.message || 'No se pudo restablecer la contraseña.');
    }

    showMsg(data?.message || 'Contraseña actualizada. Ahora inicia sesión.', 'ok');

    setTimeout(() => {
      window.location.href = '/index.html';
    }, 1200);
  } catch (err) {
    showMsg(err.message || 'Error al restablecer contraseña.', 'err');
  }
});
