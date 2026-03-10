<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Cliente;
use App\Models\User;
use App\Models\Membresia;

class ClienteSeeder extends Seeder
{
    public function run()
    {
        $usuario = User::where('usuario', 'carloslopez')->first();  // Usuario Carlos
        $membresia = Membresia::first();  // Una membresía disponible

        // Evita que el seeder reviente si faltan datos previos
        if (!$usuario || !$membresia) {
            return;
        }

        Cliente::updateOrCreate(
            ['usuario_id' => $usuario->id],
            [
                'nombre' => $usuario->nombre, // ✅ ESTE CAMPO ES OBLIGATORIO EN TU TABLA
                'cedula_identidad' => '1721212345',
                'telefono' => '0987654321',
                'direccion' => 'Av. de los Andes, Ambato',
                'correo' => 'carlos@example.com',
                'fecha_nacimiento' => '1990-04-25',
                'estado' => 'activo',
                'foto' => 'cliente_default.jpg',
                'peso' => 75.5,
                'altura' => 1.80,
                'condicion_medica' => 'Ninguna',
                'membresia_id' => $membresia->id,
            ]
        );
    }
}
