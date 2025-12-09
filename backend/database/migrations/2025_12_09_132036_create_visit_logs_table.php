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
        Schema::create('visit_logs', function (Blueprint $table) {
        $table->id('LogID');
        // Link to Visitors Table
        $table->unsignedBigInteger('VisitorID');
        $table->foreign('VisitorID')->references('VisitorID')->on('visitors')->onDelete('cascade');

        $table->dateTime('EntryTimestamp')->useCurrent();
        $table->dateTime('ExitTimestamp')->nullable();
        $table->dateTime('ExpectedExitTimestamp')->nullable();
        $table->text('PurposeOfVisit')->nullable();
        $table->string('PersonToVisit')->nullable();
        $table->string('DepartmentToVisit')->nullable();
        $table->string('Status', 50)->default('Active'); // Active, Completed, Overstay
        $table->boolean('PrivacyConsentGiven')->default(false);
        $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('visit_logs');
    }
};
