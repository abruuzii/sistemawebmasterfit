<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('horarios_clases', function (Blueprint $table) {
            $table->id();

            // FK a clases
            $table->foreignId('clase_id')
                ->constrained('clases')
                ->cascadeOnDelete();

            // FK a users (entrenador)
            $table->foreignId('entrenador_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->dateTime('fecha_inicio');
            $table->dateTime('fecha_fin');

            $table->string('sala')->nullable();
            $table->unsignedSmallInteger('cupo_maximo')->default(20);

            $table->enum('estado', ['ACTIVO', 'CANCELADO'])->default('ACTIVO');

            $table->timestamps();

            // Índices para búsquedas típicas
            $table->index(['clase_id', 'fecha_inicio']);
            $table->index(['entrenador_id', 'fecha_inicio']);
            $table->index(['estado', 'fecha_inicio']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('horarios_clases');
    }
};
