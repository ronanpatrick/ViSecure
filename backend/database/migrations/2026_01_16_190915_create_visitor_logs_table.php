<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::create('visitor_logs', function (Blueprint $table) {
        $table->id();
        $table->string('name')->default('Unknown'); // Stores "Ronan" or "Unknown"
        $table->string('status'); // Stores "GRANTED", "DENIED", or "ERROR"
        $table->string('image_path')->nullable(); // Optional: Link to the photo taken
        $table->timestamp('visited_at'); // The exact time of scan
        $table->timestamps(); // Created_at and Updated_at
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('visitor_logs');
    }
};
