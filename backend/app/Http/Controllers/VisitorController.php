<?php

namespace App\Http\Controllers;

use App\Models\Visitor;
use App\Models\VisitLog;
use Illuminate\Http\Request;
use App\Services\AIService; // 👈 Import the new Service

class VisitorController extends Controller
{
    protected $aiService;

    // Inject the Service automatically
    public function __construct(AIService $aiService)
    {
        $this->aiService = $aiService;
    }

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
            // This runs for Returning Visitors found by name
            if ($visitor->Status === 'Banned') {
                return response()->json([
                    'message' => 'ACCESS DENIED: This individual is BANNED from the premises.',
                    'status' => 'BANNED'
                ], 403); // 403 Forbidden
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
                    
                    // 🛑 SECURITY CHECK: IS THE DUPLICATE FACE BANNED?
                    if ($dupUser && $dupUser->Status === 'Banned') {
                        return response()->json([
                             'message' => 'ACCESS DENIED: This face matches a BANNED individual.',
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
                    return response()->json(['message' => 'No face detected in photos. Check lighting.'], 422);
                }
            }
        } 
        
        // 3. Create Visit Log
        $log = VisitLog::create([
            'VisitorID' => $visitor->VisitorID,
            'EntryTimestamp' => now(),
            'PurposeOfVisit' => $validated['PurposeOfVisit'],
            'PersonToVisit' => $request->PersonToVisit,
            'DepartmentToVisit' => $request->DepartmentToVisit ?? null,
            'PrivacyConsentGiven' => true,
        ]);

        return response()->json([
            'message' => $isNewUser ? 'Registration Complete!' : 'Welcome back!',
            'visitor_name' => $visitor->FullName,
            'status' => $isNewUser ? 'TRAINED' : 'RETURNING',
            'visitor_id' => $visitor->VisitorID,
            'log_id' => $log->id 
        ], 201);
    }

    public function checkUser(Request $request)
    {
        $request->validate(['photo' => 'required|string']);

        // 🛑 AI ACTION: Recognize
        $result = $this->aiService->recognizeUser($request->photo);

        if ($result['status'] === 'FOUND') {
            $visitor = Visitor::find($result['id']);
            if ($visitor) {
                return response()->json(['status' => 'FOUND', 'visitor' => $visitor]);
            }
        }

        return response()->json([
            'status' => 'NOT_FOUND', 
            'debug' => $result['msg'] ?? 'Unknown Error'
        ], 404);
    }

    // ... (Keep index, getAllVisitors, checkout, toggleStatus as they were) ...
    public function getAllVisitors()
    {
        // ⚡ UPDATED: Add 'with('logs')' to get the history automatically
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

    // Get single visitor with their history
    public function show($id)
    {
        // "with('logs')" uses the relationship we defined in the Model
        $visitor = Visitor::with(['logs' => function($query) {
            $query->orderBy('EntryTimestamp', 'desc'); // Newest visits first
        }])->find($id);

        if (!$visitor) {
            return response()->json(['message' => 'Visitor not found'], 404);
        }

        return response()->json($visitor);
    }
}