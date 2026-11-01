param([string]$XlDir, [string]$UsdaDir, [string]$OutFile)
# Builds foods.json: 47 default records from the user's xlsx (raw sheet) + extra SR Legacy foods.
$ErrorActionPreference = 'Stop'
$want = @{ 1008='kcal';1003='p';1004='f';1005='c';1079='fib';2000='sug';1093='na';1092='k';1087='ca';1089='fe';1090='mg';1095='zn';1162='vc';1114='vd';1178='b12';1190='fol';1106='va';1109='ve';1185='vk';1258='sfa';1253='chol';1051='w' }

# ---------- shared strings ----------
$S = New-Object System.Collections.Generic.List[string]
$xr = [System.Xml.XmlReader]::Create("$XlDir\sharedStrings.xml")
while ($xr.Read()) {
  if ($xr.NodeType -eq 'Element' -and $xr.LocalName -eq 'si') {
    $sub = $xr.ReadSubtree(); $sb = New-Object System.Text.StringBuilder
    while ($sub.Read()) { if ($sub.NodeType -eq 'Element' -and $sub.LocalName -eq 't') { [void]$sb.Append($sub.ReadElementContentAsString()) } }
    $S.Add($sb.ToString())
  }
}
$xr.Close()

# ---------- sheet7 (long format) ----------
$foods = [ordered]@{}
$xr = [System.Xml.XmlReader]::Create("$XlDir\worksheets\sheet7.xml")
$rowIdx = 0
while ($xr.Read()) {
  if ($xr.NodeType -eq 'Element' -and $xr.LocalName -eq 'row') {
    $rowIdx++
    $cells = @{}
    $sub = $xr.ReadSubtree()
    $col = $null; $type = $null
    while ($sub.Read()) {
      if ($sub.NodeType -eq 'Element' -and $sub.LocalName -eq 'c') { $col = ($sub.GetAttribute('r') -replace '\d', ''); $type = $sub.GetAttribute('t') }
      elseif ($sub.NodeType -eq 'Element' -and $sub.LocalName -eq 'v') { $v = $sub.ReadElementContentAsString(); if ($type -eq 's') { $v = $S[[int]$v] }; $cells[$col] = $v }
      elseif ($sub.NodeType -eq 'Element' -and $sub.LocalName -eq 't') { $cells[$col] = $sub.ReadElementContentAsString() }
    }
    if ($rowIdx -eq 1) { continue }
    if ($cells['C'] -ne 'بله') { continue }
    $code = $cells['A']
    if (-not $foods.Contains($code)) {
      $foods[$code] = [ordered]@{ id=$code; fa=$cells['B']; src_id=$cells['E']; src_desc=$cells['F']; state=$cells['G']; source=$cells['M']; match=$cells['D']; n=[ordered]@{}; portions=@() }
    }
    $nid = [int]$cells['H']
    if ($want.ContainsKey($nid) -and $cells['L'] -ne $null -and $cells['L'] -ne '') {
      $foods[$code].n[$want[$nid]] = [double]::Parse($cells['L'], [Globalization.CultureInfo]::InvariantCulture)
    }
  }
}
$xr.Close()
Write-Host "xlsx foods: $($foods.Count)"

# ---------- extra SR Legacy foods ----------
$extra = Get-Content "$PSScriptRoot\extra_foods.tsv" -Encoding UTF8 | Where-Object { $_ -and -not $_.StartsWith('#') }
$fdcDesc = @{}
foreach ($l in [System.IO.File]::ReadLines("$UsdaDir\food.csv")) { if ($l -match '^"(\d+)","sr_legacy_food","(.*)","\d+","') { $fdcDesc[$Matches[1]] = $Matches[2] -replace '""', '"' } }
$byFdc = @{}
foreach ($l in $extra) {
  $p = $l -split "`t"
  $code = $p[0]; $fdc = $p[1]
  if (-not $fdcDesc.ContainsKey($fdc)) { throw "FDC $fdc not found" }
  $foods[$code] = [ordered]@{ id=$code; fa=$p[2]; src_id=$fdc; src_desc=$fdcDesc[$fdc]; state=$p[3]; source='USDA SR Legacy 2018-04'; match='دقیق'; n=[ordered]@{}; portions=@() }
  $byFdc[$fdc] = $code
}
# map xlsx source ids too (for portions)
$portFdc = @{}
foreach ($k in $foods.Keys) { $sid = $foods[$k].src_id; if ($sid -match '^\d+$') { if (-not $portFdc.ContainsKey($sid)) { $portFdc[$sid] = @() }; $portFdc[$sid] += $k } }

$inv = [Globalization.CultureInfo]::InvariantCulture
$rd = New-Object System.IO.StreamReader("$UsdaDir\food_nutrient.csv")
[void]$rd.ReadLine()
while (($l = $rd.ReadLine()) -ne $null) {
  # "id","fdc_id","nutrient_id","amount",...
  $q = $l.Split(',')
  $fdc = $q[1].Trim('"')
  if (-not $byFdc.ContainsKey($fdc)) { continue }
  $nid = [int]$q[2].Trim('"')
  if (-not $want.ContainsKey($nid)) { continue }
  $foods[$byFdc[$fdc]].n[$want[$nid]] = [double]::Parse($q[3].Trim('"'), $inv)
}
$rd.Close()

# ---------- portions ----------
$units = @{}
$mu = Import-Csv "$UsdaDir\measure_unit.csv"
foreach ($m in $mu) { $units[$m.id] = $m.name }
$fp = Import-Csv "$UsdaDir\food_portion.csv"
foreach ($r in $fp) {
  if (-not $portFdc.ContainsKey($r.fdc_id)) { continue }
  $g = [double]::Parse($r.gram_weight, $inv)
  $label = (@($r.amount, $(if ($units[$r.measure_unit_id] -and $units[$r.measure_unit_id] -ne 'undetermined') { $units[$r.measure_unit_id] } else { '' }), $r.modifier, $r.portion_description) | Where-Object { $_ }) -join ' '
  foreach ($code in $portFdc[$r.fdc_id]) { $foods[$code].portions += ,([ordered]@{ en=$label.Trim(); g=$g }) }
}

$arr = @($foods.Values)
($arr | ConvertTo-Json -Depth 6 -Compress) | Set-Content -Path $OutFile -Encoding UTF8
Write-Host "total foods: $($arr.Count)"
foreach ($f in $arr) { $miss = @('kcal','p','f','c') | Where-Object { -not $f.n.Contains($_) }; if ($miss) { Write-Host "MISSING $($f.id) $($f.fa): $($miss -join ',')" } }
