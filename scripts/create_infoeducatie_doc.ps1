$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "documentatie"
$screensDir = Join-Path $root "screenshots"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
New-Item -ItemType Directory -Force -Path "C:\tmp\learnx-doc" | Out-Null

$docxPath = Join-Path $outDir "Documentatie_LEARNX_InfoEducatie.docx"
$pdfPath = Join-Path $outDir "Documentatie_LEARNX_InfoEducatie.pdf"
$tempDocxPath = "C:\tmp\learnx-doc\Documentatie_LEARNX_InfoEducatie.docx"
$tempPdfPath = "C:\tmp\learnx-doc\Documentatie_LEARNX_InfoEducatie.pdf"
$desktopShot = Join-Path $screensDir "learnx-dashboard.png"
$mobileShot = Join-Path $screensDir "learnx-mobile.png"

function Add-Para {
  param(
    [object]$Doc,
    [string]$Text,
    [string]$Style = "Normal",
    [bool]$Bold = $false,
    [int]$Color = 0,
    [double]$SpaceAfter = 6
  )
  $p = $Doc.Paragraphs.Add()
  $p.Range.Text = $Text
  $p.Range.Style = $Style
  $p.Range.Font.Bold = [int]$Bold
  if ($Color -ne 0) { $p.Range.Font.Color = $Color }
  $p.Format.SpaceAfter = $SpaceAfter
  $p.Range.InsertParagraphAfter()
  return $p
}

function Add-Bullets {
  param([object]$Doc, [string[]]$Items)
  foreach ($item in $Items) {
    $p = $Doc.Paragraphs.Add()
    $p.Range.Text = $item
    $p.Range.Style = "Normal"
    $p.Range.ListFormat.ApplyBulletDefault()
    $p.Format.LeftIndent = 28
    $p.Format.FirstLineIndent = -14
    $p.Format.SpaceAfter = 3
    $p.Range.InsertParagraphAfter()
  }
}

function Add-Numbered {
  param([object]$Doc, [string[]]$Items)
  foreach ($item in $Items) {
    $p = $Doc.Paragraphs.Add()
    $p.Range.Text = $item
    $p.Range.Style = "Normal"
    $p.Range.ListFormat.ApplyNumberDefault()
    $p.Format.LeftIndent = 28
    $p.Format.FirstLineIndent = -14
    $p.Format.SpaceAfter = 3
    $p.Range.InsertParagraphAfter()
  }
}

function Add-Table {
  param([object]$Doc, [string[]]$Headers, [object[][]]$Rows)
  $table = $Doc.Tables.Add($Doc.Range($Doc.Content.End - 1), $Rows.Count + 1, $Headers.Count)
  $table.Borders.Enable = 1
  $table.Range.Font.Name = "Calibri"
  $table.Range.Font.Size = 10
  $table.Rows.Item(1).Range.Font.Bold = 1
  $table.Rows.Item(1).Shading.BackgroundPatternColor = 13421823
  for ($c = 0; $c -lt $Headers.Count; $c++) {
    $table.Cell(1, $c + 1).Range.Text = $Headers[$c]
  }
  for ($r = 0; $r -lt $Rows.Count; $r++) {
    for ($c = 0; $c -lt $Headers.Count; $c++) {
      $table.Cell($r + 2, $c + 1).Range.Text = [string]$Rows[$r][$c]
    }
  }
  $table.AutoFitBehavior(2)
  $Doc.Paragraphs.Add() | Out-Null
}

