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
        Schema::create('visitors', function (Blueprint $table) {
        $table->id('VisitorID'); // Primary Key
        $table->longText('FacialData')->nullable(); // For face vector blob
        $table->string('FullName');
        $table->integer('Age')->nullable();
        $table->string('Sex', 50)->nullable();
        $table->string('AffiliationType', 100)->nullable(); // e.g. Student, Guest
        $table->string('ContactNumber', 20)->nullable();
        $table->string('EmailAddress')->nullable();
        $table->dateTime('FirstVisitDate')->useCurrent();
        $table->timestamps(); // Adds created_at and updated_at automatically
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('visitors');
    }
};
