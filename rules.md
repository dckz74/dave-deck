 # Black-Jack-basiertes Kartenspiel – Rules & Scope

 > **Hinweis:** Diese Datei definiert den *Spiel- und Projekt-Scope*.  
 > Sie wird bei wichtigen Änderungen und neuen Features vom Projekt aktualisiert. Einheitliche Bezeichnung für Power-Ups/Token: **Chips**.

 ---

 ## 1. Spielüberblick

 - **Arbeitstitel des Spiels**: Dave Deck
 - **Kurze Beschreibung (1–3 Sätze)**: Es ist quasi Black Jack, aber mit einem besonderen Twist. Das gesamte Deck ist limitiert von 1 bis 11, wobei es jede Karte nur ein einziges Mal gibt, von denen beide Spieler immer abwechselnd ziehen. Zusätzlich hat man beim Ziehen einer Karte eine 50 % Chance, einen **Chip** zu bekommen, der in der Runde einsetzbar ist.
- **Terminologie**: Im gesamten Projekt heißen die Power-Ups/Token einheitlich **Chips**. 
 - **Plattform(en)** PWA

 ---

 ## 2. Designziele & Nicht-Ziele

 - **Hauptziele**
   - schnelles, flüssiges Gameplay
   - modernes, happy, positves Design
   - Singleplayer mit einem KI-Gegner
   - Coole, schöne, hochwertige und smoothe Animationen
 - **Nicht-Ziele / Out of Scope** 

 ---

 ## 3. Karten-Setup

 - **Kartentyp**
  - Alle Karten von 1 bis 11
  - Keine Bildkarten
  - Kein Ass
 - **Deck**
  - Es gibt alle Karten nur ein einziges Mal. Wenn ich als Spieler die 1 gezogen habe, dann kann der Gegner nicht mehr die 1 ziehen!
 - **Kartenwerte**
   - Zahlenkarten: der jeweilige Wert, der drauf steht

 ---

 ## 4. Grundregeln (Basis-Blackjack)

 - **Ziel des Spiels**: Jeder Spieler hat 5 Lebenspunkte. Wenn man bei 0 angekommen ist, hat man verloren und der andere Spieler dementsprechend gewonnen.
 - **Start-Setup**
   - Beide Spieler erhalten am Anfang **eine Karte aus demselben 1–11-Deck** (nur für den jeweiligen Spieler sichtbar). **9 Karten** bleiben im Deck für Hit/Skip.
   - Alle weiteren gezogenen Karten sind für beide Spieler sichtbar.
   - Der Spieler fängt immer an, der KI-Gegner ist immer als Zweites dran.
 - **Mögliche Moves des Spielers**
   - **Chips einsetzen**: Beliebig viele Chips nutzen (beendet den Zug nicht). Erst danach:
   - Hit (Karte ziehen): Der Spieler zieht eine Karte und **beendet damit seinen Zug**
   - Skip (Zug überspringen): Es wird keine Karte gezogen, **der Zug ist beendet**, der Gegner ist dran
   - Hit und Skip beenden den Zug; vorher können beliebig viele Chips gespielt werden (z. B. „Zieh 3“ und danach noch Hit). 
 - **Regeln für Rundenende**
   - Wenn beide Spieler nacheinander "Skip" gemacht haben, wird die Runde beendet und alle Karten aufgedeckt. So wird der Sieger der Runde entschieden
 - **Regeln für Lebensabzug**
   - Wenn beide unter oder auf dem aktuellen Limit sind: Der Spieler, der näher am Limit dran ist, gewinnt. Der andere verliert Leben (siehe unten).
   - Wenn ein Spieler über dem Limit ist: Er hat automatisch verloren und verliert Leben (siehe unten).
   - Wenn beide über dem Limit sind oder gleiche Zahl haben: Unentschieden, niemand verliert Leben.
   - **Standard-Lebenabzug**: 1 Leben pro Niederlage. Wird durch Chips „Einsatz erhöhen“ und „Schild“/„Schild+“ modifiziert (siehe Abschnitt 5).


 ---

 ## 5. Abweichungen vom klassischen Blackjack

 - **Spezielle Hausregeln**
  - Jede Karte nur einmalig vorhanden von 1 bis 11
 - **Hinzugefügte Mechaniken (Chips)**
  - Beim Ziehen einer Karte: **50 % Chance**, einen **Chip** zu bekommen.
  - **Chips werden in die nächste Runde mitgenommen** (persistiert) – sie verfallen nicht am Rundenende.
  - **Chip wird immer verbraucht**, auch wenn die Aktion nichts bewirkt (z. B. „Zieh 5“, Karte 5 nicht im Deck → Chip ist weg, sonst passiert nichts).
  - **Nach Chip-Einsatz wechselt der Zug zum anderen Spieler.** Der andere darf dann wieder Hit oder Skip machen – auch wenn er in dieser Runde zuvor schon Skip gemacht hatte („Doppel-Skip = Runde Ende“ wird durch Chip-Nutzung unterbrochen).
  - Chips können **vor** Hit/Skip beliebig oft pro Zug genutzt werden. Nach Nutzung eines Chips ist der **Gegner** dran; danach wieder du usw.
  - **Chip-Arten:**
    - **Zieh 2/3/4/5/6/7**: Zieht sofort diese Karte aus dem Deck. Wenn nicht mehr im Deck → passiert nichts.
    - **Limit verschieben (17/24/27)**: Setzt das Limit für **diese Runde** auf 17, 24 oder 27 – gilt **für beide Spieler**. Standard ist sonst immer 21.
    - **Karten tauschen**: Tauscht meine zuletzt gezogene Karte mit der zuletzt gezogenen Karte des Gegners.
    - **Einsatz erhöhen (+1/+2)**: Bei der **nächsten** Niederlage (eines beliebigen Spielers) verliert der Verlierer **2** Leben (+1) bzw. **3** Leben (+2) statt 1. Nur für die nächste Niederlage, danach wieder Standard. **Stapelbar** (z. B. 2× +2 → 5 Leben Abzug).
    - **Meine Karte zurücklegen**: Legt **meine** zuletzt gezogene Karte zurück ins Deck und mischt den Rest. (Eigener Chip.)
    - **Gegner-Karte zurücklegen**: Legt die **zuletzt gezogene Karte des Gegners** zurück ins Deck und mischt. (Eigener Chip.)
    - **Perfect Draw**: Zieht die für mich beste Karte, wenn noch verfügbar (z. B. ich habe 13, Limit 21 → beste Karte 8). Verhält sich wie jeder andere Chip – danach noch Hit oder Skip möglich.
    - **Schild**: Reduziert das Leben, das **ich** bei **meiner nächsten** Niederlage verlieren würde, um 1. Einmalig, **stapelbar**.
    - **Schild+**: Reduziert das Leben, das **ich** bei **meiner nächsten** Niederlage verlieren würde, um 2. Einmalig, **stapelbar**.
  - Nach Nutzung eines Chips: **audivisuell** klar machen, was passiert ist.
 - **Zusatz**
  - Beim Hover auf einen Chip: **Tooltip** mit Erklärung.
  - Beide sehen immer, **welche Chips der Gegner** hat.
 ---

 ## 6. Spielmodi

 - **Singleplayer gegen Dealer**:
  - Man spielt immer nur gegen 1 KI-Gegner
 - **Schwierigkeitsgrade**
  - Erstmal nur ein Schwierigkeitsgrad. Der KI-Gegner sollte immer schlaue Optionen treffen.
  - Der KI-Gegner sollte natürlich immer versuchen, möglichst nah an 21 zu kommen.
  - Wenn der KI-Gegner merkt, dass es schwierig wird, soll er auch **Chips** einsetzen (gewinnen oder Spieler zum Verlieren bringen).
  - Der KI-Gegner soll die versteckte Karte des Spielers abschätzen (z. B. wenn ein Chip genutzt wird und eine Karte nicht gezogen wird).
  - Der KI-Gegner sollte immer recht gut wissen, wie es um seine Gewinn-Chancen steht.

 ---

 ## 7. Wirtschaft / Punkte / Fortschritt

 - **Statistiken** (MVP: nur **lokal** speichern, z. B. LocalStorage/IndexedDB):
  - Verloren/gewonnen, Winrate
  - Genutzte Chips
  - Gezogene Karten
 - Weitere Statistiken nach Bedarf.

 ---

 ## 8. Benutzeroberfläche & UX

 - **Layout**
  - Tischansicht, Blick von oben
  - Karten werden nebeneinander immer weiter platziert
 - **Responsiveness**
  - Normale Ansicht auf Desktop im Browser.
  - Mobile nur Querformat.
 - **Bedienkonzept**
   - Einfache Steuerung über Maus
   - Karte ziehen und Skip als Buttons. Chips mit einem Klick aktivieren.
   - Mobile gibt es natürlich dieselben Touch-Flächen 

 ---

 ## 9. Animationen & Präsentation

 - **Stil der Animationen**
  - Snappy, sehr schön und smooth.
 - **Kritische Animationen**
   - Kartenausteilen:
    - Das Karte ziehen soll sehr cool aussehen, wie sie sich auf der Seite positioniert.
   - Highlight von Gewinnen/Verlusten: Soll sich sehr belohnend anfühlen, zu gewinnen!
 - **Technische Vorgaben**
   - Sehr optimiert, auf keinen Fall Performance-Issues riskieren
 - **Performance-Optimierung bei Animationen**
   - GPU-freundliche Eigenschaften bevorzugen

 ---

 ## 10. Performance-Anforderungen

 - **Ziel-FPS**
  - 60 FPS auf modernen Geräten
 - **Zielgeräte** 
  - Low-End-Phones berücksichtigen

 ---

 ## 11. Technischer Stack & Architektur

 - **Framework**: 
  - Vue 3 + TypeScript + Vite
 - **State-Management**
  - Egal, aber performant und einfach wartbar
 - **Routing**
  - Vue Router mit mehreren Ansichten
 - **Build-Tooling** 
  - Vite, Chrome und Safari, Polyfills
 - **Strukturierung des Codes**
   - Trennung von Spiel-Logik und UI-Komponenten
   - Wiederverwendbare UI-Komponenten (Buttons, Karten, Chips, Tooltips, Dialoge)

 ---

 ## 12. Audio & Feedback

 - **Soundeffekte** 
  - Karten ziehen
  - Es wird geskippt
  - Runde verloren/gewonnen
  - Spiel gewonnen/verloren (alle Leben sind weg)
  - Chip wird eingesetzt
 - **Musik**
  - Dezente Hintergrundmusik, Getummel
 - **Audio-Performance** 
  - Preloading, kurze Latenz

 ---

 ## 13. Lokalisierung & Texte

 - **Sprachen**
  - erstmal nur deutsch, vorbereiten für andere Sprachen

 ---

 ## 14. Qualitätssicherung & Tests

 - **Automatisierte Tests** 
  - Unit-Tests für Spiel-Logik
  - Jedes neue Feature soll SOFORT getestet werden
  - E2E für Kern-Userflows
  - Ein Change wird nicht durchgelassen, solange nicht alle Tests grün sind
 - **Akzeptanzkriterien** 
  - Spiel muss nach jedem Change vollständig funktionieren
  - Jeder Test muss grün sein
  - Kein altes Feature darf kaputt gehen, wenn ein neues Feature hinzugefügt wird

 ---

 ## 15. Roadmap / Versionierung

 - **MVP-Umfang**
  - Spieler können gewinnen/verlieren
  - Leben-Mechanik
  - Chips vorhanden und nutzbar
 - **Spätere Erweiterungen**
  - Mehr Modi
  - Schwierigkeitsgrade
  - Mehr Chips
  - Multiplayer: Ich kann Leute über einen Link einladen und die joinen dann mein Spiel
 - **Versionierung**
  - MVP ist die 1.0 Version
  - Neue Features sind .x Versionen
  - Große Änderungen machen aus der 1 die 2 usw.

