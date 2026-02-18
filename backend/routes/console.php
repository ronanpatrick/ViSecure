<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule; // 👈 Import this

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// 👇 SCHEDULE THE OVERSTAY CHECK (Runs every minute)
Schedule::command('visecure:check-overstay')->everyMinute();