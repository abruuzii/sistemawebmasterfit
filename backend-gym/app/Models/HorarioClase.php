<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HorarioClase extends Model
{
    use HasFactory;

    protected $table = 'horarios_clases';

    protected $fillable = [
        'clase_id',
        'entrenador_id',
        'fecha_inicio',
        'fecha_fin',
        'sala',
        'cupo_maximo',
        'estado',
    ];

    protected $casts = [
        'fecha_inicio' => 'datetime',
        'fecha_fin' => 'datetime',
        'cupo_maximo' => 'integer',
    ];

    public function clase()
    {
        return $this->belongsTo(Clase::class, 'clase_id');
    }

    public function entrenador()
    {
        return $this->belongsTo(User::class, 'entrenador_id');
    }

    public function reservas()
    {
        return $this->hasMany(ReservaClase::class, 'horario_id');
    }

    // Solo reservas confirmadas (útil para contar cupos)
    public function reservasConfirmadas()
    {
        return $this->hasMany(ReservaClase::class, 'horario_id')
            ->where('estado', 'CONFIRMADA');
    }
}
