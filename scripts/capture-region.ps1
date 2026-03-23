# capture-region.ps1
# Displays a fullscreen transparent overlay for mouse region selection.
# Captures the selected region as a JPEG and outputs the temp file path to stdout.
# Exit code 1 if cancelled (Escape or no selection made).

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Make the process DPI-aware so screen coordinates match physical pixels.
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class DpiHelper {
    [DllImport("user32.dll")]
    public static extern bool SetProcessDPIAware();
}
"@
[DpiHelper]::SetProcessDPIAware() | Out-Null

# Virtual screen spans all monitors.
$vscreen = [System.Windows.Forms.SystemInformation]::VirtualScreen

$script:startPoint = $null
$script:endPoint   = $null
$script:rect       = $null
$script:cancelled  = $false

$form = New-Object System.Windows.Forms.Form
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.StartPosition   = [System.Windows.Forms.FormStartPosition]::Manual
$form.Location        = New-Object System.Drawing.Point($vscreen.Left, $vscreen.Top)
$form.Size            = New-Object System.Drawing.Size($vscreen.Width, $vscreen.Height)
$form.BackColor       = [System.Drawing.Color]::Black
$form.Opacity         = 0.35
$form.Cursor          = [System.Windows.Forms.Cursors]::Cross
$form.TopMost         = $true

$form.Add_Paint({
    if ($script:rect -and $script:rect.Width -gt 0 -and $script:rect.Height -gt 0) {
        $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 2)
        $_.Graphics.DrawRectangle($pen, $script:rect)
        # Shade outside the selection slightly darker
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 0, 0, 0))
        $_.Graphics.FillRectangle($brush, $script:rect)
        $pen.Dispose()
        $brush.Dispose()
    }
})

$form.Add_MouseDown({
    if ($_.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        $script:startPoint = $_.Location
        $script:rect       = $null
    }
})

$form.Add_MouseMove({
    if ($script:startPoint -and $_.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        $x = [Math]::Min($script:startPoint.X, $_.X)
        $y = [Math]::Min($script:startPoint.Y, $_.Y)
        $w = [Math]::Abs($_.X - $script:startPoint.X)
        $h = [Math]::Abs($_.Y - $script:startPoint.Y)
        $script:rect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
        $form.Invalidate()
    }
})

$form.Add_MouseUp({
    if ($_.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        $script:endPoint = $_.Location
        $form.Close()
    }
})

$form.Add_KeyDown({
    if ($_.KeyCode -eq [System.Windows.Forms.Keys]::Escape) {
        $script:cancelled = $true
        $form.Close()
    }
})

$form.ShowDialog() | Out-Null

if ($script:cancelled -or -not $script:startPoint -or -not $script:endPoint) {
    exit 1
}

$x = [Math]::Min($script:startPoint.X, $script:endPoint.X) + $vscreen.Left
$y = [Math]::Min($script:startPoint.Y, $script:endPoint.Y) + $vscreen.Top
$w = [Math]::Abs($script:endPoint.X - $script:startPoint.X)
$h = [Math]::Abs($script:endPoint.Y - $script:startPoint.Y)

if ($w -lt 5 -or $h -lt 5) { exit 1 }

# Capture the selected region.
$bitmap   = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($x, $y, 0, 0, (New-Object System.Drawing.Size($w, $h)), [System.Drawing.CopyPixelOperation]::SourceCopy)
$graphics.Dispose()

# Save as JPEG (85% quality) to a temp file.
$tmpPath = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "grokked-$(Get-Random).jpg")
$encoder    = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams  = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 85L)
$bitmap.Save($tmpPath, $encoder, $encParams)
$bitmap.Dispose()

Write-Output $tmpPath
