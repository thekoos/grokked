# capture-region.ps1
# Fullscreen overlay for mouse region selection.
# Exit code 1 = cancelled. Outputs temp JPEG path to stdout on success.

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinHelper {
    [DllImport("user32.dll")]
    public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

[WinHelper]::SetProcessDPIAware() | Out-Null
$prevWindow = [WinHelper]::GetForegroundWindow()
$vscreen    = [System.Windows.Forms.SystemInformation]::VirtualScreen

$script:startScreen = $null
$script:endScreen   = $null
$script:rect        = $null
$script:phase       = 'draw'
$script:result      = 'cancel'
$script:leftWasDown = $false

# ── Form ─────────────────────────────────────────────────────────────────────
$form = New-Object System.Windows.Forms.Form
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.StartPosition   = [System.Windows.Forms.FormStartPosition]::Manual
$form.Location        = New-Object System.Drawing.Point($vscreen.Left, $vscreen.Top)
$form.Size            = New-Object System.Drawing.Size($vscreen.Width, $vscreen.Height)
$form.BackColor       = [System.Drawing.Color]::Black
$form.Opacity         = 0.55
$form.Cursor          = [System.Windows.Forms.Cursors]::Cross
$form.TopMost         = $true
$form.KeyPreview      = $true

$form.Add_Shown({ $form.Activate() })

# ── Confirm buttons ───────────────────────────────────────────────────────────
$btnCapture = New-Object System.Windows.Forms.Button
$btnCapture.Text      = "Capture"
$btnCapture.BackColor = [System.Drawing.Color]::FromArgb(40, 167, 69)
$btnCapture.ForeColor = [System.Drawing.Color]::White
$btnCapture.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$btnCapture.Size      = New-Object System.Drawing.Size(80, 28)
$btnCapture.Visible   = $false
$form.Controls.Add($btnCapture)

$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Text      = "Cancel"
$btnCancel.BackColor = [System.Drawing.Color]::FromArgb(200, 50, 50)
$btnCancel.ForeColor = [System.Drawing.Color]::White
$btnCancel.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$btnCancel.Size      = New-Object System.Drawing.Size(80, 28)
$btnCancel.Visible   = $false
$form.Controls.Add($btnCancel)

$btnCapture.Add_Click({
    $script:result = 'capture'
    $form.DialogResult = [System.Windows.Forms.DialogResult]::OK
})
$btnCancel.Add_Click({
    $script:result = 'cancel'
    $form.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
})

# ── Paint ─────────────────────────────────────────────────────────────────────
$form.Add_Paint({
    if ($script:rect -and $script:rect.Width -gt 2 -and $script:rect.Height -gt 2) {
        $g   = $_.Graphics
        $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 2)
        $g.DrawRectangle($pen, $script:rect)
        $pen.Dispose()
        if ($script:phase -eq 'confirm') {
            $sf = New-Object System.Drawing.StringFormat
            $sf.Alignment     = [System.Drawing.StringAlignment]::Center
            $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
            $font = New-Object System.Drawing.Font("Segoe UI", 9)
            $g.DrawString("Click Capture or press Escape", $font,
                [System.Drawing.Brushes]::White,
                [System.Drawing.RectangleF]::op_Implicit($script:rect), $sf)
            $font.Dispose()
        }
    }
})

# ── Keyboard ──────────────────────────────────────────────────────────────────
$form.Add_KeyDown({
    if ($_.KeyCode -eq [System.Windows.Forms.Keys]::Escape) {
        $script:result = 'cancel'
        $form.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
    }
})

# ── Timer: poll mouse via pure .NET Control.MouseButtons (no keylogger APIs) ──
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 16

