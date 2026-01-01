# MiniGame - Stadt Aufbauspiel 🏰

Ein lauffähiger Mini-Prototyp für ein Click-&-Point-Browsergame. Ermöglicht den Aufbau und Ausbau einer Stadt, das zeitbasierte Trainieren von Truppen sowie die Nutzung vorbereiteter Heldenboni.

## Features

- **Stadt Aufbau**: Bauen und verbessern Sie verschiedene Gebäude (Rathaus, Kaserne, Bauernhof, Mine, Sägewerk)
- **Ressourcen-Management**: Verwalten Sie Holz, Stein und Nahrung
- **Truppen-Training**: Bilden Sie zeitbasiert Krieger, Bogenschützen und Kavallerie aus
- **Helden-Boni**: Aktivieren Sie Helden für temporäre Boni (Baumeister, Rekrutierer, Ökonom)
- **Automatische Ressourcenproduktion**: Gebäude produzieren kontinuierlich Ressourcen
- **JSON-basierter Spielstand**: Alle Fortschritte werden gespeichert
- **Server-seitige Validation**: Alle Spielaktionen werden serverseitig validiert

## Technologie

- **Client**: HTML, CSS, JavaScript (Vanilla JS)
- **Server**: Node.js mit Express
- **Datenspeicherung**: JSON-Dateien
- **Architektur**: REST API mit klarer Trennung von Client und Server

## Installation

1. Repository klonen:
```bash
git clone https://github.com/hammermaps/MiniGame.git
cd MiniGame
```

2. Abhängigkeiten installieren:
```bash
npm install
```

3. Server starten:
```bash
npm start
```

4. Browser öffnen und navigieren zu:
```
http://localhost:3000
```

## Spielanleitung

### Ressourcen
- **Holz 🪵**: Wird für fast alle Gebäude und Truppen benötigt
- **Stein 🪨**: Wichtig für fortgeschrittene Gebäude
- **Nahrung 🌾**: Notwendig für die Truppenausbildung

### Gebäude
- **Rathaus**: Zentrales Verwaltungsgebäude
- **Kaserne**: Erforderlich für die Truppenausbildung
- **Bauernhof**: Produziert Nahrung (10/Level/Sekunde)
- **Mine**: Produziert Stein (5/Level/Sekunde)
- **Sägewerk**: Produziert Holz (8/Level/Sekunde)

Gebäude können mehrfach ausgebaut werden. Die Kosten steigen mit jedem Level um 50%.

### Truppen
- **Krieger**: Grundeinheit (Kosten: 20 Nahrung, 10 Holz, 30s Training)
- **Bogenschütze**: Fernkampfeinheit (Kosten: 15 Nahrung, 25 Holz, 45s Training)
- **Kavallerie**: Elite-Einheit (Kosten: 40 Nahrung, 20 Holz, 10 Stein, 60s Training)

### Helden
- **Baumeister**: Erhöht Baugeschwindigkeit um 50% (5 Minuten)
- **Rekrutierer**: Erhöht Trainingsgeschwindigkeit um 50% (5 Minuten)
- **Ökonom**: Erhöht Ressourcenproduktion um 50% (5 Minuten)

Es kann immer nur ein Held gleichzeitig aktiv sein.

## API Endpunkte

### GET /api/gamestate
Lädt den aktuellen Spielstand mit allen Konfigurationen.

**Response:**
```json
{
  "state": {
    "resources": { "wood": 500, "stone": 500, "food": 500 },
    "buildings": [],
    "troops": { "warrior": 0, "archer": 0, "cavalry": 0 },
    "buildQueue": [],
    "trainQueue": [],
    "activeHero": null,
    "heroActivatedAt": null,
    "lastUpdate": 1234567890
  },
  "config": { ... }
}
```

### POST /api/build
Startet den Bau oder Ausbau eines Gebäudes.

**Request Body:**
```json
{
  "buildingType": "farm"
}
```

### POST /api/train
Startet das Training von Truppen.

**Request Body:**
```json
{
  "troopType": "warrior",
  "amount": 5
}
```

### POST /api/hero
Aktiviert einen Helden-Bonus.

**Request Body:**
```json
{
  "heroType": "builder"
}
```

### POST /api/save
Speichert den aktuellen Spielstand manuell.

### POST /api/reset
Setzt das Spiel zurück (nur für Tests).

## Erweiterungsmöglichkeiten

Das Spiel ist klar strukturiert für zukünftige Erweiterungen:

- **Neue Gebäude**: Einfach im `BUILDINGS` Objekt hinzufügen
- **Neue Truppen**: Im `TROOPS` Objekt definieren
- **Neue Helden**: Im `HEROES` Objekt hinzufügen
- **Kampfsystem**: Neue API-Endpunkte für Kämpfe
- **Mehrspieler**: Datenbankintegration für mehrere Spieler
- **Quest-System**: Neue Datenstrukturen für Aufgaben
- **Weitere Ressourcen**: Erweiterung des Ressourcensystems

## Lizenz

MIT License - siehe LICENSE Datei für Details.