const form = document.getElementById('formForgot');
const emailInput = document.getElementById('email');
const msg = document.getElementById('msg');

function showMsg(text, type = 'ok') {
  msg.classList.remove('hidden');
  msg.textContent = text;

  msg.className = 'mb-4 rounded-lg p-3 text-sm ' + (
    type === 'ok'
      ? 'bg-green-50 text-green-700 border border-green-200'
      : 'bg-red-50 text-red-700 border border-red-200'
  );
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.classList.add('hidden');

  const email = emailInput.value.trim().toLowerCase();
  if (!email) return;

  try {
    const resp = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    // Por seguridad el backend puede responder 200 siempre
    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      throw new Error(data?.message || 'No se pudo enviar el enlace. Intenta de nuevo.');
    }

    showMsg(data?.message || 'Enlace de recuperación enviado correctamente. Revisa tu bandeja.', 'ok');
    form.reset();
  } catch (err) {
    showMsg(err.message || 'Error al enviar enlace.', 'err');
  }
});
