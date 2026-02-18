<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TestScenarioSeeder extends Seeder
{
    public function run()
    {
        // 1. CLEAN SLATE
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('visit_logs')->truncate();
        DB::table('visitors')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $faker = \Faker\Factory::create();
        $departments = ['IT', 'HR', 'Finance', 'Registrar', 'Library', 'Admin', 'Clinic'];
        $purposes = ['Meeting', 'Inquiry', 'Delivery', 'Interview', 'Enrollment', 'Payment'];

        // ---------------------------------------------------------
        // 🗓️ PHASE 1: HISTORY (Last 30 Days) - FOR AI TRAINING
        // ---------------------------------------------------------
        echo "⏳ Generating history for AI training...\n";
        
        // Loop through the last 30 days
        for ($d = 30; $d >= 1; $d--) {
            $date = Carbon::today()->subDays($d);
            
            // Skip weekends (optional, but realistic)
            if ($date->isWeekend()) continue;

            // Varied traffic: Some days are busy (80 visits), some quiet (30 visits)
            $dailyVisits = rand(30, 80);

            for ($v = 0; $v < $dailyVisits; $v++) {
                // 🧠 INTELLIGENT TIME GENERATION (Bell Curve Simulation)
                $rand = rand(1, 100);
                
                if ($rand <= 30) {
                    // 30% Morning Rush (08:00 - 10:00)
                    $hour = rand(8, 10);
                } elseif ($rand <= 50) {
                    // 20% Afternoon Rush (13:00 - 15:00)
                    $hour = rand(13, 15);
                } else {
                    // 50% Random Spread (07:00 - 18:00)
                    $hour = rand(7, 18);
                }

                $entryTime = $date->copy()->setHour($hour)->setMinute(rand(0, 59));
                $exitTime = $entryTime->copy()->addMinutes(rand(15, 240)); // Stay 15m to 4h

                // Create Visitor
                $vid = DB::table('visitors')->insertGetId([
                    'FirstName' => $faker->firstName,
                    'Surname' => $faker->lastName,
                    'Age' => rand(18, 60),
                    'Sex' => rand(0, 1) ? 'Male' : 'Female',
                    'AffiliationType' => 'Guest',
                    'Status' => 'Active',
                    'created_at' => $entryTime,
                    'updated_at' => $entryTime,
                ]);

                // Create Log
                DB::table('visit_logs')->insert([
                    'VisitorID' => $vid,
                    'EntryTimestamp' => $entryTime,
                    'ExitTimestamp' => $exitTime,
                    'PurposeOfVisit' => $purposes[array_rand($purposes)],
                    'DepartmentToVisit' => $departments[array_rand($departments)],
                    'Status' => 'Completed',
                    'created_at' => $entryTime,
                    'updated_at' => $entryTime,
                ]);
            }
        }

        // ---------------------------------------------------------
        // ⚡ PHASE 2: TODAY (Real-time Simulation)
        // ---------------------------------------------------------
        echo "⚡ Generating live data for today...\n";
        $now = Carbon::now();

        // 1. The "Active" Crowd (People currently inside)
        for ($i = 0; $i < 15; $i++) {
            $vid = DB::table('visitors')->insertGetId([
                'FirstName' => $faker->firstName,
                'Surname' => $faker->lastName,
                'Age' => rand(20, 50),
                'Sex' => rand(0, 1) ? 'Male' : 'Female',
                'AffiliationType' => 'Visitor',
                'Status' => 'Active',
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('visit_logs')->insert([
                'VisitorID' => $vid,
                'EntryTimestamp' => $now->copy()->subMinutes(rand(5, 120)), // Entered recently
                'PurposeOfVisit' => 'Meeting',
                'DepartmentToVisit' => $departments[array_rand($departments)],
                'Status' => 'Active', // Still inside
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // 2. The Threat (Watchlisted)
        $jokerId = DB::table('visitors')->insertGetId([
            'FirstName' => 'Joker', 'Surname' => 'Napier', 'Age' => 45, 'Sex' => 'Male',
            'AffiliationType' => 'Guest', 'Status' => 'Active', 
            'IsWatchlisted' => true, 
            'created_at' => $now, 'updated_at' => $now,
        ]);
        DB::table('visit_logs')->insert([
            'VisitorID' => $jokerId,
            'EntryTimestamp' => $now->copy()->subMinutes(15), 
            'PurposeOfVisit' => 'Inquiry', 'DepartmentToVisit' => 'Security',
            'Status' => 'Active',
            'created_at' => $now, 'updated_at' => $now,
        ]);
        
        echo "✅ Seeder Complete! Generated ~1500 historical visits.\n";
    }
}