<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\VisitorLog;

class VisitorLogController extends Controller
{
    public function index()
    {
        // Fetch logs, newest first
        $logs = VisitorLog::orderBy('visited_at', 'desc')->get();
        
        return response()->json([
            'success' => true,
            'data' => $logs
        ]);
    }
}