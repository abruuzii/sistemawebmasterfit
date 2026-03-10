<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Progreso extends Model
{
    use HasFactory;

    protected $fillable = [
        'cliente_id',
        'tipo',        
        'ejercicio',
        'marca_maxima',
        'unidad', 
        'peso',
        'fecha',
    ];

    protected $casts = [
        'fecha' => 'date:Y-m-d',
        'peso' => 'float',
        'marca_maxima' => 'float',
    ];

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }
}
