# ساخت فایل اکسل مرجع غذاها از data\foods.json (بدون نیاز به نصب Excel)
# خروجی: مرجع-غذاها.xlsx در ریشه‌ی پروژه
param([string]$Name = 'مرجع-غذاها')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$root = Split-Path $PSScriptRoot -Parent
$foods = [IO.File]::ReadAllText((Join-Path $root 'data\foods.json'), [Text.Encoding]::UTF8).Trim([char]0xFEFF) | ConvertFrom-Json
$meta = [IO.File]::ReadAllText((Join-Path $root 'src\meta.js'), [Text.Encoding]::UTF8)

# گروه هر غذا و نام فارسی گروه‌ها از meta.js
$grp = @{}; [regex]::Matches($meta, "(?m)^\s*([A-Z]+\d+[A-Z]?): \{ g: '(\w+)'") | ForEach-Object { $grp[$_.Groups[1].Value] = $_.Groups[2].Value }
# اقلام خام: گروه همان غذای پخته؛ بقیه‌ی اقلام فقط‌مرجع از REF_G
$rawBlock = [regex]::Match($meta, 'const RAW = \{([\s\S]*?)\};').Groups[1].Value
[regex]::Matches($rawBlock, "(\w+): \['(\w+)'") | ForEach-Object { if (-not $grp[$_.Groups[2].Value]) { $grp[$_.Groups[2].Value] = $grp[$_.Groups[1].Value] } }
$refBlock = [regex]::Match($meta, 'const REF_G = \{([\s\S]*?)\};').Groups[1].Value
[regex]::Matches($refBlock, "(\w+): '(\w+)'") | ForEach-Object { $grp[$_.Groups[1].Value] = $_.Groups[2].Value }
$gfa = @{}; $gblock = [regex]::Match($meta, 'const GROUP_FA = \{([\s\S]*?)\};').Groups[1].Value
[regex]::Matches($gblock, "(\w+): '([^']+)'") | ForEach-Object { $gfa[$_.Groups[1].Value] = $_.Groups[2].Value }

# ستون‌های ارزش غذایی: کلید، عنوان، شناسه‌ی ماده‌ی مغذی در USDA
$NUT = @(
  @('w', 'آب (گرم)', 1051), @('kcal', 'انرژی (کیلوکالری)', 1008), @('p', 'پروتئین (گرم)', 1003), @('f', 'چربی (گرم)', 1004),
  @('c', 'کربوهیدرات (گرم)', 1005), @('fib', 'فیبر (گرم)', 1079), @('sug', 'قند کل (گرم)', 2000), @('sfa', 'چربی اشباع (گرم)', 1258),
  @('chol', 'کلسترول (میلی‌گرم)', 1253), @('na', 'سدیم (میلی‌گرم)', 1093), @('k', 'پتاسیم (میلی‌گرم)', 1092), @('ca', 'کلسیم (میلی‌گرم)', 1087),
  @('fe', 'آهن (میلی‌گرم)', 1089), @('mg', 'منیزیم (میلی‌گرم)', 1090), @('zn', 'روی (میلی‌گرم)', 1095), @('vc', 'ویتامین C (میلی‌گرم)', 1162),
  @('fol', 'فولات DFE (میکروگرم)', 1190), @('b12', 'ویتامین B12 (میکروگرم)', 1178), @('va', 'ویتامین A RAE (میکروگرم)', 1106),
  @('ve', 'ویتامین E (میلی‌گرم)', 1109), @('vd', 'ویتامین D (میکروگرم)', 1114), @('vk', 'ویتامین K (میکروگرم)', 1185)
)

