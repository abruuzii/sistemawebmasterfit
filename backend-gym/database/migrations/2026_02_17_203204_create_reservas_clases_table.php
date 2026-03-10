<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservas_clases', function (Blueprint $table) {
            $table->id();

            // FK a horarios_clases
            $table->foreignId('horario_id')
                ->constrained('horarios_clases')
                ->cascadeOnDelete();

            // FK a clientes (porque el cliente NO está en users)
            $table->foreignId('cliente_id')
                ->constrained('clientes')
                ->cascadeOnDelete();

            $table->enum('estado', ['CONFIRMADA', 'CANCELADA'])->default('CONFIRMADA');

            // fecha en que se realizó la reserva (en servidor)
            $table->dateTime('fecha_reserva')->useCurrent();

            $table->timestamps();

            // Evita que el mismo cliente se reserve 2 veces el mismo horario
            $table->unique(['horario_id', 'cliente_id']);

            // Índices útiles
            $table->index(['cliente_id', 'estado']);
            $table->index(['horario_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservas_clases');
    }
};
