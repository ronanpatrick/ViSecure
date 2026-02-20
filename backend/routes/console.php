<?php

use Illuminate\Support\Facades\Schedule;
use App\Models\VisitLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use App\Http\Controllers\MonitorController;

/*
|--------------------------------------------------------------------------
| Console Routes & Task Scheduling
|--------------------------------------------------------------------------
|
| This file is where you may define all of your closure-based console
| commands and schedule your recurring tasks for the ViSecure system.
|
*/

// 1. AUTOMATED OVERSTAY CHECK
// Runs every minute to find visitors who stayed longer than 4 hours.
Schedule::command('visecure:check-overstay')->everyMinute();

// 2. MIDNIGHT AUTO-CHECKOUT
// Finds anyone who forgot to tap out and signs them out at the end of the day.
// This keeps your "Currently Inside" count accurate for the next morning.
Schedule::call(function () {
    VisitLog::whereNull('ExitTimestamp')
        ->update([
            'ExitTimestamp' => Carbon::now(),
            'FlagReason' => 'System: Automatic Midnight Checkout'
        ]);
})->dailyAt('23:59');

// 3. AI SUMMARY PRE-WARM
// Generates the AI summary early in the morning so it's already cached 
// and ready when the first admin logs in.
Schedule::call(function () {
    app(MonitorController::class)->generateAISummary();
})->dailyAt('07:00');

// 4. AI COOLDOWN SAFETY VALVE
// Clears any stuck AI rate-limit cooldowns every hour to ensure 
// the analyst tab remains responsive.
Schedule::call(function () {
    Cache::forget('visecure_ai_cooldown');
})->hourly();

// 5. CACHE MAINTENANCE
// Cleans up old cache tags to keep the database size small.
Schedule::command('cache:prune-stale-tags')->daily();

// Legacy/Default Command
Schedule::command('inspire')->hourly();