function X($s) { [Security.SecurityElement]::Escape([string]$s) }
function ColName([int]$i) { $s = ''; $i++; while ($i -gt 0) { $m = ($i - 1) % 26; $s = [char](65 + $m) + $s; $i = [int](($i - $m - 1) / 26) }; $s }
function Row([int]$r, $cells, [int]$style = 0) {
  $sb = New-Object Text.StringBuilder
  [void]$sb.Append("<row r=`"$r`">")
  for ($i = 0; $i -lt $cells.Count; $i++) {
    $v = $cells[$i]; $ref = (ColName $i) + $r; $st = if ($style) { " s=`"$style`"" } else { '' }
    # توجه: در PowerShell عبارت 0 -eq '' درست است؛ پس رشته‌ی خالی جدا بررسی می‌شود تا صفرهای واقعی حذف نشوند
    if ($null -eq $v -or ($v -is [string] -and $v -eq '')) { continue }
    if ($v -is [double] -or $v -is [int] -or $v -is [decimal] -or $v -is [long]) { [void]$sb.Append("<c r=`"$ref`"$st><v>$([string]::Format([Globalization.CultureInfo]::InvariantCulture, '{0}', $v))</v></c>") }
    elseif ($v -is [hashtable]) { [void]$sb.Append("<c r=`"$ref`" s=`"$($v.s)`" t=`"inlineStr`"><is><t xml:space=`"preserve`">$(X $v.t)</t></is></c>") }
    else { [void]$sb.Append("<c r=`"$ref`"$st t=`"inlineStr`"><is><t xml:space=`"preserve`">$(X $v)</t></is></c>") }
  }
  [void]$sb.Append('</row>'); $sb.ToString()
}
function Sheet($rows, $widths, [bool]$freeze) {
  $cols = ($widths | ForEach-Object -Begin { $i = 0 } -Process { $i++; "<col min=`"$i`" max=`"$i`" width=`"$_`" customWidth=`"1`"/>" }) -join ''
  $pane = if ($freeze) { '<pane xSplit="2" ySplit="1" topLeftCell="C2" activePane="bottomLeft" state="frozen"/>' } else { '' }
  "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><worksheet xmlns=`"http://schemas.openxmlformats.org/spreadsheetml/2006/main`"><sheetViews><sheetView rightToLeft=`"1`" workbookViewId=`"0`">$pane</sheetView></sheetViews><cols>$cols</cols><sheetData>$($rows -join '')</sheetData>$(if ($freeze) { '<autoFilter ref="A1:AF1"/>' })</worksheet>"
}

# ---------- برگه‌ی ۱: غذاها ----------
$head = @('کد', 'نام فارسی', 'گروه', 'حالت', 'منبع', 'شناسه در منبع', 'شرح غذا در منبع (انگلیسی)', 'میزان تطابق') + ($NUT | ForEach-Object { $_[1] }) + @('واحدهای خانگی در منبع (گرم)', 'لینک منبع')
$rows = @(Row 1 $head 1)
$r = 2
foreach ($f in $foods) {
  $g = $grp[$f.id]
  $link = if ($f.source -like 'USDA*') { "https://fdc.nal.usda.gov/food-details/$($f.src_id)/nutrients" } elseif ($f.source -like 'FAO*') { 'FAO Food Composition Tables for the Near East (1982)' } else { '' }
  $cells = @($f.id, $f.fa, $(if ($g) { $gfa[$g] } else { '' }), $f.state, $f.source, $f.src_id, $f.src_desc, $(if ($f.note) { "$($f.match) — $($f.note)" } else { $f.match }))
  foreach ($n in $NUT) { $v = $f.n.($n[0]); $cells += $(if ($null -ne $v) { [double]$v } else { $null }) }
  $cells += (($f.portions | ForEach-Object { "$($_.en) = $($_.g)" }) -join ' ؛ ')
  $cells += $link
  $rows += Row $r $cells; $r++
}
$s1 = Sheet $rows (@(7, 30, 16, 16, 20, 13, 60, 12) + (@(11) * $NUT.Count) + @(60, 55)) $true

# ---------- برگه‌ی ۲: راهنما ----------
$guide = @(
  @(@{ t = 'مرجع ارزش غذایی برنامه‌ی تغذیه (اسپارتینا و بدنسازی)'; s = 2 }),
  @(''),
  @('همه‌ی اعداد برای ۱۰۰ گرم بخش خوراکی و در «حالت» ذکرشده (پخته، خام یا آماده‌ی مصرف) هستند.'),
  @('اعداد اقلام USDA و فائو تخمین زده یا ساخته نشده‌اند. اعداد اقلام «تقریبی» (کدهای IR و R42) و سدیم نان‌ها را دکتر صادقی از سایت‌های ایرانی استخراج کرده است.'),
  @('عدد صفر یعنی منبع مقدار را صفر ثبت کرده است. خانه‌ی خالی یعنی آن ماده‌ی مغذی در منبع ثبت نشده است.'),
  @('برنامه در محاسبه، خانه‌ی خالی را صفر حساب می‌کند؛ پس برای این اقلام مقدار ریزمغذی‌ها حداقلی است.'),
  @(''),
  @(@{ t = 'منابع'; s = 2 }),
  @('USDA FoodData Central — SR Legacy (نسخه‌ی آوریل ۲۰۱۸)', 'https://fdc.nal.usda.gov', 'شناسه‌ی هر غذا همان FDC ID است و از ستون «لینک منبع» مستقیم باز می‌شود. شناسه‌ی هر قلم با شرح انگلیسی آن در فایل رسمی تطبیق داده شده است.'),
  @('FAO — Food Composition Tables for the Near East (1982)', 'برای ۵ نان ایرانی (F31 تا F35)', 'سنگک، بربری، لواش، تافتون و نان جو. اعداد از فایل مرجع اولیه برداشته شده که منبعشان را این جدول فائو (با شماره‌ی ردیف) ذکر کرده است؛ با متن خود جدول فائو تطبیق داده نشده‌اند. «فیبر خام» فائو با «فیبر غذایی» USDA یکی نیست، پس در ستون فیبر نیامده است.'),
  @('سایت‌های ایرانی (استخراج: دکتر صادقی)', 'اقلام IR01 تا IR05، IR08، IR13 تا IR15، R42 و سدیم نان‌ها', 'تقریبی؛ با جدول رسمی تطبیق داده نشده‌اند. در برنامه و PDF با علامت ≈ نشان داده می‌شوند.'),
  @('فایل مرجع اولیه: bodybuilding_food_reference.xlsx', 'اقلام F01 تا F47', 'شناسه‌ی USDA هر قلم از این فایل برداشته شد، ولی همه‌ی اعداد (جز ۵ نان فائو) مستقیم از فایل‌های رسمی USDA خوانده شده‌اند.'),
  @('اقلام N01 تا N75، R01 تا R41 و بقیه‌ی کدهای IR', 'افزوده‌شده', 'هر کدام با شناسه‌ی FDC انتخاب و همه‌ی اعداد مستقیم از فایل‌های رسمی USDA SR Legacy خوانده شده‌اند. کدهای R اقلام خام‌اند و برای «معادل خام» و فهرست خرید به کار می‌روند.'),
  @(''),
  @(@{ t = 'معنی ستون «میزان تطابق»'; s = 2 }),
  @('دقیق', 'غذای منبع دقیقاً همان غذای فارسی است.'),
  @('نزدیک', 'نزدیک‌ترین مورد موجود در منبع (مثلاً روش پخت یا برش کمی متفاوت). شرح انگلیسی را ببینید.'),
  @('جایگزین', 'غذای ایرانی در منبع نبود؛ نزدیک‌ترین معادل استاندارد آمده است. شرح انگلیسی را ببینید.'),
  @('فائو/ایرانی', 'نان ایرانی از جدول فائو.'),
  @('تقریبی', 'داده از سایت‌های ایرانی، استخراج دکتر صادقی؛ با منبع رسمی تطبیق داده نشده است.'),
  @(''),
  @(@{ t = 'معادل خام'; s = 2 }),
  @('وزن خام ≈ وزن پخته × (مقدار پروتئین یا کربوهیدرات در ۱۰۰ گرم پخته ÷ مقدار در ۱۰۰ گرم خام)', 'هر دو عدد از USDA', 'برای گوشت و ماهی پروتئین، برای غلات و حبوبات کربوهیدرات ثابت فرض می‌شود. نتیجه تقریبی است و به روش پخت بستگی دارد.'),
  @(''),
  @(@{ t = 'شناسه‌ی مواد مغذی در USDA'; s = 2 })
)
foreach ($n in $NUT) { $guide += , @($n[1], "Nutrient ID $($n[2])") }
$guide += , @('')
$guide += , @('این فایل با tools\export_ref.ps1 از data\foods.json ساخته می‌شود؛ پس از هر تغییر در داده‌ها دوباره اجرایش کنید.')
$rows2 = @(); $r = 1; foreach ($g in $guide) { $rows2 += Row $r $g; $r++ }
$s2 = Sheet $rows2 @(55, 45, 90) $false

$styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Tahoma"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Tahoma"/></font><font><b/><sz val="13"/><color rgb="FF1C2766"/><name val="Tahoma"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1C2766"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf fontId="0"/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"><alignment wrapText="1" vertical="center" horizontal="center"/></xf><xf fontId="2" applyFont="1"/></cellXfs></styleSheet>'
$files = [ordered]@{
  '[Content_Types].xml'        = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'
  '_rels/.rels'                = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
  'xl/workbook.xml'            = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="غذاها" sheetId="1" r:id="rId1"/><sheet name="راهنما و منابع" sheetId="2" r:id="rId2"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">غذاها!$A$1:$AF$1</definedName></definedNames></workbook>'
  'xl/_rels/workbook.xml.rels' = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
  'xl/styles.xml'              = $styles
  'xl/worksheets/sheet1.xml'   = $s1
  'xl/worksheets/sheet2.xml'   = $s2
}
$out = Join-Path $root ($Name + '.xlsx')
if (Test-Path $out) { Remove-Item $out }
$zip = [IO.Compression.ZipFile]::Open($out, 'Create')
$utf8 = New-Object Text.UTF8Encoding $false
foreach ($k in $files.Keys) { $e = $zip.CreateEntry($k); $w = New-Object IO.StreamWriter($e.Open(), $utf8); $w.Write($files[$k]); $w.Close() }
$zip.Dispose()
"built $out  ($($foods.Count) foods)"

# ---------- همان داده با قالب JSON تخت (هم‌شکل فایل foods-v2.json دکتر صادقی) ----------
$keys = [ordered]@{ w = 'water_g'; kcal = 'energy_kcal'; p = 'protein_g'; f = 'fat_g'; c = 'carbs_g'; fib = 'fiber_g'; sug = 'sugars_g'; sfa = 'saturated_fat_g'; chol = 'cholesterol_mg'; na = 'sodium_mg'; k = 'potassium_mg'; ca = 'calcium_mg'; fe = 'iron_mg'; mg = 'magnesium_mg'; zn = 'zinc_mg'; vc = 'vitamin_c_mg'; fol = 'folate_dfe_ug'; b12 = 'vitamin_b12_ug'; va = 'vitamin_a_rae_ug'; ve = 'vitamin_e_mg'; vd = 'vitamin_d_ug'; vk = 'vitamin_k_ug' }
$flat = foreach ($f in $foods) {
  $g = $grp[$f.id]
  $o = [ordered]@{ code = $f.id; name_fa = $f.fa; group = $(if ($g) { $gfa[$g] } else { '' }); state = $f.state; source = $f.source; source_id = $f.src_id; description_en = $f.src_desc; match_type = $f.match; is_approximate = [bool]$f.approx; note = $f.note }
  foreach ($k in $keys.Keys) { $o[$keys[$k]] = $f.n.$k }
  $o.household_measures = (($f.portions | ForEach-Object { "$($_.en) = $($_.g)" }) -join ' ؛ ')
  $o.source_url = if ($f.source -like 'USDA*') { "https://fdc.nal.usda.gov/food-details/$($f.src_id)/nutrients" } else { '' }
  $o
}
$jout = Join-Path $root ($Name + '.json')
[IO.File]::WriteAllText($jout, ($flat | ConvertTo-Json -Depth 4), $utf8)
"built $jout"
