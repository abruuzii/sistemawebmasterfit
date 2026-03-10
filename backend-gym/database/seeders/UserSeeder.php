<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run()
    {
        User::updateOrCreate(
            ['email' => 'juan@example.com'],
            [
                'nombre' => 'Juan',
                'apellido' => 'Pérez',
                'password' => Hash::make('password123'),
                'usuario' => 'juanperez',
                'rol' => 'admin',
            ]
        );

        User::updateOrCreate(
            ['email' => 'maria@example.com'],
            [
                'nombre' => 'María',
                'apellido' => 'Gómez',
                'password' => Hash::make('password123'),
                'usuario' => 'mariagomez',
                'rol' => 'entrenador',
            ]
        );

        User::updateOrCreate(
            ['email' => 'carlos@example.com'],
            [
                'nombre' => 'Carlos',
                'apellido' => 'López',
                'password' => Hash::make('password123'),
                'usuario' => 'carloslopez',
                'rol' => 'recepcionista',
            ]
        );
    }
}
