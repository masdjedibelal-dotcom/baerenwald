# Leistungen und Preise — Gesamtübersicht

**Datei:** `handwerks-plattform/data/preis/LEISTUNGEN-UND-PREISE.md`

Zusammenführung der auf der Website genutzten Leistungsseiten-Preise (`LEISTUNGEN_DATA`) sowie der Rechner-Basispreise und Test-Fixtures aus den CSV-Dateien im gleichen Ordner.

Alle Beträge sind **Orientierungswerte** für München; im Rechner gelten zusätzlich GU-Marge, PLZ-Faktor, Mindestauftrag und Rundung (siehe Zeile 2 in `01-preis-basis-preise-objekt.csv`).

## 1. Leistungsseiten (Marketing / `/leistungen/[slug]`)
| Slug | Kurzlabel | Preis von | Preis bis | Einheit |
|------|-----------|----------:|----------:|---------|
| `malerarbeiten` | Streichen & Tapezieren | 12 | 22 | pro m² Wandfläche |
| `badezimmer-sanierung` | Neues Bad | 6500 | 20000 | pauschal je nach Umfang |
| `bodenbelag` | Neuer Boden | 35 | 140 | pro m² je nach Material |
| `elektroarbeiten` | Strom & Licht | 85 | 140 | pro Punkt (Steckdose/Licht) |
| `heizung-sanitaer` | Heizung & Wasser | 8000 | 22000 | für Heizungstausch pauschal |
| `gartenpflege` | Gartenpflege | 2.2 | 3.8 | pro m² pro Monat |
| `gartengestaltung` | Garten neu gestalten | 90 | 175 | pro m² je nach Umfang |
| `winterdienst` | Winterdienst | 620 | 1100 | pro Saison |
| `hausmeisterservice` | Hausmeisterservice | 180 | 480 | pro Monat je nach Objekt |
| `fenster-tueren` | Neue Fenster & Türen | 450 | 1400 | pro Fenster inkl. Einbau |
| `trockenbau` | Neue Wände & Decken | 45 | 90 | pro m² Wandfläche |
| `dacharbeiten` | Dach & Regenrinnen | 80 | 180 | pro m² Dachfläche |
| `dachbodenausbau` | Dachbodenausbau | 1200 | 2200 | pro m² Wohnfläche (Richtwert) |
| `kellerausbau` | Kellerausbau | 800 | 1600 | pro m² Kellerfläche (Richtwert) |
| `wanddurchbruch` | Wanddurchbruch | 1800 | 8500 | pro Öffnung (Richtwert) |
| `terrassenbau` | Terrassenbau | 220 | 520 | pro m² Terrasse (Richtwert) |
| `bad-sanieren` | Bad sanieren | 6500 | 20000 | pauschal je nach Umfang |
| `boden-verlegen` | Boden verlegen | 35 | 95 | pro m² |
| `fassadendaemmung` | Fassadendämmung | 120 | 220 | pro m² Fassade (Richtwert) |
| `heizung-defekt` | Heizung defekt | 120 | 450 | pauschal Einsatz (Richtwert) |
| `rohrbruch` | Rohrbruch | 150 | 600 | Einsatz pauschal (Richtwert) |
| `stromausfall` | Stromausfall | 95 | 320 | Einsatz (Richtwert) |
| `dachschaden` | Dachschaden | 180 | 420 | pro m² Dach (Richtwert) |
| `baumarbeiten` | Baumarbeiten | 180 | 1200 | pro Einsatz (Richtwert) |

