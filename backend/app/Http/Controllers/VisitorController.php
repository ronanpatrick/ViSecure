<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Visitor;
use App\Models\VisitLog;
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
        try {
            // 1. DETERMINE DATE FILTER
            $period = $request->query('period', 'today'); 
            $now = Carbon::now();
            $startDate = null; 

            switch ($period) {
                case 'today':      $startDate = $now->copy()->startOfDay(); break;
                case 'yesterday':  $startDate = $now->copy()->subDay()->startOfDay(); break; 
                case '7_days':     $startDate = $now->copy()->subDays(7); break;
                case '30_days':    $startDate = $now->copy()->subDays(30); break;
                case '3_months':   $startDate = $now->copy()->subMonths(3); break;
                case '6_months':   $startDate = $now->copy()->subMonths(6); break;
                case '1_year':     $startDate = $now->copy()->subYear(); break;
                case 'all_time':   $startDate = null; break;
                default:           $startDate = $now->copy()->startOfDay();
            }

            $applyDate = function($query, $column = 'EntryTimestamp') use ($period, $startDate) {
                if ($period === 'all_time') return;
                if ($period === 'today') $query->whereDate($column, Carbon::today());
                elseif ($period === 'yesterday') $query->whereDate($column, Carbon::yesterday());
                else $query->where($column, '>=', $startDate);
            };

            // 2. HEADLINE STATS
            $totalQuery = DB::table('visit_logs');
            $applyDate($totalQuery);
            $totalVisits = $totalQuery->count();

            $activeVisitors = DB::table('visit_logs')->whereNull('ExitTimestamp')->count();

            $bannedQuery = DB::table('visit_logs')
                ->join('visitors', 'visit_logs.VisitorID', '=', 'visitors.VisitorID')
                ->where('visitors.IsWatchlisted', true);
            $applyDate($bannedQuery, 'visit_logs.EntryTimestamp');
            $bannedAttempts = $bannedQuery->count();

            // 3. PEAK HOURS
            $peakQuery = DB::table('visit_logs')
                ->select(DB::raw('HOUR(EntryTimestamp) as hour'), DB::raw('count(*) as count'));
            $applyDate($peakQuery);
            $peakHours = $peakQuery
                ->groupBy(DB::raw('HOUR(EntryTimestamp)'))
                ->orderBy(DB::raw('HOUR(EntryTimestamp)'))
                ->get();

            // 4. TOP DEPARTMENTS
            $deptQuery = DB::table('visit_logs')
                ->select('DepartmentToVisit', DB::raw('count(*) as count'));
            $applyDate($deptQuery);
            $departments = $deptQuery
                ->groupBy('DepartmentToVisit')
                ->orderByDesc('count')
                ->limit(5)
                ->get();

            // 5. DEMOGRAPHICS (Sex)
            $sexQuery = DB::table('visitors')
                ->join('visit_logs', 'visitors.VisitorID', '=', 'visit_logs.VisitorID')
                ->select('visitors.Sex', DB::raw('count(DISTINCT visitors.VisitorID) as count')); 
            $applyDate($sexQuery, 'visit_logs.EntryTimestamp');
            $sexDistribution = $sexQuery->groupBy('visitors.Sex')->get();

            // 6. DEMOGRAPHICS (Age)
            $ageQuery = DB::table('visitors')
                ->join('visit_logs', 'visitors.VisitorID', '=', 'visit_logs.VisitorID')
                ->select(DB::raw("
                    CASE 
                        WHEN visitors.Age < 18 THEN 'Under 18'
                        WHEN visitors.Age BETWEEN 18 AND 30 THEN '18-30'
                        WHEN visitors.Age BETWEEN 31 AND 50 THEN '31-50'
                        ELSE '50+' 
                    END as age_range
                "), DB::raw('count(DISTINCT visitors.VisitorID) as count'));
            $applyDate($ageQuery, 'visit_logs.EntryTimestamp');
            $ageGroups = $ageQuery->groupBy('age_range')->get();

            // ---------------------------------------------------------
            // 🔥 9. HEATMAP DATA (Day vs Hour)
            // ---------------------------------------------------------
            $heatmapQuery = DB::table('visit_logs')
                ->select(
                    DB::raw('DAYOFWEEK(EntryTimestamp) as day_of_week'), // 1=Sun, 2=Mon...
                    DB::raw('HOUR(EntryTimestamp) as hour_of_day'),
                    DB::raw('count(*) as count')
                );
            
            $applyDate($heatmapQuery); 

            $rawHeatmap = $heatmapQuery
                ->groupBy('day_of_week', 'hour_of_day')
                ->get();

            $heatmapGrid = [];
            $days = [2 => 'Mon', 3 => 'Tue', 4 => 'Wed', 5 => 'Thu', 6 => 'Fri', 7 => 'Sat']; 
            
            foreach ($days as $key => $label) {
                $heatmapGrid[$label] = array_fill(7, 12, 0); // Fill hours 7-18 with 0
            }

            foreach ($rawHeatmap as $data) {
                $dayLabel = $days[$data->day_of_week] ?? null;
                if ($dayLabel && $data->hour_of_day >= 7 && $data->hour_of_day <= 18) {
                    $heatmapGrid[$dayLabel][$data->hour_of_day] = $data->count;
                }
            }

            // 8. PREDICTION
            $predicted = [];
            if ($period === 'today') {
                $predicted = $this->aiService->predictHourlyTraffic();
            }

            return response()->json([
                'summary' => [
                    'total' => $totalVisits,
                    'active' => $activeVisitors, 
                    'banned' => $bannedAttempts
                ],
                'peak_hours' => $peakHours,
                'predicted_hours' => $predicted,
                'departments' => $departments,
                'demographics' => ['sex' => $sexDistribution, 'age' => $ageGroups],
                'heatmap' => $heatmapGrid 
            ]);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Analytics Error: " . $e->getMessage());
            return response()->json(['error' => 'Server Error: ' . $e->getMessage()], 500);
        }
    }

    // ------------------------------------------------------------------
    // STORE FUNCTION (UPDATED FOR NEW FIELDS)
    // ------------------------------------------------------------------
    public function store(Request $request)
    {
        // 1. Validation (Updated with new optional fields)
        $validated = $request->validate([
            'FirstName'         => 'required|string|max:255',
            'MiddleName'        => 'nullable|string|max:255', // New
            'Surname'           => 'required|string|max:255',
            'Age'               => 'required|integer',
            'Sex'               => 'required|string',
            'VisitorType'       => 'required|string', // New
            'PurposeOfVisit'    => 'required|string',
            'DepartmentToVisit' => 'required|string', // Dropdown/Custom text from frontend
            'PersonToVisit'     => 'nullable|string|max:255', // New optional
            'ContactNumber'     => 'nullable|string|max:20',
            'Email'             => 'nullable|email|max:255', // New optional
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
                'MiddleName'    => $request->MiddleName ?? '', // Save Middle Name
                'Surname'       => $validated['Surname'],
                'Age'           => $request->Age,
                'Sex'           => $request->Sex,
                'VisitorType'   => $validated['VisitorType'],   // e.g. Contractor
                'AffiliationType' => 'Visitor',                 // Legacy field (default)
                'ContactNumber' => $request->ContactNumber ?? null,
                'Email'         => $request->Email ?? null,     // Save Email
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
            'PersonToVisit'       => $request->PersonToVisit ?? null, // Save Person
            'DepartmentToVisit'   => $validated['DepartmentToVisit'], // Save Dept
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
    
    public function checkout(Request $request) {
        $log = VisitLog::find($request->log_id);
        if (!$log || $log->ExitTimestamp) return response()->json(['message' => 'Error'], 400);
        $log->update(['ExitTimestamp' => now(), 'Status' => 'Completed']);
        return response()->json(['message' => 'Checked out']);
    }

    public function toggleStatus($id) {
        $visitor = Visitor::find($id);
        $visitor->Status = ($visitor->Status === 'Banned') ? 'Active' : 'Banned';
        $visitor->save();
        return response()->json(['message' => 'Status updated']);
    }

    public function show($id)
    {
        $visitor = Visitor::with(['logs' => function($query) {
            $query->orderBy('EntryTimestamp', 'desc');
        }])->find($id);
        if (!$visitor) return response()->json(['message' => 'Visitor not found'], 404);
        return response()->json($visitor);
    }

    // 🚫 BAN FUNCTION
    public function toggleWatchlist(Request $request, $id)
    {
        $visitor = Visitor::find($id);
        if (!$visitor) return response()->json(['message' => 'Visitor not found'], 404);

        if ($visitor->IsWatchlisted) {
            $visitor->IsWatchlisted = false;
            $visitor->WatchlistReason = null;
        } else {
            $visitor->IsWatchlisted = true;
            $visitor->WatchlistReason = $request->input('reason', 'Manual Ban');
        }
        $visitor->save();

        return response()->json([
            'state' => $visitor->IsWatchlisted,
            'message' => $visitor->IsWatchlisted ? 'Banned' : 'Unbanned'
        ]);
    }

    // 🚩 AI FLAG TOGGLE (Red)
    public function toggleFlag(Request $request, $id)
    {
        $log = VisitLog::find($id);
        if (!$log) return response()->json(['message' => 'Log not found'], 404);

        if ($log->IsFlagged) {
            // Unflag
            $log->IsFlagged = false;
            $log->FlagReason = null;
            $message = 'Flag removed.';
        } else {
            // Flag
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

    // ------------------------------------------------------------------
    // 👮‍♂️ MANUAL FLAG (Yellow - Officer Discretion)
    // ------------------------------------------------------------------
    public function toggleManualFlag(Request $request, $id)
    {
        $log = VisitLog::find($id);
        if (!$log) return response()->json(['message' => 'Log not found'], 404);

        if ($log->IsManualFlag) {
            // Unflag
            $log->IsManualFlag = false;
            $log->ManualFlagReason = null;
            $message = 'Manual flag removed.';
        } else {
            // Flag
            $log->IsManualFlag = true;
            $log->ManualFlagReason = $request->input('reason', 'Officer Discretion');
            $message = 'Visitor manually flagged.';
        }
        $log->save();

        return response()->json([
            'message' => $message,
            'is_manual_flag' => (bool)$log->IsManualFlag, // Casting to bool ensures frontend gets true/false
            'reason' => $log->ManualFlagReason
        ]);
    }
} // <--- End of Class