<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\EntrenamientoController;
use App\Http\Controllers\ProgresoController;
use App\Http\Controllers\AsistenciaController;
use App\Http\Controllers\TransaccionController;
use App\Http\Controllers\NotificacionController;
use App\Http\Controllers\UsuarioController;
use App\Http\Controllers\MembresiaController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ReportesController;
use App\Http\Controllers\ClienteAuthController;
use App\Http\Controllers\ClaseController;
use App\Http\Controllers\HorarioClaseController;
use App\Http\Controllers\ReservaClaseController;
use App\Http\Middleware\ClienteActive;

use Illuminate\Support\Facades\Mail;
use SendGrid\Mail\Mail as SendGridMail;

use App\Http\Controllers\Auth\PasswordResetController;

Route::post('/auth/forgot-password', [PasswordResetController::class, 'sendResetLink']);
Route::post('/auth/reset-password', [PasswordResetController::class, 'resetPassword']);
Route::post('login-cliente', [ClienteAuthController::class, 'login']);
Route::get('notificaciones/vencen-manana-test', [NotificacionController::class, 'vencenManana']);
// ===== CLASES / HORARIOS (públicos) =====
Route::get('clases', [ClaseController::class, 'index']);
Route::get('horarios-clases', [HorarioClaseController::class, 'index']);


Route::get('/test-email', function () {
    $email = new SendGridMail();

    $fromEmail = env('SENDGRID_FROM_EMAIL');
    $fromName  = env('SENDGRID_FROM_NAME', 'Sistema Gym');

    $email->setFrom($fromEmail, $fromName);
    $email->setSubject("Prueba de correo (SendGrid API)");
    $email->addTo("nestorhernan123@gmail.com", "Destino");
    $email->addContent("text/plain", "Prueba SendGrid API desde Railway");

    $sendgrid = new \SendGrid(env('SENDGRID_API_KEY'));
    $response = $sendgrid->send($email);

    return response()->json([
        'status' => $response->statusCode(),
        'body' => $response->body(),
    ]);
});


Route::middleware(['auth:sanctum_clientes'])->group(function () {
    Route::get('cliente/me', [ClienteAuthController::class, 'me']);
    Route::post('cliente/logout', [ClienteAuthController::class, 'logout']);
    });
    // ===== RESERVAS (CLIENTE) =====
Route::middleware(['auth:sanctum_clientes', ClienteActive::class])->group(function () {
    Route::get('reservas-clases/mias', [ReservaClaseController::class, 'mias']);
    Route::post('reservas-clases', [ReservaClaseController::class, 'storeCliente']);
    Route::patch('reservas-clases/{id}/cancelar', [ReservaClaseController::class, 'cancelarCliente'])
        ->whereNumber('id');
});


