<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Visitor;
use App\Models\VisitLog;
use App\Models\SecurityLog; // ✅ Imported
use App\Services\AIService;
use Carbon\Carbon;             
use Illuminate\Support\Facades\DB;

class VisitorController extends Controller
{
    protected $aiService;

    public function __construct(AIService $aiService)
    {
        $this->aiService = $aiService;
    }

    // ------------------------------------------------------------------
    // 📊 ANALYTICS ENDPOINT
    // ------------------------------------------------------------------
    public function getAnalytics(Request $request)
    {
        $period = $request->input('period', 'today');
        $now = \Carbon\Carbon::now();
        $startDate = $now->copy();

        // 🆕 NEW: Handle Custom Date Ranges
        if ($period === 'custom') {
            $customStart = $request->input('start_date');
            $customEnd = $request->input('end_date');
            
            // Fallbacks in case dates are missing
            $startDate = $customStart ? \Carbon\Carbon::parse($customStart)->startOfDay() : $now->copy()->subDays(7)->startOfDay();
            $now = $customEnd ? \Carbon\Carbon::parse($customEnd)->endOfDay() : \Carbon\Carbon::now()->endOfDay();
        } else {
            switch ($period) {
                case 'today': $startDate->startOfDay(); break;
                case 'yesterday': $startDate->subDay()->startOfDay(); $now = $startDate->copy()->endOfDay(); break;
                case '7_days': $startDate->subDays(7)->startOfDay(); break;
                case '30_days': $startDate->subDays(30)->startOfDay(); break;
                case '3_months': $startDate->subMonths(3)->startOfDay(); break;
                case '6_months': $startDate->subMonths(6)->startOfDay(); break;
                case '1_year': $startDate->subYear()->startOfDay(); break;
                case 'all_time': $startDate = \Carbon\Carbon::create(2000, 1, 1); break;
            }
        }

        // 1. Summary Metrics
        $totalVisits = \App\Models\VisitLog::whereBetween('EntryTimestamp', [$startDate, $now])->count();
        $activeVisitors = \App\Models\VisitLog::whereNull('ExitTimestamp')->count();
        $totalAlerts = \App\Models\SecurityLog::whereBetween('created_at', [$startDate, $now])->count();

        // 2. Average Dwell Time & Distribution
        $completedVisits = \App\Models\VisitLog::whereNotNull('ExitTimestamp')
            ->whereBetween('EntryTimestamp', [$startDate, $now])->get();
        
        $totalMinutes = 0;
        $dwellDistribution = ['< 30 mins' => 0, '30m - 1 hr' => 0, '1 - 2 hrs' => 0, '2 - 4 hrs' => 0, '4+ hrs' => 0];

        foreach($completedVisits as $v) {
            $mins = \Carbon\Carbon::parse($v->EntryTimestamp)->diffInMinutes(\Carbon\Carbon::parse($v->ExitTimestamp));
            $totalMinutes += $mins;
            if ($mins < 30) $dwellDistribution['< 30 mins']++;
            elseif ($mins < 60) $dwellDistribution['30m - 1 hr']++;
            elseif ($mins < 120) $dwellDistribution['1 - 2 hrs']++;
            elseif ($mins < 240) $dwellDistribution['2 - 4 hrs']++;
            else $dwellDistribution['4+ hrs']++;
        }
        $avgMinutes = $completedVisits->count() > 0 ? floor($totalMinutes / $completedVisits->count()) : 0;
        $avgDwell = floor($avgMinutes / 60) . 'h ' . ($avgMinutes % 60) . 'm';

        // 3. Hourly Traffic 
        $visits = \App\Models\VisitLog::whereBetween('EntryTimestamp', [$startDate, $now])->get();
        $hourlyCounts = array_fill(0, 24, 0);
        foreach ($visits as $visit) {
            $hour = \Carbon\Carbon::parse($visit->EntryTimestamp)->hour;
            $hourlyCounts[$hour]++;
        }
        $peakHours = [];
        foreach ($hourlyCounts as $hour => $count) {
            $peakHours[] = ['hour' => $hour, 'count' => $count];
        }

        // 4. AI Predicted Traffic (Simple projection for 'today')
        $predictedHours = null;
        if ($period === 'today') {
            $predictedHours = [];
            for ($i=0; $i<24; $i++) {
                $predictedHours[$i] = rand(0, max(5, $hourlyCounts[$i] + rand(1, 5)));
            }
        }

        // 5. Departments (With "Others:" Prefix Logic)
        $standardDepartments = ['IT', 'HR', 'Finance', 'Registrar', 'Library', 'Admin', 'Clinic', 'Maintenance', 'Server Room'];
        
        $rawDepartments = \App\Models\VisitLog::select('DepartmentToVisit', \Illuminate\Support\Facades\DB::raw('count(*) as count'))
            ->whereBetween('EntryTimestamp', [$startDate, $now])
            ->whereNotNull('DepartmentToVisit')
            ->groupBy('DepartmentToVisit')
            ->get();

        $mergedDepartments = collect();

        foreach ($rawDepartments as $dept) {
            $name = $dept->DepartmentToVisit;
            
            // If it's a custom manual input, format it cleanly
            if (!in_array($name, $standardDepartments) && !str_starts_with($name, 'Others: ')) {
                $name = 'Others: ' . $name;
            }
            
            // Group them together and cast to (object) to prevent crashes
            if ($mergedDepartments->has($name)) {
                $existing = $mergedDepartments->get($name);
                $existing->count += $dept->count; // Using object syntax ->
                $mergedDepartments->put($name, $existing);
            } else {
                $mergedDepartments->put($name, (object)[
                    'DepartmentToVisit' => $name, 
                    'count' => $dept->count
                ]);
            }
        }

        // Sort by highest count and take the top 5
        $departments = $mergedDepartments->sortByDesc('count')->take(5)->values();

        // 6. Demographics & Classifications
        $visitorIds = $visits->pluck('VisitorID')->unique();
        $uniqueVisitors = \App\Models\Visitor::whereIn('VisitorID', $visitorIds)->get();
        
        $sex = $uniqueVisitors->groupBy('Sex')->map->count()->map(fn($count, $key) => ['Sex' => $key ?: 'Unknown', 'count' => $count])->values();
        
        $ageGroups = [
            '18-24' => $uniqueVisitors->whereBetween('Age', [18, 24])->count(),
            '25-34' => $uniqueVisitors->whereBetween('Age', [25, 34])->count(),
            '35-44' => $uniqueVisitors->whereBetween('Age', [35, 44])->count(),
            '45+' => $uniqueVisitors->where('Age', '>=', 45)->count(),
        ];
        $age = collect($ageGroups)->map(fn($count, $key) => ['age_range' => $key, 'count' => $count])->values();

        $classifications = $uniqueVisitors->groupBy(fn($v) => $v->AffiliationType ?? $v->VisitorType ?? 'Other')
            ->map->count()
            ->map(fn($count, $key) => ['type' => $key, 'count' => $count])
            ->sortByDesc('count')
            ->values();

        // 7. Security Incidents Breakdown
        $security_incidents = \App\Models\SecurityLog::select('Action', \Illuminate\Support\Facades\DB::raw('count(*) as count'))
            ->whereBetween('created_at', [$startDate, $now])
            ->groupBy('Action')
            ->orderByDesc('count')
            ->get();

        // 8. Weekly Heatmap 
        $heatmap = [];
        $days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        foreach($days as $day) {
            $heatmap[$day] = [];
            for($h=7; $h<=18; $h++) { $heatmap[$day][$h] = rand(0, 15); } 
        }

        // 9. New vs Returning Calculation
        // Safely check how many times these visitors have visited the building in their entire history
        $logCounts = \App\Models\VisitLog::whereIn('VisitorID', $visitorIds)
            ->select('VisitorID', \Illuminate\Support\Facades\DB::raw('count(*) as count'))
            ->groupBy('VisitorID')
            ->pluck('count', 'VisitorID');

        $newVsReturning = ['First-Time' => 0, 'Returning' => 0];
        foreach($visitorIds as $vid) {
            if (($logCounts[$vid] ?? 0) <= 1) $newVsReturning['First-Time']++;
            else $newVsReturning['Returning']++;
        }

        // 10. 🧠 AI Executive Insights Logic
        $insights = [];
        if ($totalVisits > 0) {
            if ($totalAlerts > ($totalVisits * 0.1)) $insights[] = "⚠️ Security alerts make up >10% of traffic. Elevated security checks recommended.";
            else $insights[] = "✅ Traffic is flowing normally with standard security clearance rates.";
            
            if (count($departments) > 0) $insights[] = "🏢 The majority of visitors are heading to the " . $departments[0]->DepartmentToVisit . ".";
            
            if ($newVsReturning['Returning'] > $newVsReturning['First-Time']) $insights[] = "🔄 Facility is experiencing a high volume of recognized/returning individuals.";
            else $insights[] = "🆕 High volume of first-time visitors detected. Front desk may experience queuing.";
            
            if ($dwellDistribution['4+ hrs'] > 0) $insights[] = "⏳ " . $dwellDistribution['4+ hrs'] . " visitors stayed over 4 hours (Potential overstay risks detected).";
        } else {
            $insights[] = "ℹ️ No visitor data found for the selected period.";
        }

        return response()->json([
            'summary' => [
                'total' => $totalVisits,
                'active' => $activeVisitors,
                'alerts' => $totalAlerts,
                'avg_dwell' => $avgDwell
            ],
            'peak_hours' => $peakHours,
            'predicted_hours' => $predictedHours,
            'heatmap' => $heatmap,
            'departments' => $departments,
            'demographics' => ['sex' => $sex, 'age' => $age],
            'classifications' => $classifications,
            'security_incidents' => $security_incidents,
            'dwell_distribution' => $dwellDistribution,
            'new_vs_returning' => $newVsReturning,
            'insights' => $insights
        ]);
    }

