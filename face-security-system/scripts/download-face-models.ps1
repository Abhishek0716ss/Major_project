# Downloads the face-api.js model weights this project needs into public\models.
# Run from the project root in PowerShell:
#   powershell -ExecutionPolicy Bypass -File scripts\download-face-models.ps1

$ErrorActionPreference = "Stop"

$dest = "public\models"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$base = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master"

$files = @(
  "tiny_face_detector/tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector/tiny_face_detector_model-shard1",
  "face_landmark_68/face_landmark_68_model-weights_manifest.json",
  "face_landmark_68/face_landmark_68_model-shard1",
  "face_recognition/face_recognition_model-weights_manifest.json",
  "face_recognition/face_recognition_model-shard1",
  "face_recognition/face_recognition_model-shard2"
)

foreach ($f in $files) {
  $fname = Split-Path $f -Leaf
  Write-Host "Downloading $fname..."
  Invoke-WebRequest -Uri "$base/$f" -OutFile "$dest\$fname"
}

Write-Host ""
Write-Host "Done. Files in ${dest}:"
Get-ChildItem $dest | Format-Table Name, Length

Write-Host ""
Write-Host "If any file is 0 bytes or looks like an HTML error page when opened,"
Write-Host "the repo path may have changed - check"
Write-Host "https://github.com/justadudewhohacks/face-api.js-models"
