<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Laravel\Sanctum\HasApiTokens;
use App\Models\User;


class Cliente extends Model
{
    use HasFactory, HasApiTokens;

    protected $fillable = [
        'usuario_id',
        'nombre',
        'apellido',
        'cedula_identidad',
        'telefono',
        'direccion',
        'correo',
        'fecha_nacimiento',
        'estado',
        'foto',
        'peso',
        'altura',
        'condicion_medica',
        'membresia_id',
    ];

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function membresia()
    {
        return $this->belongsTo(Membresia::class);
    }

    public function asistencias()
    {
        return $this->hasMany(Asistencia::class);
    }

    public function transacciones()
    {
        return $this->hasMany(Transaccion::class);
    }

    // ✅ Progresos (ejercicios + otros)
    public function progresos()
    {
        return $this->hasMany(Progreso::class);
    }

    // ✅ Historial de peso usando progresos (requiere columnas tipo y peso en progresos)
    public function historialPesos()
    {
        return $this->hasMany(Progreso::class)->where('tipo', 'peso');
    }

    public function notificaciones()
    {
        return $this->hasMany(Notificacion::class);
    }
// App\Models\Cliente.php
public function ultimoPago()
{
    return $this->hasOne(\App\Models\Transaccion::class, 'cliente_id')
        ->where('tipo', 'pago')
        ->orderByRaw('COALESCE(fecha, created_at) DESC');
}

}