---

## 16. Klärungen (Stand: nach Rückfragen)

- **Chips**: Bezeichnung für alle Power-Ups/Token; im gesamten Projekt „Chips“ verwenden. Chips **persistieren** – sie werden in die nächste Runde mitgenommen.
- **Limit**: Standard 21; „Limit verschieben“-Chips gelten **nur für die aktuelle Runde** und **für beide** Spieler.
- **Einsatz erhöhen**: +1 = 2 Leben Abzug, +2 = 3 Leben; nur **nächste** Niederlage; stapelbar.
- **Schild/Schild+**: Einmalig bei **meiner nächsten** Niederlage; stapelbar.
- **Karte zurücklegen**: Zwei getrennte Chips – „Meine Karte zurücklegen“ und „Gegner-Karte zurücklegen“ (keine Wahl zwischen beiden).
- **Zugablauf**: Hit und Skip **beenden** den Zug. Davor beliebig viele Chips (z. B. „Zieh 3“, dann Hit). **Nach jedem Chip-Einsatz** wechselt der Zug zum Gegner (der dann wieder Hit/Skip machen darf, auch wenn er vorher schon Skip gemacht hatte).
- **Chip verbraucht**: Chip wird **immer** verbraucht, auch wenn die Aktion nichts bewirkt (z. B. Zieh 5, Karte nicht im Deck).
- **Perfect Draw**: Wie jeder andere Chip – danach wechselt der Zug zum Gegner.
- **Start**: Zwei Karten aus dem 1–11-Deck an die Spieler → 9 Karten bleiben im Deck.
- **Statistiken**: MVP nur lokal (z. B. LocalStorage).