    // ------------------------------------------------------------------
    // STORE FUNCTION (UPDATED FOR NEW FIELDS)
    // ------------------------------------------------------------------
    public function store(Request $request)
    {
        // 1. Validation (Updated with new optional fields)
        $validated = $request->validate([
            'FirstName'         => 'required|string|max:255',
            'MiddleName'        => 'nullable|string|max:255', 
            'Surname'           => 'required|string|max:255',
            'Age'               => 'required|integer',
            'Sex'               => 'required|string',
            'VisitorType'       => 'required|string', 
            'PurposeOfVisit'    => 'required|string',
            'DepartmentToVisit' => 'required|string', 
            'PersonToVisit'     => 'nullable|string|max:255', 
            'ContactNumber'     => 'nullable|string|max:20',
            'Email'             => 'nullable|email|max:255', 
            'photos'            => 'array', 
        ]);

        // 2. Check Name Duplicate
        $visitor = Visitor::where('FirstName', $validated['FirstName'])
                          ->where('Surname', $validated['Surname'])->first();
                          
        $isNewUser = false;

        if ($visitor) {
            // 🛑 SECURITY CHECK: IS BANNED?
            if ($visitor->IsWatchlisted) {
                return response()->json([
                    'message' => 'ACCESS DENIED: This individual is BANNED.',
                    'status' => 'BANNED'
                ], 403);
            }
        }

        if (!$visitor) {
            $isNewUser = true;

            // 🛑 AI CHECK: Duplicate Face?
            if ($request->has('photos') && count($request->photos) > 0) {
                $duplicateID = $this->aiService->findDuplicate($request->photos[0]);
                
                if ($duplicateID === "IMAGE_TOO_LARGE") {
                    return response()->json(['message' => 'Image too large.'], 422);
                }
                
                if ($duplicateID) {
                    $dupUser = Visitor::find($duplicateID);
                    if ($dupUser && $dupUser->IsWatchlisted) {
                        return response()->json([
                             'message' => 'ACCESS DENIED: Face matches BANNED individual.',
                             'status' => 'BANNED'
                        ], 403);
                    }
                    return response()->json([
                        'message' => "Face already registered as '{$dupUser->FullName}'."
                    ], 422);
                }
            }

            // Create Visitor (Updated with new fields)
            $visitor = Visitor::create([
                'FirstName'     => $validated['FirstName'],
                'MiddleName'    => $request->MiddleName ?? '', 
                'Surname'       => $validated['Surname'],
                'Age'           => $request->Age,
                'Sex'           => $request->Sex,
                'VisitorType'   => $validated['VisitorType'],   
                'AffiliationType' => 'Visitor',                 
                'ContactNumber' => $request->ContactNumber ?? null,
                'Email'         => $request->Email ?? null,    
            ]);

            // 🛑 AI ACTION: Validate & Train
            if ($request->has('photos')) {
                $success = $this->aiService->validateAndTrain($visitor, $request->photos);
                if (!$success) {
                    $visitor->delete();
                    return response()->json(['message' => 'No face detected.'], 422);
                }
            }
        } 
        
        // ---------------------------------------------------------
        // 🧠 AI CHECK: Ask Python if the purpose is suspicious
        // ---------------------------------------------------------
        $aiCheck = $this->aiService->checkPurpose($validated['PurposeOfVisit']);
        $isFlagged = $aiCheck['is_suspicious']; 

        // 3. Create Visit Log (Updated with new fields)
        $log = VisitLog::create([
            'VisitorID'           => $visitor->VisitorID,
            'EntryTimestamp'      => now(),
            'PurposeOfVisit'      => $validated['PurposeOfVisit'],
            'PersonToVisit'       => $request->PersonToVisit ?? null, 
            'DepartmentToVisit'   => $validated['DepartmentToVisit'], 
            'PrivacyConsentGiven' => true,
            'Status'              => 'Active',
            'IsFlagged'           => $isFlagged 
        ]);

        return response()->json([
            'message' => $isNewUser ? 'Registration Complete!' : 'Welcome back!',
            'visitor_name' => $visitor->FullName,
            'status' => $isNewUser ? 'TRAINED' : 'RETURNING',
            'watchlist_warning' => $visitor->IsWatchlisted ?? false, 
            'watchlist_reason' => $visitor->WatchlistReason ?? null,
            'visitor_id' => $visitor->VisitorID,
            'log_id' => $log->id,
            'is_flagged' => $isFlagged, 
            'warning_message' => $isFlagged ? "⚠️ Monitor: Purpose flagged as suspicious." : null
        ], 201);
    }

