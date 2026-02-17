<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Visitor;
use App\Models\VisitLog;
use App\Services\AIService;
use Carbon\Carbon;               // 👈 ADDED: Needed for date math
use Illuminate\Support\Facades\DB; // 👈 ADDED: Needed for database counting

class VisitorController extends Controller
{
    protected $aiService;

    public function __construct(AIService $aiService)
    {
        $this->aiService = $aiService;
    }

    // ------------------------------------------------------------------
    // 📊 NEW: ANALYTICS ENDPOINT (The Missing Piece)
    // ------------------------------------------------------------------
    public function getAnalytics()
    {
        try {
            $today = Carbon::today();

            // 1. HEADLINE STATS
            $totalVisitors = DB::table('visit_logs')->whereDate('EntryTimestamp', $today)->count();
            $activeVisitors = DB::table('visit_logs')->whereDate('EntryTimestamp', $today)->whereNull('ExitTimestamp')->count();
            $bannedAttempts = DB::table('visit_logs')->whereDate('EntryTimestamp', $today)->where('PurposeOfVisit', 'LIKE', '%Banned%')->count();

            // 2. PEAK HOURS
            $peakHours = DB::table('visit_logs')
                ->select(DB::raw('HOUR(EntryTimestamp) as hour'), DB::raw('count(*) as count'))
                ->whereDate('EntryTimestamp', $today)
                ->groupBy(DB::raw('HOUR(EntryTimestamp)'))
                ->orderBy(DB::raw('HOUR(EntryTimestamp)'))
                ->get();

            // 3. DEPARTMENT TRAFFIC
            $departments = DB::table('visit_logs')
                ->select('DepartmentToVisit', DB::raw('count(*) as count'))
                ->whereDate('EntryTimestamp', $today)
                ->groupBy('DepartmentToVisit')
                ->orderByDesc('count')
                ->limit(5)
                ->get();

            return response()->json([
                'summary' => [
                    'total' => $totalVisitors,
                    'active' => $activeVisitors,
                    'banned' => $bannedAttempts
                ],
                'peak_hours' => $peakHours,
                'departments' => $departments
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // ------------------------------------------------------------------
    // EXISTING FUNCTIONS (Store, CheckUser, etc.)
    // ------------------------------------------------------------------

    public function store(Request $request)
    {
        // 1. Validation
        $validated = $request->validate([
            'FirstName' => 'required|string|max:255',
            'Surname' => 'required|string|max:255',
            'Age' => 'required|integer',
            'Sex' => 'required|string',
            'PurposeOfVisit' => 'required|string',
            'photos' => 'array', 
        ]);

        // 2. Check Name Duplicate
        $visitor = Visitor::where('FirstName', $validated['FirstName'])
                          ->where('Surname', $validated['Surname'])->first();
                          
        $isNewUser = false;

        if ($visitor) {
            // 🛑 SECURITY CHECK: IS BANNED?
            if ($visitor->Status === 'Banned') {
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
                    if ($dupUser && $dupUser->Status === 'Banned') {
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

            // Create Visitor
            $visitor = Visitor::create([
                'FirstName' => $validated['FirstName'],
                'MiddleInitial' => $request->MiddleInitial ?? '',
                'Surname' => $validated['Surname'],
                'Age' => $request->Age,
                'Sex' => $request->Sex,
                'AffiliationType' => 'Visitor',
                'ContactNumber' => $request->ContactNumber ?? null,
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
        
        // 3. Create Visit Log
        $log = VisitLog::create([
            'VisitorID' => $visitor->VisitorID,
            'EntryTimestamp' => now(),
            'PurposeOfVisit' => $validated['PurposeOfVisit'],
            'PersonToVisit' => $request->PersonToVisit ?? null,
            'DepartmentToVisit' => $request->DepartmentToVisit ?? 'General',
            'PrivacyConsentGiven' => true,
            'Status' => 'Active'
        ]);

        return response()->json([
            'message' => $isNewUser ? 'Registration Complete!' : 'Welcome back!',
            'visitor_name' => $visitor->FullName,
            'status' => $isNewUser ? 'TRAINED' : 'RETURNING',
            'watchlist_warning' => $visitor->IsWatchlisted ?? false, 
            'watchlist_reason' => $visitor->WatchlistReason ?? null,
            'visitor_id' => $visitor->VisitorID,
            'log_id' => $log->id 
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

    public function toggleWatchlist(Request $request, $id)
    {
        $visitor = Visitor::find($id);
        if (!$visitor) return response()->json(['message' => 'Visitor not found'], 404);

        if ($visitor->IsWatchlisted) {
            $visitor->IsWatchlisted = false;
            $visitor->WatchlistReason = null;
        } else {
            $visitor->IsWatchlisted = true;
            $visitor->WatchlistReason = $request->input('reason', 'General Suspicion');
        }
        $visitor->save();

        return response()->json([
            'message' => $visitor->IsWatchlisted ? 'Added to Watchlist' : 'Removed from Watchlist',
            'state' => $visitor->IsWatchlisted,
            'reason' => $visitor->WatchlistReason
        ]);
    }
}