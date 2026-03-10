<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Membresia;

class MembresiaSeeder extends Seeder
{
    public function run()
    {
        Membresia::create([
            'nombre' => 'Membresía Básica',
            'descripcion' => 'Acceso a todas las clases de CrossFit, 6 días a la semana.',
            'precio' => 100.00,
            'duracion_dias' => 24,
            'activo' => true,
        ]);

        Membresia::create([
            'nombre' => 'Membresía Premium',
            'descripcion' => 'Acceso ilimitado a clases y seguimiento personalizado.',
            'precio' => 150.00,
            'duracion_dias' => 24,
            'activo' => true,
        ]);
    }
}

