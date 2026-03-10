<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    Schema::create('clientes', function (Blueprint $table) {
        $table->id();
        $table->foreignId('usuario_id')->constrained('users')->onDelete('cascade');
        $table->string('cedula_identidad')->unique();
        $table->string('telefono');
        $table->text('direccion');
        $table->string('correo')->unique();
        $table->date('fecha_nacimiento');
        $table->enum('estado', ['activo', 'inactivo', 'pendiente', 'suspendido'])->default('activo');
        $table->string('foto')->default('cliente_default.jpg');
        $table->decimal('peso', 5, 2)->nullable();
        $table->decimal('altura', 5, 2)->nullable();
        $table->text('condicion_medica')->nullable();
        $table->foreignId('membresia_id')->constrained('membresias')->onDelete('cascade');
        $table->timestamps();
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clientes');
    }
};
