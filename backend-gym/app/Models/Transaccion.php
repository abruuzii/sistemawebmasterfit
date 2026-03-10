<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaccion extends Model
{
    use HasFactory;

    protected $table = 'transacciones';

    protected $fillable = [
        'cliente_id',
        'membresia_id',
        'monto',
        'fecha',
        'tipo',
        'descripcion',
        'tipo_pago',       
        'comprobante_url', 
        'created_by',
        'fecha_inicio'
    ];

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    public function membresia()
    {
        return $this->belongsTo(Membresia::class);
    }
    public function creador()
{
    return $this->belongsTo(\App\Models\User::class, 'created_by');
}

}
