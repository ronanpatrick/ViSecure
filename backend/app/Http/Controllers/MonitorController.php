<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MonitorController extends Controller
{
    public function index()
    {
        // 1. Fetch the logs from the database
        // We join 'visit_logs' with 'visitors' to get the names
        $logs = DB::table('visit_logs')
            ->join('visitors', 'visit_logs.VisitorID', '=', 'visitors.VisitorID')
            ->select('visit_logs.*', 'visitors.FullName', 'visitors.VisitorID')
            ->orderBy('visit_logs.EntryTimestamp', 'desc')
            ->limit(20) // Get the last 20 entries
            ->get();

        // 2. Send the data to the view (page)
        return view('monitor', ['logs' => $logs]);
    }
}