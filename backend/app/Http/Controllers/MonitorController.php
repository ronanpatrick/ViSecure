<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\VisitLog;
use Carbon\Carbon;

class MonitorController extends Controller
{
    public function getLiveStats()
    {
        try {
            // 1. ACTIVE VISITORS (Currently Inside)
            // Removed whereDate restriction so overnight overstayers still show up
            $activeVisitors = VisitLog::with('visitor')
                ->whereNull('ExitTimestamp')
                ->orderBy('EntryTimestamp', 'desc')
                ->get();

            // 2. OCCUPANCY COUNT
            $occupancy = $activeVisitors->count();

            return response()->json([
                'success' => true,
                'data' => $activeVisitors,
                'occupancy' => $occupancy
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server Error',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}