function Add-Screenshot {
  param([object]$Doc, [string]$Path, [string]$Caption, [double]$Width)
  if (Test-Path $Path) {
    Add-Para $Doc $Caption "Caption" $true 49407 4 | Out-Null
    $p = $Doc.Paragraphs.Add()
    $shape = $p.Range.InlineShapes.AddPicture($Path, $false, $true)
    $shape.LockAspectRatio = $true
    $shape.Width = $Width
    $p.Alignment = 1
    $p.Range.InsertParagraphAfter()
  }
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
  $doc = $word.Documents.Add()
  $doc.PageSetup.TopMargin = 72
  $doc.PageSetup.BottomMargin = 72
  $doc.PageSetup.LeftMargin = 72
  $doc.PageSetup.RightMargin = 72

  $orange = 49407
  $dark = 2236962
  $muted = 6710886

  $doc.Styles.Item("Normal").Font.Name = "Calibri"
  $doc.Styles.Item("Normal").Font.Size = 11
  $doc.Styles.Item("Normal").ParagraphFormat.SpaceAfter = 6
  $doc.Styles.Item("Normal").ParagraphFormat.LineSpacingRule = 0

  foreach ($styleName in @("Heading 1","Heading 2","Heading 3")) {
    $s = $doc.Styles.Item($styleName)
    $s.Font.Name = "Calibri"
    $s.Font.Color = $orange
    $s.Font.Bold = 1
  }
  $doc.Styles.Item("Heading 1").Font.Size = 16
  $doc.Styles.Item("Heading 2").Font.Size = 13
  $doc.Styles.Item("Heading 3").Font.Size = 12
  $doc.Styles.Item("Title").Font.Name = "Calibri"
  $doc.Styles.Item("Title").Font.Size = 28
  $doc.Styles.Item("Title").Font.Color = $orange
  $doc.Styles.Item("Title").Font.Bold = 1
  $doc.Styles.Item("Subtitle").Font.Color = $muted
  $doc.Styles.Item("Subtitle").Font.Size = 13

  Add-Para $doc "LEARNX: Lecții Transformate" "Title" $true $orange 8 | Out-Null
  Add-Para $doc "Documentație de proiect pentru Olimpiada InfoEducație" "Subtitle" $false $muted 18 | Out-Null
  Add-Para $doc "Categorie propusă: software educațional / aplicație web cu inteligență artificială" "Normal" $false $dark 4 | Out-Null
  Add-Para $doc "Versiune document: 1.0" "Normal" $false $dark 24 | Out-Null
  Add-Para $doc "LEARNX transformă transcrieri brute, fișiere audio sau clipuri video în materiale de studiu structurate. Aplicația urmărește să reducă timpul necesar transformării unei lecții orale într-un suport de învățare clar, verificabil și ușor de parcurs." "Normal" $false 0 8 | Out-Null

  Add-Table $doc @("Componentă", "Descriere") @(
    @("Frontend", "Interfață React/Vite cu temă alb-portocaliu, editor de transcriere și panou de material generat."),
    @("Backend", "Server Express/TypeScript care gestionează upload-ul, apelurile Gemini și livrarea aplicației."),
    @("AI", "Gemini este folosit pentru transcriere media și structurare a materialului strict pe baza transcrierii."),
    @("Export", "Materialul final poate fi descărcat în format Markdown.")
  )

  $doc.Words.Last.InsertBreak(7)

  Add-Para $doc "1. Rezumat Executiv" "Heading 1" | Out-Null
  Add-Para $doc "LEARNX este o aplicație web educațională care pornește de la o problemă reală: elevii primesc frecvent lecții sub formă de explicații orale, înregistrări sau transcrieri neordonate, iar transformarea acestora în material de studiu consumă timp și este predispusă la omisiuni." | Out-Null
  Add-Para $doc "Soluția propusă automatizează această conversie. Utilizatorul poate lipi o transcriere, poate încărca un fișier text/JSON sau poate încărca direct audio/video. Aplicația extrage conținutul, îl organizează într-un document didactic și marchează separat eventualele diferențe observate față de informațiile generale ale modelului, fără a modifica materialul principal." | Out-Null

  Add-Para $doc "2. Problema Identificată" "Heading 1" | Out-Null
  Add-Bullets $doc @(
    "Lecțiile orale sunt greu de recitit și de recapitulizat eficient.",
    "Transcrierile automate conțin adesea repetiții, pauze, exprimări incomplete sau dialoguri administrative.",
    "Elevii au nevoie de rezumate, scheme, glosare și întrebări de verificare, nu doar de text brut.",
    "Corectarea automată necontrolată poate introduce informații care nu au fost predate."
  )

  Add-Para $doc "3. Soluția Propusă" "Heading 1" | Out-Null
  Add-Para $doc "LEARNX organizează informația educațională într-un flux simplu: sursă brută, procesare, material structurat. Aplicația păstrează conținutul lecției ca sursă principală și nu completează automat materia cu informații externe. Dacă modelul detectează o posibilă diferență, aceasta este afișată separat sub forma unei observații marcate cu semnul exclamării." | Out-Null
  Add-Bullets $doc @(
    "Transcriere integrală pentru fișiere audio/video.",
    "Generare de material Markdown cu meta-informații, rezumat, schemă, glosar și test de verificare.",
    "Observații de verificare marcate cu !, fără alterarea conținutului principal.",
    "Export rapid în format .md pentru arhivare sau editare ulterioară."
  )

  Add-Para $doc "4. Capturi din Aplicație" "Heading 1" | Out-Null
  Add-Screenshot $doc $desktopShot "Figura 1. Interfața principală LEARNX pe desktop." 430
  Add-Para $doc "Interfața este împărțită în două zone: panoul de introducere a transcrierii și panoul unde apare materialul structurat. Acțiunile principale sunt încărcarea audio/video, generarea materialului și exportul rezultatului." | Out-Null
  Add-Screenshot $doc $mobileShot "Figura 2. Test de afișare la lățime redusă; captura evidențiază zona care trebuie optimizată ulterior pentru mobile." 230

  Add-Para $doc "5. Funcționalități Principale" "Heading 1" | Out-Null
  Add-Table $doc @("Funcționalitate", "Utilitate pentru elev", "Stadiu") @(
    @("Input text/JSON", "Permite folosirea transcrierilor existente.", "Implementat"),
    @("Upload MP4/audio", "Elimină pasul manual de transcriere.", "Implementat"),
    @("Generare material", "Produce rezumat, schemă, glosar și întrebări.", "Implementat"),
    @("Observații !", "Separă verificările AI de materialul predat.", "Implementat"),
    @("Export Markdown", "Permite salvarea lecției pentru notițe sau publicare.", "Implementat")
  )

  Add-Para $doc "6. Arhitectură Tehnică" "Heading 1" | Out-Null
  Add-Para $doc "Aplicația folosește o arhitectură web clasică, cu frontend React și backend Express. Frontendul gestionează experiența utilizatorului, iar backendul centralizează logica de procesare, upload și comunicare cu Gemini." | Out-Null
  Add-Numbered $doc @(
    "Utilizatorul introduce text sau încarcă un fișier media.",
    "Serverul validează upload-ul și trimite fișierul către Gemini Files API.",
    "Modelul transcrie conținutul audio/video.",
    "Transcrierea este trimisă către promptul de structurare.",
    "Răspunsul Markdown este afișat în aplicație și poate fi exportat."
  )
  Add-Table $doc @("Strat", "Tehnologie", "Rol") @(
    @("Frontend", "React, Vite, Tailwind CSS", "Interfață, editor, randare Markdown."),
    @("Backend", "Express, TypeScript, Multer", "API local, upload, proxy către Gemini."),
    @("AI", "Gemini 3 Flash Preview", "Transcriere și structurare."),
    @("Persistență", "Fișiere temporare în uploads/", "Stocare temporară până la finalizarea procesării.")
  )

  Add-Para $doc "7. Principii de Utilizare a Inteligenței Artificiale" "Heading 1" | Out-Null
  Add-Para $doc "Un obiectiv important al proiectului este separarea clară între conținutul predat și cunoștințele generale ale modelului. Materialul principal este generat strict din transcriere. Astfel, aplicația nu rescrie lecția pe baza propriei baze de cunoștințe și nu introduce completări nesemnalate." | Out-Null
  Add-Bullets $doc @(
    "Nu se corectează automat conținutul lecției în materialul principal.",
    "Nu se completează informații lipsă din surse externe.",
    "Diferențele posibile sunt marcate separat în secțiunea de observații.",
    "Elevul poate vedea clar ce provine din lecție și ce este doar o atenționare."
  )

  Add-Para $doc "8. Testare și Validare" "Heading 1" | Out-Null
  Add-Table $doc @("Test", "Rezultat așteptat", "Observații") @(
    @("Pornire server", "API-ul răspunde la /api/health.", "Validat local."),
    @("Build producție", "Aplicația compilează și serverul pornește din dist.", "Validat cu npm run build și npm run start."),
    @("Upload audio", "Fișierul este trimis către Gemini și transcris.", "Există retry pentru erori temporare de rețea."),
    @("Favicon", "Nu mai apare eroare 404.", "Endpointul returnează 204."),
    @("Responsive", "Interfața rămâne utilizabilă pe ecrane mici.", "Necesită îmbunătățire; captura mobilă marchează limita curentă.")
  )

  Add-Para $doc "9. Impact Educațional" "Heading 1" | Out-Null
  Add-Para $doc "LEARNX poate reduce distanța dintre lecția predată și materialul de recapitulare. Elevul nu mai pornește de la o înregistrare lungă sau de la o transcriere dezordonată, ci de la un document cu structură logică, concepte-cheie și întrebări pentru autoevaluare." | Out-Null
  Add-Bullets $doc @(
    "Sprijină învățarea activă prin întrebări de verificare.",
    "Ajută elevii care lipsesc sau vor să revadă o lecție.",
    "Poate fi folosit de profesori pentru a transforma rapid explicațiile orale în suport scris.",
    "Păstrează transparența asupra conținutului generat de AI."
  )

  Add-Para $doc "10. Plan de Dezvoltare" "Heading 1" | Out-Null
  Add-Numbered $doc @(
    "Optimizare completă pentru ecrane mobile.",
    "Adăugarea unui istoric real de lecții procesate, cu salvare locală sau cont de utilizator.",
    "Export în PDF și DOCX direct din aplicație.",
    "Control granular al nivelului de detaliu: scurt, mediu, avansat.",
    "Mod profesor: editare manuală și aprobare înainte de distribuire."
  )

  Add-Para $doc "11. Concluzie" "Heading 1" | Out-Null
  Add-Para $doc "LEARNX demonstrează o direcție pragmatică pentru folosirea inteligenței artificiale în educație: nu înlocuiește profesorul și nu rescrie materia fără control, ci transformă lecția existentă într-un format mai ușor de învățat. Prin separarea observațiilor AI de materialul principal, proiectul pune accent pe utilitate, transparență și responsabilitate." | Out-Null

  Add-Para $doc "Anexă: Rulare Locală" "Heading 1" | Out-Null
  Add-Table $doc @("Comandă", "Rol") @(
    @("npm install", "Instalează dependențele proiectului."),
    @("npm run dev", "Pornește aplicația în mod dezvoltare."),
    @("npm run build", "Compilează frontendul și serverul pentru producție."),
    @("npm run start", "Pornește serverul din build-ul de producție.")
  )

  $doc.SaveAs2($tempDocxPath, 16)
  $doc.ExportAsFixedFormat($tempPdfPath, 17)
  $doc.Close($false)
  Copy-Item -LiteralPath $tempDocxPath -Destination $docxPath -Force
  Copy-Item -LiteralPath $tempPdfPath -Destination $pdfPath -Force
}
finally {
  $word.Quit()
}

Write-Output $docxPath
Write-Output $pdfPath
