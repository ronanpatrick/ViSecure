<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SecurityLog extends Model
{
    use HasFactory;

    protected $fillable = ['VisitorID', 'LogID', 'Action', 'Reason', 'Officer'];

    public function visitor()
    {
        return $this->belongsTo(Visitor::class, 'VisitorID', 'VisitorID');
    }
}