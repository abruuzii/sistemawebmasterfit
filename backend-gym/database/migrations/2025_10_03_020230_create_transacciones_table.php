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
    Schema::create('transacciones', function (Blueprint $table) {
        $table->id();
        $table->foreignId('cliente_id')->constrained('clientes')->onDelete('cascade');
        $table->decimal('monto', 10, 2);
        $table->timestamp('fecha')->default(DB::raw('CURRENT_TIMESTAMP'));
        $table->enum('tipo', ['pago', 'devolucion']);
        $table->foreignId('membresia_id')->constrained('membresias')->onDelete('cascade');
        $table->text('descripcion')->nullable();
        $table->timestamps();
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transacciones');
    }
};
