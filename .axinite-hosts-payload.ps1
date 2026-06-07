
$hostsPath = 'C:\\Windows\\System32\\drivers\\etc\\hosts'
try {
    [System.IO.File]::WriteAllText($hostsPath, (Get-Content 'C:\\Users\\Lenovo\\Downloads\\learner-os-FINAL-v4\\.axinite-hosts-payload.ps1.txt' -Raw))
    & ipconfig /flushdns | Out-Null
} catch {}