## 2. Rechner: Basispreise (`data/preis/01-preis-basis-preise-objekt.csv`)
| Pfad (intern) | Min € | Max € | Einheit | Größe von | Größe bis | Hinweis |
|---------------|------:|------:|---------|------------|----------|---------|
| `bad.klein_standard` | 9000 | 12000 | pauschal | 0 | 5 |  |
| `bad.klein_komfort` | 12000 | 16000 | pauschal | 0 | 5 |  |
| `bad.klein_gehoben` | 16000 | 22000 | pauschal | 0 | 5 |  |
| `bad.mittel_standard` | 13000 | 17000 | pauschal | 5 | 8 |  |
| `bad.mittel_komfort` | 17000 | 22000 | pauschal | 5 | 8 |  |
| `bad.mittel_gehoben` | 22000 | 30000 | pauschal | 5 | 8 |  |
| `bad.gross_standard` | 17000 | 22000 | pauschal | 8 | 12 |  |
| `bad.gross_komfort` | 22000 | 28000 | pauschal | 8 | 12 |  |
| `bad.gross_gehoben` | 28000 | 40000 | pauschal | 8 | 999 |  |
| `heizung.klein` | 8500 | 12500 | pauschal | 0 | 100 |  |
| `heizung.mittel` | 12500 | 18000 | pauschal | 100 | 200 |  |
| `heizung.gross` | 18000 | 26000 | pauschal | 200 | 999 |  |
| `heizung.wp_klein` | 28500 | 38500 | pauschal |  |  |  |
| `heizung.wp_mittel` | 38500 | 52000 | pauschal |  |  |  |
| `heizung.wp_gross` | 52000 | 68000 | pauschal |  |  |  |
| `heizung.wartung` | 180 | 400 | pauschal |  |  |  |
| `heizung.heizkoerper` | 280 | 580 | pro Stück |  |  |  |
| `heizung_notfall.ausfall` | 250 | 600 | pauschal |  |  |  |
| `sanitaer.verstopfung` | 120 | 250 | pauschal |  |  |  |
| `sanitaer.leck` | 250 | 600 | pauschal |  |  |  |
| `sanitaer.wc` | 120 | 220 | pauschal |  |  |  |
| `sanitaer.armatur` | 120 | 200 | pauschal |  |  |  |
| `elektro.steckdose` | 90 | 140 | pro Punkt |  |  |  |
| `elektro.fi_schalter` | 180 | 260 | pauschal |  |  |  |
| `elektro.fehlersuche` | 160 | 300 | pauschal |  |  |  |
| `elektro.leitungen` | 85 | 130 | pro m |  |  |  |
| `elektro.sicherungskasten` | 900 | 2200 | pauschal |  |  |  |
| `elektro.echeck` | 150 | 350 | pauschal |  |  |  |
| `maler.waende` | 24 | 34 | pro m² Wandfläche |  |  |  |
| `maler.waende_decke` | 28 | 40 | pro m² Wandfläche |  |  |  |
| `maler.komplett` | 32 | 46 | pro m² Wandfläche |  |  |  |
| `maler.tapezieren` | 18 | 32 | pro m² |  |  |  |
| `boden.laminat` | 32 | 48 | pro m² |  |  |  |
| `boden.parkett` | 75 | 120 | pro m² |  |  |  |
| `boden.parkett_schleifen` | 22 | 42 | pro m² |  |  |  |
| `boden.vinyl` | 35 | 52 | pro m² |  |  |  |
| `boden.fliesen` | 72 | 102 | pro m² |  |  |  |
| `boden.balkon_belag` | 72 | 102 | pro m² |  |  |  |
| `boden.teppich` | 22 | 35 | pro m² |  |  |  |
| `dach.ziegel_wenige` | 300 | 800 | pauschal |  |  |  |
| `dach.ziegel_bereich` | 800 | 2500 | pauschal |  |  |  |
| `dach.daemmung` | 120 | 180 | pro m² |  |  |  |
| `dach.komplett` | 180 | 260 | pro m² |  |  |  |
| `dach.dachfenster` | 900 | 1800 | pro Stück |  |  |  |
| `dach.regenrinne` | 38 | 62 | pro lfd. m |  |  |  |
| `fassade.anstrich` | 45 | 65 | pro m² |  |  |  |
| `fassade.daemmung` | 160 | 240 | pro m² |  |  |  |
| `fassade.bekleidung` | 120 | 180 | pro m² |  |  |  |
| `fenster.standard` | 650 | 950 | pro Stück |  |  |  |
| `fenster.premium` | 950 | 1450 | pro Stück |  |  |  |
| `fenster.tuer` | 1800 | 3200 | pro Stück |  |  |  |
| `fenster.reparatur` | 150 | 350 | pauschal |  |  |  |
| `garten.pflege_klein` | 55 | 90 | pro Besuch | 0 | 100 |  |
| `garten.pflege_mittel` | 80 | 140 | pro Besuch | 100 | 300 |  |
| `garten.pflege_gross` | 130 | 220 | pro Besuch | 300 | 999 |  |
| `garten.hecke` | 8 | 18 | pro m² |  |  |  |
| `garten.pflaster` | 90 | 130 | pro m² |  |  |  |
| `garten.gestaltung` | 45 | 85 | pro m² |  |  |  |
| `garten.baum_klein` | 150 | 350 | pro Stück |  |  |  |
| `garten.baum_gross` | 400 | 900 | pro Stück |  |  |  |
| `garten.obstbaum` | 150 | 450 | pro Stück |  |  |  |
| `garten.rasen` | 1.5 | 2.5 | pro m² |  |  |  |
| `trockenbau.wand` | 48 | 72 | pro m² |  |  |  |
| `trockenbau.decke` | 42 | 65 | pro m² |  |  |  |
| `reinigung.regelmaessig` | 1.3 | 2 | pro m²/Monat |  |  |  |
| `reinigung.einmalig` | 2.8 | 4.2 | pro m² |  |  |  |
| `winterdienst.saison` | 620 | 920 | pro Saison |  |  |  |
| `winterdienst.einmalig` | 180 | 320 | pauschal |  |  |  |
| `hausmeister.monatlich` | 350 | 650 | pro Monat |  |  |  |
| `hausmeister.nach_bedarf` | 330 | 630 | pro Monat |  |  |  |
| `hausmeister.jahresvertrag` | 4200 | 7200 | pro Jahr |  |  |  |
| `terrasse.holz` | 180 | 320 | pro m² |  |  |  |
| `terrasse.stein` | 120 | 220 | pro m² |  |  |  |
| `terrasse.beton` | 80 | 140 | pro m² |  |  |  |
| `projekt.baum_betreuung` | 200 | 800 | pro Baum |  |  |  |
| `projekt.obstbaum_betreuung` | 150 | 450 | pro Baum |  |  |  |
| `projekt.ausbau_dg` | 850 | 1200 | pro m² |  |  |  |
| `projekt.ausbau_keller` | 950 | 1400 | pro m² |  |  |  |
| `projekt.durchbruch_tragend` | 4500 | 4500 | pauschal |  |  |  |
| `projekt.durchbruch_nicht_tragend` | 1800 | 1800 | pauschal |  |  |  |
| `projekt.terrasse` | 280 | 450 | pro m² |  |  |  |
| `projekt.garten_auffrischung` | 120 | 180 | pro m² |  |  |  |
| `projekt.garten_neuanlage` | 250 | 450 | pro m² |  |  |  |
| `abriss.innen` | 25 | 45 | pro m² |  |  |  |
| `abriss.komplett` | 8000 | 18000 | pauschal |  |  |  |

