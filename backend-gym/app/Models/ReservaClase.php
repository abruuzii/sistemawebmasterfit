<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReservaClase extends Model
{
    use HasFactory;

    protected $table = 'reservas_clases';

    protected $fillable = [
        'horario_id',
        'cliente_id',
        'estado',
        'fecha_reserva',
    ];

    protected $casts = [
        'fecha_reserva' => 'datetime',
    ];

    public function horario()
    {
        return $this->belongsTo(HorarioClase::class, 'horario_id');
    }

    public function cliente()
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }
}
