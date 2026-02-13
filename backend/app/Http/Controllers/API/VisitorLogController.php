<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\VisitLog; // Make sure this matches your Model name (VisitLog vs VisitorLog)
use Carbon\Carbon;

class VisitorLogController extends Controller
{
    // 1. Get ONLY people currently inside
    public function getLiveMonitoring()
    {
        // "Active" means they have an Entry time but NO Exit time
        $activeVisits = VisitLog::with('visitor') // Join with Visitor table to get names
                        ->whereNotNull('EntryTimestamp')
                        ->whereNull('ExitTimestamp')
                        ->orderBy('EntryTimestamp', 'desc')
                        ->get();

        return response()->json([
            'success' => true,
            'occupancy' => $activeVisits->count(),
            'capacity' => 100, // You can change this limit later
            'data' => $activeVisits
        ]);
    }

    // 2. Keep the history for the "Records" page
    public function index()
    {
        $logs = VisitLog::with('visitor')->orderBy('EntryTimestamp', 'desc')->get();
        return response()->json(['success' => true, 'data' => $logs]);
    }
}