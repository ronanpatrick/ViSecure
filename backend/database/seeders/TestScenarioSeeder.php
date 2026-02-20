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
        
        // 🌟 EXPANDED DATA DIVERSITY
        $departments = ['IT', 'HR', 'Finance', 'Registrar', 'Library', 'Admin', 'Clinic', 'Laboratory', 'Gymnasium', 'Auditorium', 'Maintenance'];
        $purposes = ['Meeting', 'Inquiry', 'Delivery', 'Interview', 'Enrollment', 'Payment', 'Consultation', 'Clearance', 'Event Attendance', 'Repair'];
        $types = ['Student', 'Faculty', 'Guest', 'Contractor', 'Alumni', 'Parent'];

        echo "⏳ Generating Regular Visitor Pool...\n";
        // INCREASED POOL TO 100 FOR A YEAR'S WORTH OF DATA
        $regularIds = [];
        for ($i = 0; $i < 100; $i++) {
            $fname = $faker->firstName;
            $lname = $faker->lastName;
            $regType = ['Student', 'Faculty', 'Alumni'][rand(0, 2)];

            $regularIds[] = DB::table('visitors')->insertGetId([
                'FirstName' => $fname,
                'Surname' => $lname,
                'FullName' => "$fname $lname",
                'Age' => rand(18, 60),
                'Sex' => rand(0, 1) ? 'Male' : 'Female',
                'VisitorType' => $regType,
                'AffiliationType' => $regType,
                'Status' => 'Active',
                'IsWatchlisted' => false,
                'ContactNumber' => $faker->phoneNumber,
                'Email' => $faker->safeEmail,
                'created_at' => Carbon::now()->subDays(450), 
                'updated_at' => Carbon::now()->subDays(450),
            ]);
        }

        echo "⏳ Generating history (Last 400 Days including Weekends)...\n";
        echo "⚠️  Please wait, generating 15,000+ records...\n";
        
        // ---------------------------------------------------------
        // 🗓️ PHASE 1: HISTORY (Last 400 Days) - FOR ANALYTICS
        // ---------------------------------------------------------
        for ($d = 400; $d >= 1; $d--) {
            $date = Carbon::today()->subDays($d);
            
            // 🧠 SMART VOLUME
            if ($date->isWeekend()) {
                $dailyVisits = rand(5, 15); 
            } else {
                $dailyVisits = rand(20, 50); 
            }

            for ($v = 0; $v < $dailyVisits; $v++) {
                $rand = rand(1, 100);
                
                // 🧠 SMART HOURS
                if ($date->isWeekend()) {
                    if ($rand <= 60) $hour = rand(9, 12); 
                    else $hour = rand(13, 17);
                } else {
                    if ($rand <= 30) $hour = rand(8, 10); 
                    elseif ($rand <= 60) $hour = rand(13, 15); 
                    else $hour = rand(7, 18); 
                }

                $entryTime = $date->copy()->setHour($hour)->setMinute(rand(0, 59));
                $exitTime = $entryTime->copy()->addMinutes(rand(15, 240)); 

                if (rand(1, 100) <= 60) {
                    $vid = $regularIds[array_rand($regularIds)];
                } else {
                    $fname = $faker->firstName;
                    $lname = $faker->lastName;
                    $randomType = $types[array_rand($types)];
                    
                    $vid = DB::table('visitors')->insertGetId([
                        'FirstName' => $fname,
                        'Surname' => $lname,
                        'FullName' => "$fname $lname", 
                        'Age' => rand(18, 65),
                        'Sex' => rand(0, 1) ? 'Male' : 'Female',
                        'VisitorType' => $randomType,
                        'AffiliationType' => $randomType,
                        'Status' => 'Active',
                        'IsWatchlisted' => false,
                        'ContactNumber' => $faker->phoneNumber,
                        'Email' => $faker->safeEmail,
                        'created_at' => $entryTime,
                        'updated_at' => $entryTime,
                    ]);
                }

                $logId = DB::table('visit_logs')->insertGetId([
                    'VisitorID' => $vid,
                    'EntryTimestamp' => $entryTime,
                    'ExitTimestamp' => $exitTime,
                    'PurposeOfVisit' => $purposes[array_rand($purposes)],
                    'DepartmentToVisit' => $departments[array_rand($departments)],
                    'Status' => 'Completed',
                    'created_at' => $entryTime,
                    'updated_at' => $entryTime,
                ]);

                // ADDED: Create routine Entry and Exit logs for the Security Trail
                DB::table('security_logs')->insert([
                    [
                        'VisitorID' => $vid, 'LogID' => $logId, 'Action' => 'SYSTEM_ENTRY', 
                        'Reason' => 'Authorized Check-in', 'Officer' => 'Auto-Gate', 'created_at' => $entryTime
                    ],
                    [
                        'VisitorID' => $vid, 'LogID' => $logId, 'Action' => 'VISITOR_EXIT', 
                        'Reason' => 'Standard Checkout', 'Officer' => 'Auto-Gate', 'created_at' => $exitTime
                    ]
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
            'FirstName' => 'John', 'Surname' => 'Overstay', 'FullName' => 'John Overstay', 
            'Age' => 30, 'Sex' => 'Male',
            'VisitorType' => 'Contractor', 'AffiliationType' => 'Contractor', 
            'Status' => 'Active', 'IsWatchlisted' => false,
            'created_at' => $now, 'updated_at' => $now
        ]);
        $log1 = DB::table('visit_logs')->insertGetId([
            'VisitorID' => $id1,
            'EntryTimestamp' => $now->copy()->subHours(6),
            'PurposeOfVisit' => 'Repair', 'DepartmentToVisit' => 'Maintenance',
            'Status' => 'Active',
            'created_at' => $now, 'updated_at' => $now
        ]);
        DB::table('security_logs')->insert([
            'VisitorID' => $id1, 'LogID' => $log1, 'Action' => 'SYSTEM_ENTRY', 'Reason' => 'Authorized Check-in', 'Officer' => 'Auto-Gate', 'created_at' => $now->copy()->subHours(6)
        ]);

        // 🟡 CASE 2: The "Officer Flag" (Global Flag Applied)
        $id2 = DB::table('visitors')->insertGetId([
            'FirstName' => 'Karen', 'Surname' => 'Smith', 'FullName' => 'Karen Smith', 
            'Age' => 45, 'Sex' => 'Female',
            'VisitorType' => 'Guest', 'AffiliationType' => 'Guest', 
            'Status' => 'Active', 
            'IsWatchlisted' => true, 
            'WatchlistReason' => 'Verbal Abuse to Guard',
            'created_at' => $now, 'updated_at' => $now
        ]);
        $log2 = DB::table('visit_logs')->insertGetId([
            'VisitorID' => $id2,
            'EntryTimestamp' => $now->copy()->subMinutes(30),
            'PurposeOfVisit' => 'Complaint', 'DepartmentToVisit' => 'Admin',
            'Status' => 'Active',
            'created_at' => $now, 'updated_at' => $now
        ]);
        DB::table('security_logs')->insert([
            ['VisitorID' => $id2, 'LogID' => $log2, 'Action' => 'SYSTEM_ENTRY', 'Reason' => 'Authorized Check-in', 'Officer' => 'Auto-Gate', 'created_at' => $now->copy()->subMinutes(30)],
            ['VisitorID' => $id2, 'LogID' => $log2, 'Action' => 'FLAG', 'Reason' => 'Verbal Abuse to Guard', 'Officer' => 'Chief Security', 'created_at' => $now]
        ]);

        // 🤖 CASE 3: The "AI Suspect" (Global Flag Applied)
        $id3 = DB::table('visitors')->insertGetId([
            'FirstName' => 'Robert', 'Surname' => 'Hacker', 'FullName' => 'Robert Hacker', 
            'Age' => 22, 'Sex' => 'Male',
            'VisitorType' => 'Student', 'AffiliationType' => 'Student', 
            'Status' => 'Active', 
            'IsWatchlisted' => true, 
            'WatchlistReason' => 'Unauthorized Zone',
            'created_at' => $now, 'updated_at' => $now
        ]);
        $log3 = DB::table('visit_logs')->insertGetId([
            'VisitorID' => $id3,
            'EntryTimestamp' => $now->copy()->subMinutes(10),
            'PurposeOfVisit' => 'Unknown', 'DepartmentToVisit' => 'Server Room',
            'Status' => 'Active',
            'created_at' => $now, 'updated_at' => $now
        ]);
        DB::table('security_logs')->insert([
            ['VisitorID' => $id3, 'LogID' => $log3, 'Action' => 'SYSTEM_ENTRY', 'Reason' => 'Authorized Check-in', 'Officer' => 'Auto-Gate', 'created_at' => $now->copy()->subMinutes(10)],
            ['VisitorID' => $id3, 'LogID' => $log3, 'Action' => 'FLAG', 'Reason' => 'Unauthorized Zone', 'Officer' => 'AI System', 'created_at' => $now]
        ]);

        // 🚫 CASE 4: The "Banned User"
        $id4 = DB::table('visitors')->insertGetId([
            'FirstName' => 'Evil', 'Surname' => 'Villain', 'FullName' => 'Evil Villain', 
            'Age' => 50, 'Sex' => 'Male',
            'VisitorType' => 'Blacklisted', 'AffiliationType' => 'Guest', 
            'Status' => 'Banned', 'IsWatchlisted' => true, 'WatchlistReason' => 'Theft Incident',
            'created_at' => $now->copy()->subMonths(8), 'updated_at' => $now->copy()->subMonths(8)
        ]);
        DB::table('security_logs')->insert([
            'VisitorID' => $id4, 'LogID' => null, 'Action' => 'BAN', 'Reason' => 'Theft Incident', 'Officer' => 'Admin', 'created_at' => $now->copy()->subMonths(6)
        ]);

        // 🟢 CASE 5: Normal Active Visitors
        for ($i = 0; $i < 10; $i++) {
            if (rand(1, 100) <= 50) {
                 $vid = $regularIds[array_rand($regularIds)];
            } else {
                $fname = $faker->firstName;
                $lname = $faker->lastName;
                $randomType = $types[array_rand($types)];
                $vid = DB::table('visitors')->insertGetId([
                    'FirstName' => $fname, 
                    'Surname' => $lname,
                    'FullName' => "$fname $lname", 
                    'Age' => rand(20, 40), 'Sex' => rand(0, 1) ? 'Male' : 'Female',
                    'VisitorType' => $randomType, 'AffiliationType' => $randomType, 
                    'Status' => 'Active', 'IsWatchlisted' => false,
                    'created_at' => $now, 'updated_at' => $now
                ]);
            }
            
            $entry = $now->copy()->subMinutes(rand(5, 60));
            $logId = DB::table('visit_logs')->insertGetId([
                'VisitorID' => $vid,
                'EntryTimestamp' => $entry,
                'PurposeOfVisit' => $purposes[array_rand($purposes)], 'DepartmentToVisit' => $departments[array_rand($departments)],
                'Status' => 'Active',
                'created_at' => $now, 'updated_at' => $now
            ]);

            DB::table('security_logs')->insert([
                'VisitorID' => $vid, 'LogID' => $logId, 'Action' => 'SYSTEM_ENTRY', 'Reason' => 'Authorized Check-in', 'Officer' => 'Auto-Gate', 'created_at' => $entry
            ]);
        }

        echo "✅ Seeder Complete! Over 1 year of data populated.\n";
    }
}