$timer.Add_Tick({
    $leftDown = ([System.Windows.Forms.Control]::MouseButtons -band `
                 [System.Windows.Forms.MouseButtons]::Left) -ne 0
    $cursor   = [System.Windows.Forms.Cursor]::Position

    if ($script:phase -eq 'draw') {
        if ($leftDown -and -not $script:leftWasDown) {
            $script:startScreen = $cursor
            $script:endScreen   = $null
            $script:rect        = $null
            $btnCapture.Visible = $false
            $btnCancel.Visible  = $false
            $form.Invalidate()
        }
        elseif ($leftDown -and $script:startScreen) {
            $fx = [Math]::Min($script:startScreen.X, $cursor.X) - $vscreen.Left
            $fy = [Math]::Min($script:startScreen.Y, $cursor.Y) - $vscreen.Top
            $fw = [Math]::Abs($cursor.X - $script:startScreen.X)
            $fh = [Math]::Abs($cursor.Y - $script:startScreen.Y)
            $script:rect = New-Object System.Drawing.Rectangle($fx, $fy, $fw, $fh)
            $form.Invalidate()
        }
        elseif (-not $leftDown -and $script:leftWasDown -and $script:startScreen `
                -and $script:rect -and $script:rect.Width -gt 4 -and $script:rect.Height -gt 4) {
            $script:endScreen = $cursor
            $script:phase     = 'confirm'
            $btnY = $script:rect.Bottom + 6
            if (($btnY + 32) -gt $form.Height) { $btnY = $script:rect.Top - 34 }
            $cx = $script:rect.Left + [int]($script:rect.Width / 2)
            $btnCapture.Location = New-Object System.Drawing.Point(($cx - 85), $btnY)
            $btnCancel.Location  = New-Object System.Drawing.Point(($cx + 5),  $btnY)
            $btnCapture.Visible  = $true
            $btnCancel.Visible   = $true
            $btnCapture.BringToFront()
            $btnCancel.BringToFront()
            $form.Cursor = [System.Windows.Forms.Cursors]::Default
            $form.Invalidate()
        }
    }
    elseif ($script:phase -eq 'confirm') {
        # Fallback: detect button clicks via timer bounds check in case WinForms
        # Click events are not dispatched in this process context.
        if ($leftDown -and -not $script:leftWasDown) {
            $fCursor = $form.PointToClient($cursor)
            if ($btnCapture.Bounds.Contains($fCursor)) {
                $script:result = 'capture'
                $timer.Stop()
                $form.DialogResult = [System.Windows.Forms.DialogResult]::OK
            }
            elseif ($btnCancel.Bounds.Contains($fCursor)) {
                $script:result = 'cancel'
                $timer.Stop()
                $form.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
            }
        }
    }

    $script:leftWasDown = $leftDown
})

$timer.Start()
$form.ShowDialog() | Out-Null
$timer.Dispose()

if ($script:result -ne 'capture' -or -not $script:startScreen -or -not $script:endScreen) {
    [WinHelper]::ShowWindow($prevWindow, 9) | Out-Null
    [WinHelper]::SetForegroundWindow($prevWindow) | Out-Null
    exit 1
}

$x = [Math]::Min($script:startScreen.X, $script:endScreen.X)
$y = [Math]::Min($script:startScreen.Y, $script:endScreen.Y)
$w = [Math]::Abs($script:endScreen.X - $script:startScreen.X)
$h = [Math]::Abs($script:endScreen.Y - $script:startScreen.Y)

if ($w -lt 5 -or $h -lt 5) {
    [WinHelper]::ShowWindow($prevWindow, 9) | Out-Null
    [WinHelper]::SetForegroundWindow($prevWindow) | Out-Null
    exit 1
}

# Wait for overlay to disappear before capturing.
Start-Sleep -Milliseconds 300

$bitmap   = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($x, $y, 0, 0, (New-Object System.Drawing.Size($w, $h)),
    [System.Drawing.CopyPixelOperation]::SourceCopy)
$graphics.Dispose()

$tmpPath   = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "grokked-$(Get-Random).jpg")
$encoder   = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
             Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, 85L)
$bitmap.Save($tmpPath, $encoder, $encParams)
$bitmap.Dispose()

# Restore terminal after capture so it doesn't appear in the screenshot.
[WinHelper]::ShowWindow($prevWindow, 9) | Out-Null
[WinHelper]::SetForegroundWindow($prevWindow) | Out-Null

Write-Output $tmpPath
