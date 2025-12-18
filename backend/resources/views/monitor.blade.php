<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ViSecure Live Monitor</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <script src="https://cdn.tailwindcss.com"></script> </head>
<body class="bg-gray-900 text-gray-100 font-sans">

    <nav class="bg-gray-800 border-b border-gray-700 p-4">
        <div class="container mx-auto flex justify-between items-center">
            <h1 class="text-2xl font-bold text-blue-500">ViSecure <span class="text-white">Monitor</span></h1>
            <span class="text-sm text-gray-400">Live Face Recognition Feed</span>
        </div>
    </nav>

    <div class="container mx-auto mt-8 p-4">
        
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-semibold">Recent Access Logs</h2>
            <a href="/monitor" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition">
                Refresh Feed
            </a>
        </div>

        <div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-gray-700 text-gray-300 text-sm uppercase">
                        <th class="p-4 border-b border-gray-600">Time</th>
                        <th class="p-4 border-b border-gray-600">Visitor Name</th>
                        <th class="p-4 border-b border-gray-600">Purpose</th>
                        <th class="p-4 border-b border-gray-600">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-700">
                    @foreach ($logs as $log)
                    <tr class="hover:bg-gray-750 transition">
                        <td class="p-4 text-gray-300">
                            {{ \Carbon\Carbon::parse($log->EntryTimestamp)->format('M d, Y - h:i A') }}
                        </td>
                        <td class="p-4 font-bold text-white">
                            {{ $log->FullName }}
                        </td>
                        <td class="p-4 text-gray-400">
                            {{ $log->PurposeOfVisit }}
                        </td>
                        <td class="p-4">
                            <span class="bg-green-900 text-green-300 py-1 px-3 rounded-full text-xs">
                                {{ $log->Status }}
                            </span>
                        </td>
                    </tr>
                    @endforeach
                    
                    @if($logs->isEmpty())
                    <tr>
                        <td colspan="4" class="p-8 text-center text-gray-500">
                            No logs found yet. Run the AI Engine!
                        </td>
                    </tr>
                    @endif
                </tbody>
            </table>
        </div>
    </div>

</body>
</html>