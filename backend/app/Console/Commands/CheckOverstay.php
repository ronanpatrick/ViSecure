<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\VisitLog;
use App\Models\SecurityLog;
use Carbon\Carbon;

class CheckOverstay extends Command
{
    // The name of the command (we will use this in the scheduler)
    protected $signature = 'visecure:check-overstay';

    // The command description
    protected $description = 'Checks for active visitors exceeding 4 hours and logs a security event.';

    public function handle()
    {
        $limit = 4; // Hours limit
        $cutoffTime = Carbon::now()->subHours($limit);

        // 1. Find visitors who are STILL inside AND entered more than 4 hours ago
        $overstayers = VisitLog::whereNull('ExitTimestamp')
            ->where('EntryTimestamp', '<', $cutoffTime)
            ->get();

        foreach ($overstayers as $visit) {
            // 2. Check if we ALREADY recorded this specific overstay (Avoid duplicate spam)
            $alreadyLogged = SecurityLog::where('LogID', $visit->LogID)
                ->where('Action', 'OVERSTAY_ALERT')
                ->exists();

            if (!$alreadyLogged) {
                // 3. Create the Permanent Record
                SecurityLog::create([
                    'VisitorID' => $visit->VisitorID,
                    'LogID'     => $visit->LogID,
                    'Action'    => 'OVERSTAY_ALERT',
                    'Reason'    => "System Auto-Detect: Exceeded {$limit} hours",
                    'Officer'   => 'System AI'
                ]);

                // Optional: You can also flag the log itself so it turns red on the dashboard immediately
                $visit->IsFlagged = true; 
                $visit->FlagReason = "Auto-Flag: Overstay";
                $visit->save();

                $this->info("Logged overstay for Visitor ID: {$visit->VisitorID}");
            }
        }

        $this->info('Overstay check complete.');
    }
}