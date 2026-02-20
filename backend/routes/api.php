<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\VisitorController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\API\VisitorLogController;
use App\Http\Controllers\MonitorController;

// ----------------------------------------------------------------
// 🔓 PUBLIC ROUTES (No login required)
// ----------------------------------------------------------------
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [VisitorController::class, 'store']);
Route::post('/check-user', [VisitorController::class, 'checkUser']);

// ----------------------------------------------------------------
// 🔐 PROTECTED ADMIN ROUTES (Requires valid auth_token)
// ----------------------------------------------------------------
Route::middleware('auth:sanctum')->group(function () {
    
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Detailed Records
    Route::get('/visitors', [VisitorController::class, 'index']);
    Route::get('/visitors/{id}', [VisitorController::class, 'show']);
    Route::get('/admin/all-visitors', [VisitorController::class, 'getAllVisitors']);
    
    // Administrative Actions
    Route::post('/admin/checkout', [VisitorController::class, 'checkout']);
    Route::put('/admin/visitors/{id}/status', [VisitorController::class, 'toggleStatus']);
    
    // Security & Compliance
    Route::post('/visitors/{id}/toggle-watchlist', [VisitorController::class, 'toggleWatchlist']);
    Route::post('/visit-logs/{id}/toggle-flag', [VisitorController::class, 'toggleFlag']);
    Route::post('/visit-logs/{id}/toggle-manual-flag', [VisitorController::class, 'toggleManualFlag']);
    Route::post('/visitors/{id}/global-status', [VisitorController::class, 'updateGlobalStatus']);

    // Analytics & Live Feeds
    Route::get('/live-monitor', [MonitorController::class, 'getLiveStats']);
    Route::get('/analytics', [VisitorController::class, 'getAnalytics']);
    Route::get('/admin/ai-summary', [MonitorController::class, 'generateAISummary']);
    Route::get('/logs', [VisitorLogController::class, 'index']);
});