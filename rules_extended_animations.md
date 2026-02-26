# ERWEITERTE ANIMATION-RICHTLINIEN für Dave Deck

Diese Richtlinien ergänzen die rules.md mit detaillierten Vorgaben für Animationen und visuelles Feedback.

## **Kern-Prinzip: "Alles muss sichtbar sein"**
- **NIEMALS versteckte Aktionen**: Jede Spielmechanik muss visuell im Hauptspielbereich erkennbar sein
- **Sofortige Rückmeldung**: Keine Verzögerung zwischen Aktion und visueller Bestätigung
- **Persistente Indikatoren**: Aktive Effekte (Schild, Angriff, Limit-Änderung) bleiben sichtbar bis sie aufgehoben werden

## **Spezifische Chip-Animation Anforderungen**

### **Limit-Änderungen (17/24/27):**
- Limit-Zahl MUSS pulsieren und Farbe ändern
- Funkeln-Partikel um die neue Zahl
- Alte vs. neue Zahl kurzzeitig beide sichtbar
- Animation-Dauer: ~800ms

### **Schutz-Effekte (Schild/Schild+):**
- Grüner Schutz-Ring um Herzen
- Level-Indikator zeigt Schutz-Stärke (1, 2, 3+)
- Aktivierungs-Animation mit expandierenden Wellen
- Dauerhaft sichtbar bis Schutz verbraucht wird

### **Angriffs-Effekte (+1/+2):**
- Rote bedrohliche Aura um Gegnerbereich
- Blitz-Animation bei Aktivierung
- Persistent pulsierend bis nächste Niederlage
- Stärke-Indikator zeigt zusätzlichen Schaden

### **Karten-Bewegungen:**
- **Ziehen**: Karte fliegt vom Deck zur Hand (1200ms)
- **Perfect Draw**: Goldene Funken um fliegende Karte
- **Tauschen**: Kreuzende Flugbahnen zwischen Spielern (1500ms)
- **Zurücklegen**: Karte fliegt zurück zum Deck mit Rotation (1000ms)

## **Interaktions-Regeln**
- **Animation-Blocking**: ALLE Interaktionen während Animationen deaktiviert
- **Visual Feedback**: Deaktivierte Buttons/Chips visuell erkennbar (Opazität 0.6)
- **Keine Unterbrechungen**: Animationen laufen immer vollständig ab
- **Queue-System**: Mehrere Chip-Einsätze werden nacheinander abgespielt

## **Dialog-Minimierung**
- **Dialoge NUR für**: Spiel beenden, Regelwerk, Einstellungen
- **KEINE Dialoge für**: Chip-Erklärungen (Tooltips), Status-Updates, Rundenenden
- **In-Game Feedback**: Alle Spiel-Informationen direkt im Spielbereich
- **Overlay-Alternative**: Statt Dialoge → temporäre Overlays mit Auto-Dismiss

## **Accessibility Standards**
- `prefers-reduced-motion` unterstützen
- Farbkombinationen auch für Rot-Grün-Blindheit funktional
- Timing: Min. 600ms (erkennbar), Max. 2000ms (nicht störend)
- Alternative Text-Indikatoren für reine Farb-Codes

## **Performance-Garantien**
- 60fps auf modernen Geräten IMMER
- 30fps auf Low-End Devices mindestens
- GPU-Rendering für alle Animationen (transform/opacity bevorzugt)
- Automatisches Fallback bei Performance-Problemen