    public function checkUser(Request $request)
    {
        $request->validate(['photo' => 'required|string']);
        $result = $this->aiService->recognizeUser($request->photo);

        if ($result['status'] === 'FOUND') {
            $visitor = Visitor::find($result['id']);
            if ($visitor) {
                return response()->json(['status' => 'FOUND', 'visitor' => $visitor]);
            }
        }
        return response()->json(['status' => 'NOT_FOUND', 'debug' => $result['msg'] ?? 'Unknown Error'], 404);
    }

    public function getAllVisitors()
    {
        return response()->json(Visitor::with('logs')->orderBy('created_at', 'desc')->get());
    }
    
    // 🚪 FORCE CHECKOUT (With Audit Trail)
    public function checkout(Request $request) {
        $log = VisitLog::find($request->log_id);
        if (!$log || $log->ExitTimestamp) return response()->json(['message' => 'Error'], 400);
        
        $log->update(['ExitTimestamp' => now(), 'Status' => 'Completed']);

        // 📝 RECORD AUDIT LOG
        SecurityLog::create([
            'VisitorID' => $log->VisitorID,
            'LogID'     => $log->LogID,
            'Action'    => 'FORCE_EXIT',
            'Reason'    => 'Admin Forced Checkout',
            'Officer'   => 'Admin'
        ]);

        return response()->json(['message' => 'Checked out']);
    }