Route::post('register', [AuthController::class, 'register']);
Route::post('login', [AuthController::class, 'login']);

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::get('clientes/{cliente}/reservas', [ReservaClaseController::class, 'historialCliente'])
    ->whereNumber('cliente')
    ->middleware('role:admin,recepcionista,entrenador');

        // ===== RESERVAS (PERSONAL) =====
    Route::get('reservas-clases', [ReservaClaseController::class, 'index'])
        ->middleware('role:admin,recepcionista,entrenador');

    Route::post('reservas-clases/admin', [ReservaClaseController::class, 'storePersonal'])
        ->middleware('role:admin,recepcionista');

    Route::patch('reservas-clases/{id}/cancelar-admin', [ReservaClaseController::class, 'cancelarPersonal'])
        ->whereNumber('id')
        ->middleware('role:admin,recepcionista,entrenador');
    // PDF historial pagos (descarga)
  Route::get('clientes/{cliente}/historial-pdf', [ReportesController::class, 'historialPagosPdf'])
    ->whereNumber('cliente')
    ->middleware('role:admin,recepcionista,entrenador');

  // ===== PROGRESOS / PESOS =====
  Route::get('clientes/{cliente}/pesos', [ClienteController::class, 'historialPesos'])
      ->whereNumber('cliente')
      ->middleware('role:admin,recepcionista,entrenador');

  Route::get('clientes/{cliente}/ejercicios', [ProgresoController::class, 'historialEjercicios'])
      ->whereNumber('cliente')
      ->middleware('role:admin,recepcionista,entrenador');

  Route::post('clientes/{cliente}/ejercicios', [ProgresoController::class, 'registrarEjercicio'])
      ->whereNumber('cliente')
      ->middleware('role:admin,recepcionista,entrenador');

  // ===== REPORTES =====
  Route::get('reportes/clientes', [ReportesController::class, 'clientes'])
      ->middleware('role:admin,recepcionista');

  Route::get('reportes/ingresos', [ReportesController::class, 'ingresos'])
      ->middleware('role:admin,recepcionista');

  Route::get('reportes/usuarios', [ReportesController::class, 'usuariosActivos'])
      ->middleware('role:admin,recepcionista');

  Route::get('reportes/pagos-por-usuario', [ReportesController::class, 'pagosPorUsuario'])
      ->middleware('role:admin,recepcionista');

  // ===== AUTH =====
  Route::post('logout', [AuthController::class, 'logout']);
  Route::get('me', [AuthController::class, 'me']);

  // ===== DASHBOARD =====
  Route::get('dashboard/home', [DashboardController::class, 'home'])
      ->middleware('role:admin,recepcionista');

  Route::get('clientes/por-vencer', [ClienteController::class, 'clientesPorVencer'])
      ->middleware('role:admin,recepcionista');

  Route::get('clientes/vencidos', [ClienteController::class, 'clientesVencidos'])
      ->middleware('role:admin,recepcionista');

  // ===== USUARIOS =====
  Route::apiResource('usuarios', UsuarioController::class)->middleware('role:admin');

  Route::put('usuarios/{id}/toggle-active', [UsuarioController::class, 'toggleActive'])
      ->whereNumber('id')
      ->middleware('role:admin');

  Route::get('usuarios-home', [UsuarioController::class, 'home'])
      ->middleware('role:admin');

  // ===== MEMBRESIAS =====
  Route::get('membresias', [MembresiaController::class, 'index'])
      ->middleware('role:admin,recepcionista,entrenador');

  Route::post('membresias', [MembresiaController::class, 'store'])
      ->middleware('role:admin');

  Route::put('membresias/{membresia}', [MembresiaController::class, 'update'])
      ->middleware('role:admin');

  Route::delete('membresias/{membresia}', [MembresiaController::class, 'destroy'])
      ->middleware('role:admin');

  // ===== CLIENTES =====

  // ✅ 1) RUTA NUEVA PAGINADA
  Route::get('clientes/lista', [ClienteController::class, 'listaPaginada'])
      ->middleware('role:admin,recepcionista,entrenador');

  // Home/atajos
  Route::get('clientes/vencimientos-home', [ClienteController::class, 'vencimientosHome'])
      ->middleware('role:admin,recepcionista');
  Route::get('clientes', [ClienteController::class, 'index'])
      ->middleware('role:admin,recepcionista,entrenador');

  // ✅ 2) TODAS LAS RUTAS CON {cliente} SOLO NÚMEROS
  Route::get('clientes/{cliente}', [ClienteController::class, 'show'])
      ->whereNumber('cliente')
      ->middleware('role:admin,recepcionista,entrenador');

  Route::get('clientes/{cliente}/home', [ClienteController::class, 'home'])
      ->whereNumber('cliente')
      ->middleware('role:admin,recepcionista,entrenador');

  Route::post('clientes', [ClienteController::class, 'store'])
      ->middleware('role:admin,recepcionista');

  Route::put('clientes/{cliente}', [ClienteController::class, 'update'])
      ->whereNumber('cliente')
      ->middleware('role:admin,recepcionista');

  Route::delete('clientes/{cliente}', [ClienteController::class, 'destroy'])
      ->whereNumber('cliente')
      ->middleware('role:admin,recepcionista');

  // ===== TRANSACCIONES =====
  Route::get('transacciones/cliente/{cliente_id}', [TransaccionController::class, 'transaccionesCliente'])
      ->whereNumber('cliente_id')
      ->middleware('role:admin,recepcionista,entrenador');

  Route::post('transacciones', [TransaccionController::class, 'store'])
      ->middleware('role:admin,recepcionista');

  Route::get('transacciones', [TransaccionController::class, 'index'])
      ->middleware('role:admin');
Route::middleware(['auth:sanctum', 'active', 'role:admin'])->group(function () {
    Route::post('notificaciones/vencen-manana', [NotificacionController::class, 'vencenManana']);
});

});
