<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Entrenamiento extends Model
{
    use HasFactory;

    // Relación con Usuario (Entrenador)
    public function entrenador()
    {
        return $this->belongsTo(Usuario::class, 'entrenador_id');
    }
}

