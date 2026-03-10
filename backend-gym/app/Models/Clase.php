<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Clase extends Model
{
    use HasFactory;

    protected $table = 'clases';

    protected $fillable = [
        'nombre',
        'descripcion',
        'duracion_minutos',
        'activa',
    ];

    protected $casts = [
        'activa' => 'boolean',
        'duracion_minutos' => 'integer',
    ];

    public function horarios()
    {
        return $this->hasMany(HorarioClase::class, 'clase_id');
    }
}
