<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Visitor extends Model
{
    use HasFactory;

    protected $primaryKey = 'VisitorID';

    protected $fillable = [
        'FirstName', 
        'MiddleName',
        'Surname', 
        'FullName', // 👈 ADDED THIS LINE
        'Age', 
        'Sex', 
        'VisitorType', 
        'AffiliationType', 
        'ContactNumber', 
        'Email',
        'Status', 
        'IsWatchlisted', 
        'WatchlistReason'
    ];

    protected $appends = ['FullName'];

    public function getFullNameAttribute()
    {
        $mi = $this->MiddleName ? $this->MiddleName[0] . '.' : ''; // Fixed to take just the first letter
        return trim("{$this->FirstName} {$mi} {$this->Surname}");
    }

    public function logs()
    {
        return $this->hasMany(VisitLog::class, 'VisitorID', 'VisitorID');
    }

    // 👇 ADD THIS NEW RELATIONSHIP 👇
    public function securityLogs()
    {
        return $this->hasMany(SecurityLog::class, 'VisitorID', 'VisitorID');
    }
}