<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use SendGrid\Mail\Mail as SendGridMail;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{

    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Campos que se pueden asignar masivamente.
     */
    protected $fillable = [
        'nombre',
        'apellido',
        'email',
        'usuario',
        'password',
        'rol',
        'imagen_perfil',
        'is_active',
    ];

    /**
     * Campos que deben ocultarse al serializar.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Conversiones automáticas de tipos.
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'is_active' => 'boolean',
        'password' => 'hashed',
    ];

    /**
     * Accesor para nombre completo.
     */
    public function getNombreCompletoAttribute(): string
    {
        return "{$this->nombre} {$this->apellido}";
    }

public function sendPasswordResetNotification($token)
{
    $frontend = rtrim(config('app.frontend_url'), '/');
    $emailEnc = urlencode($this->email);

    $url = "{$frontend}/reset-password?token={$token}&email={$emailEnc}";

    $mail = new SendGridMail();

    $fromEmail = env('SENDGRID_FROM_EMAIL') ?: env('MAIL_FROM_ADDRESS');
    $fromName  = env('SENDGRID_FROM_NAME', 'Sistema Gym');

    $mail->setFrom($fromEmail, $fromName);
    $mail->setSubject("Restablecer contraseña - Sistema GYM");
    $mail->addTo($this->email, $this->name ?? 'Usuario');

    $mail->addContent("text/plain", "Para restablecer tu contraseña abre este enlace:\n{$url}\n\nSi no lo solicitaste, ignora este correo.");

    $mail->addContent("text/html", "
      <div style='font-family:Arial,sans-serif'>
        <h2>Restablecer contraseña</h2>
        <p>Haz clic en el botón para crear una nueva contraseña:</p>
        <p><a href='{$url}' style='display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px'>
          Restablecer contraseña
        </a></p>
        <p style='color:#666'>Si no solicitaste esto, ignora el mensaje.</p>
      </div>
    ");

    $sendgrid = new \SendGrid(env('SENDGRID_API_KEY'));
    $sendgrid->send($mail);
}

}
