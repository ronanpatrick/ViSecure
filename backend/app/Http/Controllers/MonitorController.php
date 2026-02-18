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
            $today = Carbon::today();

            // 1. ACTIVE VISITORS (Currently Inside)
            // We fetch the visitor details AND the log details (PurposeOfVisit is in the log)
            $activeVisitors = VisitLog::with('visitor')
                ->whereNull('ExitTimestamp')
                ->whereDate('EntryTimestamp', $today)
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