param([string]$UsdaDir = "$env:TEMP\usda\FoodData_Central_sr_legacy_food_csv_2018-04")
# افزودن اقلام نسخه‌ی ۲ به data\foods.json (قابل تکرار: اقلام قبلی با همین کدها جایگزین می‌شوند)
#  - extra_foods2.tsv : اقلام USDA؛ همه‌ی اعداد مستقیم از فایل‌های رسمی SR Legacy خوانده می‌شود
#  - local_foods.tsv  : اقلام ایرانی با اعداد واردشده توسط دکتر صادقی (تقریبی؛ approx = true)
#  - سدیم نان‌های F31 تا F35: از فهرست دکتر صادقی (تقریبی)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$inv = [Globalization.CultureInfo]::InvariantCulture
$want = @{ 1008='kcal';1003='p';1004='f';1005='c';1079='fib';2000='sug';1093='na';1092='k';1087='ca';1089='fe';1090='mg';1095='zn';1162='vc';1114='vd';1178='b12';1190='fol';1106='va';1109='ve';1185='vk';1258='sfa';1253='chol';1051='w' }
$foods = [ordered]@{}
foreach ($x in ((Get-Content -Raw -Encoding UTF8 "$root\data\foods.json").Trim([char]0xFEFF) | ConvertFrom-Json)) { $foods[$x.id] = $x }

# ---------- اقلام USDA ----------
$fdcDesc = @{}
foreach ($l in [IO.File]::ReadLines("$UsdaDir\food.csv")) { if ($l -match '^"(\d+)","sr_legacy_food","(.*)","\d+","') { $fdcDesc[$Matches[1]] = $Matches[2] -replace '""', '"' } }
$byFdc = @{}
foreach ($l in (Get-Content "$PSScriptRoot\extra_foods2.tsv" -Encoding UTF8 | Where-Object { $_ -and -not $_.StartsWith('#') })) {
  $p = $l -split "`t"
  if (-not $fdcDesc.ContainsKey($p[1])) { throw "FDC $($p[1]) not found" }
  $foods[$p[0]] = [ordered]@{ id = $p[0]; fa = $p[2]; src_id = $p[1]; src_desc = $fdcDesc[$p[1]]; state = $p[3]; source = 'USDA SR Legacy 2018-04'; match = $p[4]; n = [ordered]@{}; portions = @() }
  if (-not $byFdc[$p[1]]) { $byFdc[$p[1]] = @() }; $byFdc[$p[1]] += $p[0]
}
$rd = New-Object IO.StreamReader("$UsdaDir\food_nutrient.csv"); [void]$rd.ReadLine()
while (($l = $rd.ReadLine()) -ne $null) {
  $q = $l.Split(','); $fdc = $q[1].Trim('"')
  if (-not $byFdc.ContainsKey($fdc)) { continue }
  $nid = [int]$q[2].Trim('"'); if (-not $want.ContainsKey($nid)) { continue }
  foreach ($c in $byFdc[$fdc]) { $foods[$c].n[$want[$nid]] = [double]::Parse($q[3].Trim('"'), $inv) }
}
$rd.Close()
$units = @{}; foreach ($m in (Import-Csv "$UsdaDir\measure_unit.csv")) { $units[$m.id] = $m.name }
foreach ($r in (Import-Csv "$UsdaDir\food_portion.csv")) {
  if (-not $byFdc.ContainsKey($r.fdc_id)) { continue }
  $label = (@($r.amount, $(if ($units[$r.measure_unit_id] -and $units[$r.measure_unit_id] -ne 'undetermined') { $units[$r.measure_unit_id] } else { '' }), $r.modifier, $r.portion_description) | Where-Object { $_ }) -join ' '
  foreach ($c in $byFdc[$r.fdc_id]) { $foods[$c].portions += , ([ordered]@{ en = $label.Trim(); g = [double]::Parse($r.gram_weight, $inv) }) }
}

# ---------- اقلام ایرانی ----------
$cols = 'w,kcal,p,f,c,fib,sug,sfa,chol,na,k,ca,fe,mg,zn,vc,fol,b12,va,ve,vd,vk'.Split(',')
foreach ($l in (Get-Content "$PSScriptRoot\local_foods.tsv" -Encoding UTF8 | Where-Object { $_ -and -not $_.StartsWith('#') })) {
  $p = $l -split "`t"
  $n = [ordered]@{}
  for ($i = 0; $i -lt $cols.Count; $i++) { $v = $p[6 + $i]; if ($v -ne '') { $n[$cols[$i]] = [double]::Parse($v, $inv) } }
  $por = @()
  foreach ($h in ($p[28] -split '؛')) { if ($h -match '^\s*(.+?)\s*=\s*([\d.]+)') { $por += , ([ordered]@{ en = $Matches[1]; g = [double]::Parse($Matches[2], $inv) }) } }
  $foods[$p[0]] = [ordered]@{ id = $p[0]; fa = $p[1]; src_id = $p[4]; src_desc = $p[5]; state = $p[2]; source = 'سایت‌های ایرانی (استخراج: دکتر صادقی)'; match = 'تقریبی'; approx = $true; note = "منبع ذکرشده در فهرست: $($p[3])"; n = $n; portions = $por }
}

# ---------- سدیم نان‌ها ----------
$breadNa = @{ F31 = 480; F32 = 550; F33 = 520; F34 = 520; F35 = 450 }
foreach ($k in $breadNa.Keys) {
  $b = $foods[$k]; $b.n | Add-Member -NotePropertyName na -NotePropertyValue $breadNa[$k] -Force
  $b | Add-Member -NotePropertyName note -NotePropertyValue 'سدیم: تقریبی، از سایت‌های ایرانی (استخراج: دکتر صادقی)' -Force
}

$arr = @($foods.Values)
($arr | ConvertTo-Json -Depth 6 -Compress) | Set-Content -Path "$root\data\foods.json" -Encoding UTF8
"total foods: $($arr.Count)"
foreach ($f in $arr) { $miss = @('kcal', 'p', 'f', 'c') | Where-Object { $null -eq $f.n.$_ } ; if ($miss) { "MISSING $($f.id) $($f.fa): $($miss -join ',')" } }
