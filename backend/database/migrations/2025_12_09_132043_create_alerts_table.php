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
        Schema::create('alerts', function (Blueprint $table) {
        $table->id('AlertID');
        
        // Link to Visit Logs
        $table->unsignedBigInteger('LogID');
        $table->foreign('LogID')->references('LogID')->on('visit_logs')->onDelete('cascade');

        $table->string('AlertType', 100); // e.g., Overstay, Blacklist
        $table->dateTime('Timestamp')->useCurrent();
        $table->string('Status', 50)->default('Unresolved'); // Unresolved, Resolved
        $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alerts');
    }
};