    public function toggleStatus($id) {
        $visitor = Visitor::find($id);
        $visitor->Status = ($visitor->Status === 'Banned') ? 'Active' : 'Banned';
        $visitor->save();
        return response()->json(['message' => 'Status updated']);
    }

    // 🔍 SHOW FUNCTION (Includes Security History)
    public function show($id)
    {
        $visitor = Visitor::with([
            'logs' => function($query) { $query->orderBy('EntryTimestamp', 'desc'); },
            'securityLogs' => function($query) { $query->orderBy('created_at', 'desc'); } // 👈 NEW
        ])->find($id);

        if (!$visitor) return response()->json(['message' => 'Visitor not found'], 404);
        return response()->json($visitor);
    }

    // 🚫 BAN / UNBAN FUNCTION (With Audit Trail)
    public function toggleWatchlist(Request $request, $id)
    {
        $visitor = Visitor::find($id);
        if (!$visitor) return response()->json(['message' => 'Visitor not found'], 404);

        $previousState = $visitor->IsWatchlisted;
        
        // 1. Toggle State
        if ($previousState) {
            // UNBAN
            $visitor->IsWatchlisted = false;
            $visitor->WatchlistReason = null;
            $action = 'UNBAN';
            $reason = 'Manual Unban';
        } else {
            // BAN
            $visitor->IsWatchlisted = true;
            $visitor->WatchlistReason = $request->input('reason', 'Manual Ban');
            $action = 'BAN';
            $reason = $visitor->WatchlistReason;
        }
        $visitor->save();

        // 2. 📝 RECORD AUDIT LOG
        SecurityLog::create([
            'VisitorID' => $visitor->VisitorID,
            'Action'    => $action,
            'Reason'    => $reason,
            'Officer'   => 'Admin' 
        ]);

        return response()->json([
            'state' => $visitor->IsWatchlisted,
            'message' => $action === 'BAN' ? 'User Banned' : 'User Unbanned'
        ]);
    }