## 3. Rechner: Referenz-Fixtures (`data/preis/02-preis-rechner-fixtures.csv`)
Erwartete Ausgaben (Beispiel PLZ 80331, sofern in der Zeile nicht anders). Spalten gekürzt.

| ID | Beschreibung | Min € | Max € | Mitte € | Modus |
|----|--------------|------:|------:|--------:|-------|
| `maler_waende_35qm` | Erneuern Maler was=waende 35 m² | 1000 | 1400 | 1167 | preisrahmen |
| `maler_waende_90qm` | Erneuern Maler was=waende 90 m² | 2500 | 3500 | 3002 | preisrahmen |
| `maler_waende_decke_35qm` | Erneuern Maler was=waende_decke 35 m² | 1100 | 1600 | 1369 | preisrahmen |
| `maler_waende_decke_90qm` | Erneuern Maler was=waende_decke 90 m² | 2900 | 4100 | 3519 | preisrahmen |
| `maler_komplett_35qm` | Erneuern Maler was=komplett 35 m² | 1300 | 1900 | 1570 | preisrahmen |
| `maler_komplett_90qm` | Erneuern Maler was=komplett 90 m² | 3300 | 4800 | 4037 | preisrahmen |
| `maler_tapezieren_35qm` | Erneuern Maler was=tapezieren 35 m² | 700 | 1300 | 1006 | preisrahmen |
| `maler_tapezieren_90qm` | Erneuern Maler was=tapezieren 90 m² | 1900 | 3300 | 2588 | preisrahmen |
| `boden_laminat_40qm` | Erneuern Boden laminat 40 m² | 1450 | 2200 | 1840 | preisrahmen |
| `boden_parkett_40qm` | Erneuern Boden parkett 40 m² | 3450 | 5500 | 4485 | preisrahmen |
| `boden_parkett_schleifen_40qm` | Erneuern Boden parkett_schleifen 40 m² | 1000 | 1950 | 1472 | preisrahmen |
| `boden_vinyl_40qm` | Erneuern Boden vinyl 40 m² | 1600 | 2400 | 2001 | preisrahmen |
| `boden_fliesen_40qm` | Erneuern Boden fliesen 40 m² | 3300 | 4700 | 4002 | preisrahmen |
| `boden_balkon_belag_40qm` | Erneuern Boden balkon_belag 40 m² | 3300 | 4700 | 4002 | preisrahmen |
| `boden_teppich_40qm` | Erneuern Boden teppich 40 m² | 1000 | 1600 | 1311 | preisrahmen |
| `boden_laminat_mit_abriss_40qm` | Erneuern Laminat mit Verlegeart (Abriss-Zuschlag) | 2150 | 2900 | 2530 | preisrahmen |
| `fassade_anstrich_100qm` | Erneuern Fassade art=anstrich 100 m² | 5200 | 7500 | 6325 | preisrahmen |
| `fassade_daemmung_100qm` | Erneuern Fassade art=daemmung 100 m² | 0 | 0 | 23000 | zu_komplex |
| `fassade_bekleidung_100qm` | Erneuern Fassade art=bekleidung 100 m² | 0 | 0 | 17250 | zu_komplex |
| `dach_ziegel_wenige` | Erneuern Dach vorhaben=ziegel_wenige | 300 | 900 | 633 | preisrahmen |
| `dach_ziegel_bereich` | Erneuern Dach vorhaben=ziegel_bereich | 900 | 2900 | 1898 | preisrahmen |
| `dach_dachfenster` | Erneuern Dach vorhaben=dachfenster | 1000 | 2100 | 1553 | preisrahmen |
| `dach_regenrinne` | Erneuern Dach vorhaben=regenrinne | 500 | 900 | 690 | preisrahmen |
| `dach_daemmung` | Erneuern Dach vorhaben=daemmung | 11000 | 16600 | 13800 | preisrahmen_warnung |
| `dach_komplett` | Erneuern Dach vorhaben=komplett | 0 | 0 | 20240 | zu_komplex |
| `dach_undichtigkeit` | Erneuern Dach vorhaben=undichtigkeit | 900 | 2900 | 1898 | preisrahmen |
| `fenster_standard_2stueck` | Erneuern Fenster standard ×2 | 1500 | 2200 | 1840 | preisrahmen |
| `fenster_premium_2stueck` | Erneuern Fenster premium ×2 | 2200 | 3300 | 2760 | preisrahmen |
| `fenster_tuer_2stueck` | Erneuern Fenster tuer ×2 | 4100 | 7400 | 5750 | preisrahmen |
| `fenster_balkon_tuer_2stueck` | Erneuern Fenster balkon_tuer ×2 | 2200 | 3300 | 2760 | preisrahmen |
| `heizung_gas_brennwert_50qm` | Heizung tauschen → Gas-Brennwert, 50 m² | 9800 | 14400 | 12075 | preisrahmen_warnung |
| `heizung_gas_brennwert_150qm` | Heizung tauschen → Gas-Brennwert, 150 m² | 14400 | 20700 | 17538 | preisrahmen_warnung |
| `heizung_wp_neu_50qm` | Heizung Erneuern → WP/Hybrid Ziel, 50 m² | 32800 | 44300 | 38525 | preisrahmen_warnung |
| `heizung_wp_neu_120qm` | Heizung Erneuern → WP/Hybrid Ziel, 120 m² | 44300 | 59800 | 52038 | preisrahmen_warnung |
| `heizung_wp_neu_220qm` | Heizung Erneuern → WP/Hybrid Ziel, 220 m² | 59800 | 78200 | 69000 | preisrahmen_warnung |
| `heizung_wartung` | Heizung Wartung | 200 | 500 | 333 | preisrahmen |
| `heizung_heizkoerper_x3` | Heizkörper tauschen ×3 | 1000 | 2000 | 1484 | preisrahmen |
| `bad_komplett_klein_standard` | Bad Komplett-Sanierung ca. 4 m², standard | 10350 | 13800 | 12075 | preisrahmen_warnung |
| `bad_komplett_mittel_standard` | Bad Komplett-Sanierung ca. 6 m², standard | 0 | 0 | 17250 | zu_komplex |
| `bad_komplett_gross_standard` | Bad Komplett-Sanierung ca. 10 m², standard | 0 | 0 | 24265 | zu_komplex |
| `bad_komplett_klein_komfort` | Bad Komplett-Sanierung ca. 4 m², komfort | 0 | 0 | 16100 | zu_komplex |
| `bad_komplett_mittel_komfort` | Bad Komplett-Sanierung ca. 6 m², komfort | 0 | 0 | 22425 | zu_komplex |
| `bad_komplett_gross_komfort` | Bad Komplett-Sanierung ca. 10 m², komfort | 0 | 0 | 31510 | zu_komplex |
| `bad_komplett_klein_gehoben` | Bad Komplett-Sanierung ca. 4 m², gehoben | 0 | 0 | 21850 | zu_komplex |
| `bad_komplett_mittel_gehoben` | Bad Komplett-Sanierung ca. 6 m², gehoben | 0 | 0 | 29900 | zu_komplex |
| `bad_komplett_gross_gehoben` | Bad Komplett-Sanierung ca. 10 m², gehoben | 0 | 0 | 43240 | zu_komplex |
| `bad_teil_fliesen_8qm` | Bad Teilsanierung fliesen 8 m² | 650 | 950 | 800 | preisrahmen |
| `bad_teil_leitungen_8qm` | Bad Teilsanierung leitungen 8 m² | 800 | 1200 | 989 | preisrahmen |
| `bad_teil_wanne_dusche_8qm` | Bad Teilsanierung wanne_dusche 8 m² | 3100 | 6100 | 4600 | preisrahmen |
| `bad_teil_objekte_liste` | Bad Teilsanierung Objekte (Waschbecken+WC) | 1250 | 1950 | 1610 | preisrahmen |
| `elektro_erneuern_sicherungskasten` | Elektro Erneuern problem=sicherungskasten | 1000 | 2500 | 1783 | preisrahmen |
| `elektro_erneuern_leitungen` | Elektro Erneuern problem=leitungen | 150 | 300 | 124 | preisrahmen |
| `elektro_erneuern_neue_leitungen` | Elektro Erneuern problem=neue_leitungen | 150 | 300 | 124 | preisrahmen |
| `elektro_erneuern_echeck` | Elektro Erneuern problem=echeck | 200 | 400 | 288 | preisrahmen |
| `elektro_erneuern_sonstiges` | Elektro Erneuern problem=sonstiges | 200 | 300 | 265 | preisrahmen |
| `garten_pflege_erneuern_40qm` | Gartenpflege Erneuern 40 m² | 150 | 300 | 73 | preisrahmen |
| `garten_pflege_erneuern_120qm` | Gartenpflege Erneuern 120 m² | 150 | 300 | 110 | preisrahmen |
| `garten_pflege_erneuern_400qm` | Gartenpflege Erneuern 400 m² | 150 | 300 | 175 | preisrahmen |
| `garten_hecke_60qm` | Garten hecke 60 m² | 500 | 1100 | 780 | preisrahmen |
| `garten_pflaster_60qm` | Garten pflaster 60 m² | 5400 | 7800 | 6600 | preisrahmen |
| `garten_baum_klein` | Baum klein | 200 | 400 | 250 | preisrahmen |
| `garten_baum_gross` | Baum groß | 400 | 900 | 650 | preisrahmen |
| `projekt_garten_auffrischung_zaunja_zugeinfach_80qm` | Gartengestaltung auffrischung, Zaun ja, Zugang einfach, 80 m² | 15100 | 20600 | 17825 | preisrahmen_warnung |
| `projekt_garten_auffrischung_zaunja_zugschwer_80qm` | Gartengestaltung auffrischung, Zaun ja, Zugang schwer, 80 m² | 16700 | 23100 | 19895 | preisrahmen_warnung |
| `projekt_garten_auffrischung_zaunnein_zugeinfach_80qm` | Gartengestaltung auffrischung, Zaun nein, Zugang einfach, 80 m² | 11000 | 16600 | 13800 | preisrahmen_warnung |
| `projekt_garten_auffrischung_zaunnein_zugschwer_80qm` | Gartengestaltung auffrischung, Zaun nein, Zugang schwer, 80 m² | 12700 | 19000 | 15870 | preisrahmen_warnung |
| `projekt_garten_neuanlage_zaunja_zugeinfach_80qm` | Gartengestaltung neuanlage, Zaun ja, Zugang einfach, 80 m² | 27000 | 45400 | 36225 | preisrahmen_warnung |
| `projekt_garten_neuanlage_zaunja_zugschwer_80qm` | Gartengestaltung neuanlage, Zaun ja, Zugang schwer, 80 m² | 30500 | 51600 | 41055 | preisrahmen_warnung |
| `projekt_garten_neuanlage_zaunnein_zugeinfach_80qm` | Gartengestaltung neuanlage, Zaun nein, Zugang einfach, 80 m² | 23000 | 41400 | 32200 | preisrahmen_warnung |
| `projekt_garten_neuanlage_zaunnein_zugschwer_80qm` | Gartengestaltung neuanlage, Zaun nein, Zugang schwer, 80 m² | 26400 | 47600 | 37030 | preisrahmen_warnung |
| `projekt_ausbau_dg_45qm` | Dachausbau DG 45 m² (Rohbau ja, Höhe mittel) | 44000 | 62100 | 53044 | preisrahmen_warnung |
| `projekt_ausbau_keller_30qm` | Kellerausbau 30 m² | 32800 | 48300 | 40538 | preisrahmen_warnung |
| `projekt_durchbruch_tragend_x2` | Wanddurchbruch tragend ×2 | 10400 | 10400 | 10350 | preisrahmen_warnung |
| `projekt_durchbruch_nicht_tragend` | Wanddurchbruch nicht tragend | 2100 | 2100 | 2070 | preisrahmen |
| `projekt_garten_terrasse_holz_wpc_25qm` | Gartengestaltung Terrasse Holz/WPC 25 m² | 2300 | 4300 | 3306 | preisrahmen |
| `projekt_garten_terrasse_naturstein_unterbau_zug` | Gartengestaltung Terrasse Naturstein, Zaun, schwerer Zugang | 7200 | 9300 | 8257 | preisrahmen_warnung |
| `betreuung_reinigung_regelmaessig_200qm` | Betreuung Reinigung regelmäßig 200 m² | 250 | 400 | 2 | preisrahmen |
| `betreuung_reinigung_einmalig_50qm` | Betreuung Reinigung einmalig 50 m² | 300 | 500 | 385 | preisrahmen |
| `betreuung_reinigung_einmalig_80qm` | Betreuung Reinigung einmalig 80 m² | 400 | 600 | 483 | preisrahmen |
| `betreuung_reinigung_einmalig_120qm` | Betreuung Reinigung einmalig 120 m² | 500 | 800 | 621 | preisrahmen |
| `betreuung_winter_saison_600qm` | Betreuung Winterdienst Saison 600 m² | 0 | 0 | 24667 | zu_komplex |
| `betreuung_winter_einmalig` | Betreuung Winterdienst einmalig | 200 | 400 | 288 | preisrahmen |
| `betreuung_hausmeister_monatlich_klein` | Hausmeister monatlich kleine Objektgröße | 200 | 200 | 173 | preisrahmen |
| `betreuung_hausmeister_monatlich_gross` | Hausmeister monatlich große Objektgröße | 500 | 500 | 518 | preisrahmen |
| `betreuung_hausmeister_nach_bedarf` | Hausmeister nach Bedarf | 400 | 700 | 552 | preisrahmen |
| `betreuung_hausmeister_jahresvertrag` | Hausmeister Jahresvertrag | 4800 | 8300 | 6555 | preisrahmen |
| `betreuung_baum_x3` | Betreuung Baumarbeiten 3 Bäume | 200 | 400 | 288 | preisrahmen |
| `betreuung_garten_pflege_150qm` | Betreuung Gartenpflege 150 m² | 150 | 300 | 127 | preisrahmen |
| `kaputt_sanitaer_verstopfung` | Kaputt Sanitär Verstopfung | 300 | 600 | 437 | preisrahmen |
| `kaputt_sanitaer_leck_wand` | Kaputt Sanitär Leck Wand | 300 | 600 | 437 | preisrahmen |
| `kaputt_elektro_fi` | Kaputt Elektro Sicherung | 300 | 500 | 420 | preisrahmen |
| `kaputt_elektro_steckdose` | Kaputt Steckdose | 300 | 500 | 420 | preisrahmen |
| `kaputt_heizung_notfall` | Kaputt Heizung (Notfall-Pfad) | 500 | 800 | 673 | notfall_akut |
| `kaputt_fenster_reparatur` | Kaputt Fenster Reparatur | 200 | 400 | 288 | preisrahmen |
| `kaputt_dach_ziegel_wenige` | Kaputt Dach wenige Ziegel | 400 | 900 | 632 | preisrahmen |
| `plz_sample_heizung_150qm_Muenchen_1.0` | PLZ-Referenz Heizung 150 m² 80331 | 14400 | 20700 | 17538 | preisrahmen_warnung |
| `plz_sample_heizung_150qm_Umland_nah_1.03` | PLZ-Referenz Heizung 150 m² 85221 | 14800 | 21300 | 18064 | preisrahmen_warnung |
| `plz_sample_heizung_150qm_Umland_weiter_1.06` | PLZ-Referenz Heizung 150 m² 86356 | 15200 | 21900 | 18590 | preisrahmen_warnung |
