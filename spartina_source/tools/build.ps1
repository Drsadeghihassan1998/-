# ساخت فایل نهایی index.html (یک فایل مستقل، بدون نیاز به اینترنت)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$utf8 = New-Object System.Text.UTF8Encoding $false
function ReadSrc($p) { [IO.File]::ReadAllText((Join-Path $root $p), [Text.Encoding]::UTF8) }

$html = ReadSrc 'src\index.template.html'
$font = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $root 'data\vaz.woff2')))
$foods = (ReadSrc 'data\foods.json').Trim([char]0xFEFF).Trim()
$js = (@('meta.js', 'content.js', 'engine.js', 'report.js', 'docx.js', 'tibb.js', 'app.js') | ForEach-Object { ReadSrc "src\$_" }) -join "`n"

$html = $html.Replace('/*@@FONT@@*/', $font).Replace('/*@@REPORTCSS@@*/', (ReadSrc 'src\report.css')).Replace('/*@@FOODS@@*/', $foods).Replace('/*@@JS@@*/', $js)
$out = Join-Path $root 'index.html'
[IO.File]::WriteAllText($out, $html, $utf8)
"built $out  ($([math]::Round((Get-Item $out).Length / 1KB)) KB)"
