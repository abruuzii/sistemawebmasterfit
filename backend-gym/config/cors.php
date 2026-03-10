<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],  // Permitir rutas api/* y CSRF

    'allowed_methods' => ['*'],  // Permitir todos los métodos HTTP (GET, POST, etc.)

    // Añadir el puerto 5500 de Live Server y los puertos de desarrollo comunes
    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5500', 
	'https://sistemawebgym.pages.dev',// Asegúrate de incluir esto para Live Server
    ],

    'allowed_origins_patterns' => [],  // No necesitas patrones específicos por ahora

    'allowed_headers' => ['*'],  // Permitir todos los encabezados

    'exposed_headers' => [],
    'max_age' => 0,

    'supports_credentials' => false,  // Normalmente se usa false para Bearer tokens
];