---

## 17. Erweiterte Richtlinien

**Für detaillierte Animation- und Visual-Feedback-Richtlinien siehe:**
- `rules_extended_animations.md` - Umfassende Animation-Spezifikationen
- `CLAUDE.md` - Technische Implementierung für Entwickler

**Kern-Prinzip: ALLES MUSS SICHTBAR SEIN**
- Keine versteckten Aktionen
- Sofortige visuelle Rückmeldung für alle Chip-Effekte
- Dialoge nur für kritische Entscheidungen
- Interaktions-Blockierung während Animationen


---

## 18. Chip-Farbkodierung

Zur besseren Unterscheidung und strategischen Übersicht verwenden alle Chips ein einheitliches Farbsystem:

**🔵 Zieh-Chips (Teal/Blau)**
- Zieh 2, Zieh 3, Zieh 4, Zieh 5, Zieh 6, Zieh 7
- Funktion: Sofortiges Ziehen spezifischer Karten
- Visuell: Teal/blaue Umrandung und Glow-Effekte

**🔴 Aggressive Chips (Rot)**  
- Einsatz +1, Einsatz +2
- Funktion: Erhöhen den Schaden bei nächster Niederlage
- Visuell: Rote Umrandung und bedrohliche Glow-Effekte

**🟣 Utility/Hilfs-Chips (Lila)**
- Limit 17, Limit 24, Limit 27
- Karten tauschen, Meine Karte zurücklegen, Gegner-Karte zurücklegen
- Perfect Draw
- Funktion: Strategische Hilfsmittel und Spielfeldmanipulation
- Visuell: Lila Umrandung und mystische Glow-Effekte

**🟠 Defensive/Schutz-Chips (Orange)**
- Schild, Schild+
- Funktion: Reduzieren Schaden bei eigener Niederlage
- Visuell: Orange Umrandung und schützende Glow-Effekte

**Implementierung:**
- Farbkodierung sowohl in der UI als auch in Dokumentation einheitlich
- Hover-Effekte verstärken die jeweilige Chip-Kategorie-Farbe
- Tooltips erwähnen die Chip-Kategorie für bessere Lernkurve
