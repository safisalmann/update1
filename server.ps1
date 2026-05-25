# server.ps1 - Pure PowerShell Static Web Server for MedQuiz Prep
# Serves the application locally on http://localhost:8080 with proper ES6 module support

$port = 8080
$workspace = "C:\Users\iamsa\.gemini\antigravity\scratch\medquiz-prep"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " MedQuiz Prep static local server successfully started!" -ForegroundColor Green
    Write-Host " Open your browser and navigate to: http://localhost:$port/" -ForegroundColor Cyan
    Write-Host " Press Ctrl+C in this terminal window to stop the server." -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Green
} catch {
    Write-Error "Could not start local server: $_"
    Exit
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/") { $urlPath = "/index.html" }
        
        # Guard against directory traversal
        $cleanPath = $urlPath.Replace("..", "").Substring(1)
        $filePath = Join-Path $workspace $cleanPath
        
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            # MIME-type Mapping
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = "text/plain; charset=utf-8"
            if ($ext -eq ".html" -or $ext -eq ".htm") { $contentType = "text/html; charset=utf-8" }
            elseif ($ext -eq ".css") { $contentType = "text/css; charset=utf-8" }
            elseif ($ext -eq ".js") { $contentType = "application/javascript; charset=utf-8" }
            elseif ($ext -eq ".json") { $contentType = "application/json; charset=utf-8" }
            elseif ($ext -eq ".png") { $contentType = "image/png" }
            elseif ($ext -eq ".jpg" -or $ext -eq ".jpeg") { $contentType = "image/jpeg" }
            elseif ($ext -eq ".svg") { $contentType = "image/svg+xml; charset=utf-8" }
            elseif ($ext -eq ".ico") { $contentType = "image/x-icon" }
            
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("<h3>404 File Not Found</h3><p>The path <b>$urlPath</b> was not found in the workspace directory.</p>")
            $response.ContentType = "text/html; charset=utf-8"
            $response.ContentLength64 = $errBytes.Length
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    } catch {
        # Handle exceptions gracefully to keep server listening
    }
}
