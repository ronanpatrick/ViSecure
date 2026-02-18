<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TestScenarioSeeder extends Seeder
{
    public function run()
    {
        // 1. 🧹 CLEAN SLATE
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('security_logs')->truncate();
        DB::table('visit_logs')->truncate();
        DB::table('visitors')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $faker = \Faker\Factory::create();
        $departments = ['IT', 'HR', 'Finance', 'Registrar', 'Library', 'Admin', 'Clinic'];
        $purposes = ['Meeting', 'Inquiry', 'Delivery', 'Interview', 'Enrollment', 'Payment'];
        $types = ['Student', 'Faculty', 'Guest', 'Contractor', 'Alumni'];

        echo "⏳ Generating history (Last 30 Days)...\n";
        
        // ---------------------------------------------------------
        // 🗓️ PHASE 1: HISTORY (Last 30 Days) - FOR ANALYTICS
        // ---------------------------------------------------------
        for ($d = 30; $d >= 1; $d--) {
            $date = Carbon::today()->subDays($d);
            if ($date->isWeekend()) continue;

            $dailyVisits = rand(20, 50);

            for ($v = 0; $v < $dailyVisits; $v++) {
                $rand = rand(1, 100);
                if ($rand <= 30) $hour = rand(8, 10);
                elseif ($rand <= 50) $hour = rand(13, 15);
                else $hour = rand(7, 18);

                $entryTime = $date->copy()->setHour($hour)->setMinute(rand(0, 59));
                $exitTime = $entryTime->copy()->addMinutes(rand(15, 240)); 

                // Generate names first
                $fname = $faker->firstName;
                $lname = $faker->lastName;

                $vid = DB::table('visitors')->insertGetId([
                    'FirstName' => $fname,
                    'Surname' => $lname,
                    'FullName' => "$fname $lname", // 👈 ADDED THIS
                    'Age' => rand(18, 60),
                    'Sex' => rand(0, 1) ? 'Male' : 'Female',
                    'VisitorType' => $types[array_rand($types)],
                    'AffiliationType' => $types[array_rand($types)],
                    'Status' => 'Active',
                    'ContactNumber' => $faker->phoneNumber,
                    'Email' => $faker->safeEmail,
                    'created_at' => $entryTime,
                    'updated_at' => $entryTime,
                ]);

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
        // ⚡ PHASE 2: TODAY (SPECIFIC TEST CASES)
        // ---------------------------------------------------------
        echo "⚡ Generating specific test cases for today...\n";
        $now = Carbon::now();

        // 🟢 CASE 1: The "Overstayer"
        $id1 = DB::table('visitors')->insertGetId([
            'FirstName' => 'John', 'Surname' => 'Overstay', 'FullName' => 'John Overstay', // 👈 Added
            'Age' => 30, 'Sex' => 'Male',
            'VisitorType' => 'Contractor', 'AffiliationType' => 'Contractor', 'Status' => 'Active',
            'created_at' => $now, 'updated_at' => $now
        ]);
        DB::table('visit_logs')->insert([
            'VisitorID' => $id1,
            'EntryTimestamp' => $now->copy()->subHours(6),
            'PurposeOfVisit' => 'Repair', 'DepartmentToVisit' => 'Maintenance',
            'Status' => 'Active',
            'created_at' => $now, 'updated_at' => $now
        ]);

        // 🟡 CASE 2: The "Officer Flag"
        $id2 = DB::table('visitors')->insertGetId([
            'FirstName' => 'Karen', 'Surname' => 'Smith', 'FullName' => 'Karen Smith', // 👈 Added
            'Age' => 45, 'Sex' => 'Female',
            'VisitorType' => 'Guest', 'AffiliationType' => 'Guest', 'Status' => 'Active',
            'created_at' => $now, 'updated_at' => $now
        ]);
        $log2 = DB::table('visit_logs')->insertGetId([
            'VisitorID' => $id2,
            'EntryTimestamp' => $now->copy()->subMinutes(30),
            'PurposeOfVisit' => 'Complaint', 'DepartmentToVisit' => 'Admin',
            'Status' => 'Active',
            'IsManualFlag' => true,
            'ManualFlagReason' => 'Verbal Abuse to Guard',
            'created_at' => $now, 'updated_at' => $now
        ]);
        DB::table('security_logs')->insert([
            'VisitorID' => $id2, 'LogID' => $log2, 'Action' => 'FLAG', 'Reason' => 'Verbal Abuse to Guard', 'Officer' => 'Chief Security', 'created_at' => $now
        ]);

        // 🤖 CASE 3: The "AI Suspect"
        $id3 = DB::table('visitors')->insertGetId([
            'FirstName' => 'Robert', 'Surname' => 'Hacker', 'FullName' => 'Robert Hacker', // 👈 Added
            'Age' => 22, 'Sex' => 'Male',
            'VisitorType' => 'Student', 'AffiliationType' => 'Student', 'Status' => 'Active',
            'created_at' => $now, 'updated_at' => $now
        ]);
        DB::table('visit_logs')->insert([
            'VisitorID' => $id3,
            'EntryTimestamp' => $now->copy()->subMinutes(10),
            'PurposeOfVisit' => 'Unknown', 'DepartmentToVisit' => 'Server Room',
            'Status' => 'Active',
            'IsFlagged' => true,
            'FlagReason' => 'Unauthorized Zone',
            'created_at' => $now, 'updated_at' => $now
        ]);

        // 🚫 CASE 4: The "Banned User"
        $id4 = DB::table('visitors')->insertGetId([
            'FirstName' => 'Evil', 'Surname' => 'Villain', 'FullName' => 'Evil Villain', // 👈 Added
            'Age' => 50, 'Sex' => 'Male',
            'VisitorType' => 'Blacklisted', 'AffiliationType' => 'Guest', 
            'Status' => 'Banned', 'IsWatchlisted' => true, 'WatchlistReason' => 'Theft Incident (2025)',
            'created_at' => $now, 'updated_at' => $now
        ]);
        DB::table('security_logs')->insert([
            'VisitorID' => $id4, 'Action' => 'BAN', 'Reason' => 'Theft Incident (2025)', 'Officer' => 'Admin', 'created_at' => $now->copy()->subMonths(1)
        ]);

        // 🟢 CASE 5: Normal Active Visitors
        for ($i = 0; $i < 10; $i++) {
            $fname = $faker->firstName;
            $lname = $faker->lastName;

            $vid = DB::table('visitors')->insertGetId([
                'FirstName' => $fname, 
                'Surname' => $lname,
                'FullName' => "$fname $lname", // 👈 ADDED THIS
                'Age' => rand(20, 40), 'Sex' => rand(0, 1) ? 'Male' : 'Female',
                'VisitorType' => 'Guest', 'AffiliationType' => 'Guest', 'Status' => 'Active',
                'created_at' => $now, 'updated_at' => $now
            ]);
            DB::table('visit_logs')->insert([
                'VisitorID' => $vid,
                'EntryTimestamp' => $now->copy()->subMinutes(rand(5, 60)),
                'PurposeOfVisit' => 'Meeting', 'DepartmentToVisit' => $departments[array_rand($departments)],
                'Status' => 'Active',
                'created_at' => $now, 'updated_at' => $now
            ]);
        }

        echo "✅ Seeder Complete! Database populated with test cases.\n";
    }
}