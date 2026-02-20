<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\VisitLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class MonitorController extends Controller
{
    public function getLiveStats()
    {
        try {
            // 1. ACTIVE VISITORS (Currently Inside)
            $activeVisitors = VisitLog::with('visitor')
                ->whereNull('ExitTimestamp')
                ->orderBy('EntryTimestamp', 'desc')
                ->get();

            $occupancy = $activeVisitors->count();

            // 2. DB-BACKED TODAY'S ACTIVITY FEED
            $today = Carbon::today();
            $feed = [];

            // A. Visit Events (Entries and Exits)
            $todayLogs = VisitLog::with('visitor')
                ->whereDate('EntryTimestamp', $today)
                ->orWhereDate('ExitTimestamp', $today)
                ->get();

            foreach ($todayLogs as $log) {
                $visitorName = $log->visitor ? $log->visitor->FullName : 'Unknown Visitor';
                
                // Process Entry
                if (Carbon::parse($log->EntryTimestamp)->isSameDay($today)) {
                    $isBanned = $log->visitor?->Status === 'Banned';
                    $isWatchlisted = $log->visitor?->IsWatchlisted == 1 && !$isBanned;
                    $isOverstayFlag = $log->FlagReason && str_contains($log->FlagReason, 'Overstay');
                    $isAIFlag = $log->IsFlagged == 1 && !$isOverstayFlag;

                    // 1. ALWAYS log the physical entry for EVERYONE
                    $feed[] = [
                        'id' => $log->LogID . '_entry', 
                        'time' => Carbon::parse($log->EntryTimestamp)->format('h:i A'), 
                        'timestamp' => Carbon::parse($log->EntryTimestamp)->timestamp, 
                        'msg' => "🟢 Entry: {$visitorName}", 
                        'type' => 'success'
                    ];

                    // 2. SEPARATELY log the security flags (+1 to timestamp so it appears above the entry in the feed)
                    $alertTime = Carbon::parse($log->EntryTimestamp)->timestamp + 1;
                    
                    if ($isBanned) {
                        $feed[] = ['id' => $log->LogID . '_alert_ban', 'time' => Carbon::parse($log->EntryTimestamp)->format('h:i A'), 'timestamp' => $alertTime, 'msg' => "🚫 BANNED: {$visitorName} detected!", 'type' => 'danger'];
                    } elseif ($isWatchlisted) {
                        $feed[] = ['id' => $log->LogID . '_alert_watch', 'time' => Carbon::parse($log->EntryTimestamp)->format('h:i A'), 'timestamp' => $alertTime, 'msg' => "⚠️ WATCHLIST: {$visitorName} is on premises.", 'type' => 'warning'];
                    } elseif ($isAIFlag) {
                        $feed[] = ['id' => $log->LogID . '_alert_ai', 'time' => Carbon::parse($log->EntryTimestamp)->format('h:i A'), 'timestamp' => $alertTime, 'msg' => "🤖 AI ALERT: {$visitorName} - Suspicion", 'type' => 'danger'];
                    }

                    // Process Overstay Flag
                    if ($isOverstayFlag) {
                        $feed[] = ['id' => $log->LogID . '_overstay', 'time' => Carbon::parse($log->updated_at)->format('h:i A'), 'timestamp' => Carbon::parse($log->updated_at)->timestamp, 'msg' => "🕒 OVERSTAY ALERT: {$visitorName} (> 4hrs)", 'type' => 'danger'];
                    }
                }

                // Process Exit
                if ($log->ExitTimestamp && Carbon::parse($log->ExitTimestamp)->isSameDay($today)) {
                    $feed[] = ['id' => $log->LogID . '_exit', 'time' => Carbon::parse($log->ExitTimestamp)->format('h:i A'), 'timestamp' => Carbon::parse($log->ExitTimestamp)->timestamp, 'msg' => "🚪 EXIT: {$visitorName}", 'type' => 'neutral'];
                }
            }

            // B. Security Log Events (Global Bans, Clearances, Manual Flags today)
            $securityLogs = \App\Models\SecurityLog::with('visitor')
                ->whereDate('created_at', $today)
                // 🛑 IGNORE BACKGROUND LOGS: Don't show system entries/exits in the Security Feed
                ->whereNotIn('Action', ['SYSTEM_ENTRY', 'AI_SUSPICION_FLAG', 'VISITOR_EXIT']) 
                ->get();

            foreach ($securityLogs as $sec) {
                $visitorName = $sec->visitor ? $sec->visitor->FullName : 'Unknown Visitor';
                $action = strtoupper(str_replace('_', ' ', $sec->Action));
                
                $type = 'warning';
                if (str_contains($action, 'BAN') || str_contains($action, 'OVERSTAY')) $type = 'danger';
                if (str_contains($action, 'CLEAR') || str_contains($action, 'UNBAN') || str_contains($action, 'UNFLAG')) $type = 'success';

                $feed[] = [
                    'id' => 'sec_' . $sec->id,
                    'time' => Carbon::parse($sec->created_at)->format('h:i A'),
                    'timestamp' => Carbon::parse($sec->created_at)->timestamp,
                    'msg' => "👮 SECURITY ACTION: {$visitorName} - {$action}",
                    'type' => $type
                ];
            }

            // Add the permanent System Start Log for Today at 12:00 AM
            $feed[] = [
                'id' => 'sys_start_' . $today->format('Ymd'),
                'time' => '12:00 AM',
                'timestamp' => $today->timestamp,
                'msg' => "🚀 SYSTEM CYCLE: New day started",
                'type' => 'system'
            ];

            // Sort the feed by timestamp descending (newest at the top)
            usort($feed, function($a, $b) {
                return $b['timestamp'] <=> $a['timestamp'];
            });

            return response()->json([
                'success' => true,
                'data' => $activeVisitors,
                'occupancy' => $occupancy,
                'feed' => $feed
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server Error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function generateAISummary() {
        if (\Illuminate\Support\Facades\Cache::has('visecure_ai_summary')) {
            return ['summary' => \Illuminate\Support\Facades\Cache::get('visecure_ai_summary')];
        }

        if (\Illuminate\Support\Facades\Cache::has('visecure_ai_cooldown')) {
            return ['summary' => \Illuminate\Support\Facades\Cache::get('visecure_ai_cooldown')];
        }

        $today = \Carbon\Carbon::today();

        $totalVisits = \App\Models\VisitLog::whereDate('EntryTimestamp', $today)->count();
        $activeVisits = \App\Models\VisitLog::whereNull('ExitTimestamp')->count();
        $flaggedCount = \App\Models\VisitLog::where('IsFlagged', 1)->whereDate('EntryTimestamp', $today)->count();
        
        $busiestDept = \App\Models\VisitLog::whereDate('EntryTimestamp', $today)
            ->select('DepartmentToVisit', \Illuminate\Support\Facades\DB::raw('count(*) as total'))
            ->groupBy('DepartmentToVisit')
            ->orderByDesc('total')
            ->first();
        $deptName = $busiestDept ? $busiestDept->DepartmentToVisit : 'None';

        $prompt = "You are a helpful and clear security assistant for the ViSecure dashboard. Write a brief, easy-to-understand summary (3-4 sentences) of today's visitor data. 
        Data: $totalVisits visitors entered today, $activeVisits total people are currently inside the building, and there are $flaggedCount security flags. The busiest department is $deptName.
        Instructions: 
        1. Clearly explain the current visitor traffic in plain English.
        2. Mention the busiest department and what that means for the staff there.
        3. Give a simple, practical security recommendation based on the number of flags.
        CRITICAL: Use simple, everyday vocabulary. Do not use complex jargon or overly formal corporate speak. Do not use any markdown formatting, asterisks, bold text, or headers. Output only plain text.";

        $apiKey = env('GEMINI_API_KEY');
        
        try {
            $response = \Illuminate\Support\Facades\Http::withoutVerifying()
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}", [
                'contents' => [['parts' => [['text' => $prompt]]]]
            ]);

            $result = $response->json();
            
            if (isset($result['error'])) {
                $errorMsg = $result['error']['message'];
                $cooldownMessage = "AI Cooldown: " . $errorMsg;
                \Illuminate\Support\Facades\Cache::put('visecure_ai_cooldown', $cooldownMessage, 60);
                return ['summary' => $cooldownMessage];
            }

            $summary = $result['candidates'][0]['content']['parts'][0]['text'] ?? null;
            
            if (!$summary) {
                return ['summary' => "System operating normally. Waiting on AI data..."];
            }
            
            $cleanSummary = preg_replace('/[\*#_]/', '', $summary); 
            $cleanSummary = trim(preg_replace('/\s+/', ' ', $cleanSummary)); 
            
            \Illuminate\Support\Facades\Cache::put('visecure_ai_summary', $cleanSummary, 1800);

            return ['summary' => $cleanSummary];

        } catch (\Exception $e) {
            return ['summary' => "Security overview is stable. AI offline."];
        }
    }
}