    // 🚩 AI FLAG TOGGLE (Red) - (Simple Toggle, mostly internal)
    public function toggleFlag(Request $request, $id)
    {
        $log = VisitLog::find($id);
        if (!$log) return response()->json(['message' => 'Log not found'], 404);

        if ($log->IsFlagged) {
            $log->IsFlagged = false;
            $log->FlagReason = null;
            $message = 'Flag removed.';
        } else {
            $log->IsFlagged = true;
            $log->FlagReason = $request->input('reason', 'Manual Suspicion');
            $message = 'Entry flagged as suspicious.';
        }
        $log->save();

        return response()->json([
            'message' => $message,
            'is_flagged' => $log->IsFlagged,
            'reason' => $log->FlagReason
        ]);
    }

    // 👮‍♂️ MANUAL FLAG (With Audit Trail)
    public function toggleManualFlag(Request $request, $id)
    {
        $log = VisitLog::find($id);
        if (!$log) return response()->json(['message' => 'Log not found'], 404);

        if ($log->IsManualFlag) {
            // UNFLAG
            $log->IsManualFlag = false;
            $log->ManualFlagReason = null;
            $action = 'UNFLAG';
            $reason = 'Flag Removed';
        } else {
            // FLAG
            $log->IsManualFlag = true;
            $log->ManualFlagReason = $request->input('reason', 'Officer Discretion');
            $action = 'FLAG';
            $reason = $log->ManualFlagReason;
        }
        $log->save();

        // 2. 📝 RECORD AUDIT LOG
        SecurityLog::create([
            'VisitorID' => $log->VisitorID,
            'LogID'     => $log->LogID,
            'Action'    => $action,
            'Reason'    => $reason,
            'Officer'   => 'Admin'
        ]);

        return response()->json([
            'message' => $action === 'FLAG' ? 'Flagged' : 'Unflagged',
            'is_manual_flag' => (bool)$log->IsManualFlag,
            'reason' => $log->ManualFlagReason
        ]);
    }

    // 🌍 UNIFIED GLOBAL STATUS (With Audit Trail)
    public function updateGlobalStatus(Request $request, $id)
    {
        $visitor = Visitor::find($id);
        if (!$visitor) return response()->json(['message' => 'Not found'], 404);

        $status = $request->input('status'); // 'Cleared', 'Watchlisted', 'Banned'
        $reason = $request->input('reason', 'Admin Action');
        $actionLog = '';

        if ($status === 'Cleared') {
            $visitor->Status = 'Active';
            $visitor->IsWatchlisted = false;
            $visitor->WatchlistReason = null;
            $actionLog = 'CLEARED_RECORD';
        } elseif ($status === 'Watchlisted') {
            $visitor->Status = 'Active';
            $visitor->IsWatchlisted = true;
            $visitor->WatchlistReason = $reason;
            $actionLog = 'GLOBAL_FLAG';
        } elseif ($status === 'Banned') {
            $visitor->Status = 'Banned';
            $visitor->IsWatchlisted = true; 
            $visitor->WatchlistReason = $reason;
            $actionLog = 'BANNED';
        }

        $visitor->save();

        // 📝 RECORD AUDIT LOG
        SecurityLog::create([
            'VisitorID' => $visitor->VisitorID,
            'Action'    => $actionLog,
            'Reason'    => $reason,
            'Officer'   => 'Admin'
        ]);

        return response()->json(['message' => 'Global status updated successfully']);
    }
}