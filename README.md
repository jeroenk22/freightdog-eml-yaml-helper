# Freightdog – EML → YAML Helper

Deze tool is een eenvoudige webbased helper om **YAML-bestanden te genereren** die Freightdog kan gebruiken als **begeleiding bij testmails (EML-bestanden)**.

Het doel is om bij een voorbeeldmail (`.eml`) een bijpassend YAML-bestand aan te leveren met de **verwachte gestructureerde data**, zodat Freightdog de analyse correct kan testen en valideren.

---

## Wat doet deze tool?

De tool combineert:

- CSV-data afkomstig uit **MendriX**
- Een voorbeeldmail (`.eml`)
- Handmatige invoer en automatische logica

tot één correct opgebouwd **YAML-bestand** dat samen met het EML-bestand aan Freightdog kan worden aangeleverd.

---

## Benodigde data uit MendriX

De tool verwacht **CSV-bestanden** die afkomstig zijn uit de MendriX database.  
Exporteer deze als **comma-separated CSV met headers**.

Hieronder staan de SQL-queries die gebruikt kunnen worden om de juiste data op te halen.

---

### 1. Verpakkingen (`packages.csv`)

```
SELECT
  PackageNo,
  Name_NL
FROM Packages
```

---

### 2. Relaties / Klanten (`clients.csv`)

```
SELECT
  ClientNo,
  ComName,
  ComPerson,
  ComStreet,
  ComZip,
  ComCity,
  ComCountry,
  Number,
  TaskName,
  TaskPerson,
  TaskLocation,
  TaskStreetOnly,
  TaskStreetNumber,
  TaskZip,
  TaskCity,
  TaskCountry
FROM clients
WHERE Deleted <> 1
```

---

### 3. Producten (`products.csv`)

```
SELECT
  ProductId,
  ProductCode,
  ProductDescription,
  TaskMomentRTABring,
  TaskMomentRTDBring,
  TaskMomentRTAGet,
  TaskMomentRTDGet
FROM Products
WHERE Deleted <> 1
```

## Werking van de tool

### Stap 1 – CSV-bestanden inladen

Laad de CSV-bestanden in:

- `clients.csv`
- `products.csv`
- `packages.csv`

De data wordt lokaal in de browser gebruikt en niet opgeslagen of verzonden.

---

### Stap 2 – EML-bestand inlezen

Upload een `.eml` bestand.

De tool:

- Gebruikt de bestandsnaam van de `.eml`.
- Gebruikt dit om als bestandsnaam voor de te genereren `.yaml`.

---

### Stap 3 – Gegevens invullen en controleren

In de interface kun je:

- Een relatie selecteren
- Een product selecteren
- Colliregels toevoegen (aantal, verpakking, gewicht, volume, afmetingen)
- Laad- en losadressen aanpassen
- Gewenste tijdvensters instellen
- Instructies toevoegen

Totalen voor colli, gewicht en volume worden **realtime berekend**.

---

### Stap 4 – YAML genereren

De YAML wordt live opgebouwd en weergegeven in de preview.

Je kunt:

- De YAML kopiëren
- Of downloaden als `.yaml` bestand

---

## Aanleveren aan Freightdog

Lever aan Freightdog aan:

- Het EML-bestand (`.eml`)
- Het bijbehorende YAML-bestand (`.yaml`)

Samen vormen deze bestanden één complete testcase voor Freightdog.

---

_Gemaakt voor Freightdog in combinatie met MendriX_
