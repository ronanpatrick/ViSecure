<?php

namespace App\Http\Controllers;

use App\Models\Visitor;
use App\Models\VisitLog;
use Illuminate\Http\Request;

class VisitorController extends Controller
{
    // This function runs when a user clicks "Register"
    public function store(Request $request)
    {
        // 1. Validate the input (Make sure they didn't leave empty fields)
        $validated = $request->validate([
            'FullName' => 'required|string',
            'Age' => 'required|integer',
            'Sex' => 'required|string',
            'PurposeOfVisit' => 'required|string',
            'PersonToVisit' => 'nullable|string',
        ]);

        // 2. Save to 'visitors' table
        $visitor = Visitor::create([
            'FullName' => $validated['FullName'],
            'Age' => $request->Age,
            'Sex' => $request->Sex,
            'AffiliationType' => $request->AffiliationType,
            'ContactNumber' => $request->ContactNumber,
            'EmailAddress' => $request->EmailAddress,
            // 'FacialData' => ... (We will add this later when AI is ready)
        ]);

        // 3. Save to 'visit_logs' table (Create the time-in record)
        $log = VisitLog::create([
            'VisitorID' => $visitor->VisitorID,
            'EntryTimestamp' => now(), // Current time
            'PurposeOfVisit' => $validated['PurposeOfVisit'],
            'PersonToVisit' => $request->PersonToVisit,
            'DepartmentToVisit' => $request->DepartmentToVisit,
            'PrivacyConsentGiven' => true,
        ]);

        // 4. Send success response
        return response()->json([
            'message' => 'Welcome! You are successfully registered.',
            'visitor_name' => $visitor->FullName,
            'time_in' => $log->EntryTimestamp,
        ], 201);
    }
    
    // Fetch all visitors to show in the Admin Dashboard
    public function index()
    {
        // Get visitors AND their visit logs (so we can see the purpose)
        $visitors = Visitor::with('logs')->orderBy('created_at', 'desc')->get();

        return response()->json($visitors);
    }
}