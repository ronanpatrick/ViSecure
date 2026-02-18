<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Visitor extends Model
{
    use HasFactory;

    // We tell Laravel your primary key is 'VisitorID', not standard 'id'
    protected $primaryKey = 'VisitorID';

    // 1. UPDATE: Replace FullName with new fields
    protected $fillable = [
        'FirstName', 
        'MiddleName', // 👈 Changed from Initial to Name
        'Surname', 
        'Age', 
        'Sex', 
        'VisitorType', // 👈 New
        'AffiliationType', 
        'ContactNumber', 
        'Email', // 👈 New
        'Status', 
        'IsWatchlisted', 
        'WatchlistReason'
    ];

    // 2. MAGIC: Automatically add 'FullName' to JSON responses
    protected $appends = ['FullName'];

    // 3. LOGIC: Glue the names together when asked
    public function getFullNameAttribute()
    {
        // Example: "Patrick G. Miralion" or "Patrick Miralion"
        $mi = $this->MiddleInitial ? $this->MiddleInitial . '.' : '';
        return trim("{$this->FirstName} {$mi} {$this->Surname}");
    }

    // Link to the Visit Logs table
    public function logs()
    {
        // A visitor can have multiple logs (visits)
        return $this->hasMany(VisitLog::class, 'VisitorID', 'VisitorID');
    }
}