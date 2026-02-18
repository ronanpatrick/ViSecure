<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\VisitorController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\API\VisitorLogController;
use App\Http\Controllers\MonitorController;

// ----------------------------------------------------------------
// 🔐 AUTHENTICATION
// ----------------------------------------------------------------
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// ----------------------------------------------------------------
// 👤 VISITOR REGISTRATION & LOOKUP
// ----------------------------------------------------------------
Route::post('/register', [VisitorController::class, 'store']);
Route::post('/check-user', [VisitorController::class, 'checkUser']);
Route::get('/visitors', [VisitorController::class, 'index']);
Route::get('/visitors/{id}', [VisitorController::class, 'show']);

// ----------------------------------------------------------------
// 👮‍♂️ ADMIN & OPERATIONS
// ----------------------------------------------------------------
// Master List
Route::get('/admin/all-visitors', [VisitorController::class, 'getAllVisitors']);

// Force Checkout
Route::post('/admin/checkout', [VisitorController::class, 'checkout']);

// Toggle Watchlist (Ban/Unban) - Used by Live Dashboard
Route::post('/visitors/{id}/toggle-watchlist', [VisitorController::class, 'toggleWatchlist']);

// Toggle Status (Active/Inactive) - Legacy/Masterlist use
Route::put('/admin/visitors/{id}/status', [VisitorController::class, 'toggleStatus']);

// ----------------------------------------------------------------
// 📊 DASHBOARD & MONITORING
// ----------------------------------------------------------------
// Live Monitor Stats
Route::get('/live-monitor', [MonitorController::class, 'getLiveStats']);

// Analytics Data (Charts, Heatmap)
Route::get('/analytics', [VisitorController::class, 'getAnalytics']);

// 🔴 AI Flagging (Suspicious/Safe)
Route::post('/visit-logs/{id}/toggle-flag', [VisitorController::class, 'toggleFlag']);

// 🟡 Manual Officer Flagging (Must look exactly like this)
Route::post('/visit-logs/{id}/toggle-manual-flag', [VisitorController::class, 'toggleManualFlag']);

// General Logs
Route::get('/logs', [VisitorLogController::class, 'index']);