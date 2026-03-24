# capture-region.ps1
# Reads a screenshot image from the clipboard and saves it as a JPEG temp file.
# Use Win+Shift+S (Snip & Sketch) to put a region capture in the clipboard first.
# Exit code 1 if no image in clipboard. Outputs temp JPEG path to stdout on success.

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$img = [System.Windows.Forms.Clipboard]::GetImage()
if (-not $img) { exit 1 }

$tmpPath   = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "grokked-$(Get-Random).jpg")
$encoder   = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
             Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, 90L)
$bitmap = New-Object System.Drawing.Bitmap($img)
$bitmap.Save($tmpPath, $encoder, $encParams)
$bitmap.Dispose()
$img.Dispose()

Write-Output $tmpPath
