# Image Tagger Pro

Annota **mappe/immagini** direttamente nel browser: carichi un TIFF/PNG/JPG, navighi con pan/zoom, **clicchi** per creare tag (nome, valore, note) e **esporti** il risultato. Progettato per funzionare su **GitHub Pages**: nessuna installazione, nessun download.

> **Privacy-by-design:** i file restano nel tuo browser (nessun upload). Il lavoro è salvato in automatico (autosave).

---

## ✨ Funzionalità in breve

- Caricamento di **TIFF/GeoTIFF** (anche multipagina), **PNG**, **JPG**
- Pan/zoom fluido e posizionamento di **punti** con coordinate normalizzate (0–1)
- **Dataset CSV/JSON** per suggerimenti: etichette composte da più campi (concatenate con ` - `), selezione del campo da salvare come valore
- **Editing rapido**: trascina i marker, modifica nome/valore/note/coordinate, elimina
- **Export** in JSON o **ZIP** con viewer interattivo (pan/zoom + tooltip), utilizzabile offline
- **Autosave** trasparente nel browser

---

## 🚀 Aprire l’app (GitHub Pages)

1. Pubblica il repo su **GitHub Pages** (branch `main`, root `/`).
2. Apri:  
   `https://<tuo-utente>.github.io/<nome-repo>/`

L’app è subito utilizzabile **senza** installare nulla.

---

## 🖼️ Come caricare l’immagine

1. In **Immagine** → **Scegli file** e seleziona una mappa/immagine:
   - **TIFF/GeoTIFF** (decodifica in locale, supporto multipagina)
   - **PNG / JPG**
2. Usa **Zoom + / Zoom − / Adatta** (oppure rotellina + trascinamento per pan).
3. Per TIFF multipagina, usa il selettore **Pagina TIFF**.

> **Prova rapida:** nella cartella `data/` trovi due immagini dimostrative:
>
> - `data/01.png`
> - `data/02.jpg`  
>
> Scaricale in locale e caricale dall’app (il browser non può leggere file direttamente dal repo remoto).

---

## 📚 Come caricare la lista dati

Per facilitare l’immissione, puoi creare un elenco selezionabile per **Nome (visibile)**, con compilazione automatica del **Valore**.

1. In **Dati** → carica un file **CSV** o **JSON**.
2. Seleziona **uno o più** *Campi da visualizzare*: l’etichetta mostrata sarà la **concatenazione** (con ` - `) dei campi scelti, **saltando i vuoti**.
3. Scegli il **Campo da immettere**: è il valore che verrà **salvato nello spot** quando selezioni dall’elenco.

**File demo** (cartella `data/`):
- `toponimi.csv`
- `toponimi.json`

Hanno questi campi:

id, project_id, project, name, alternative_names, wikidata, wikipedia, geom

**Suggerito per la prova:**
- **Campi da visualizzare** → `name` e `alternative_names`  
- **Campo da immettere** → `id` (oppure `project_id`)

### 🌐 Oppure collega direttamente OSM (Overpass)

Se non hai un file CSV/JSON, puoi **recuperare un dataset da OpenStreetMap** senza uscire dall’app:

1. In **Dati (CSV/JSON)** clicca **Connetti a OSM**.
2. Nel modale imposta:
   - **BBOX**: disegna un rettangolo sulla mini-mappa (Leaflet) con **Disegna rettangolo** → **Usa bbox selezionata**.  
     *(Consigliato: evita ricerche globali troppo ampie.)*
   - **Tipi**: `node`, `way`, `relation` (puoi selezionarne più di uno).
   - **Chiave (tag)** e **Valore (opzionale)**: es. `place` = `city`, oppure solo `amenity`.  
     Riferimenti utili: [Guida ai tag OSM](https://wiki.openstreetmap.org/wiki/Tagging) · [Map Features](https://wiki.openstreetmap.org/wiki/Map_features)
   - **Filtra per nome** (contiene): opzionale, es. “Aiano”.
   - **Limite risultati**: per evitare esiti troppo voluminosi.
   - **Includi tutti i tag OSM (flatten)**: se attivo (consigliato), ogni tag OSM diventa un campo selezionabile (es. `name`, `name:it`, `amenity`, …). Se disattivo, viene usato uno schema compatto con pochi campi utili (`name`, `alternative_names`, `wikidata`, …).
3. Premi **Recupera e usa come dataset**.  
   Tornerai all’interfaccia principale dove potrai:
   - selezionare **uno o più Campi da visualizzare** (saranno concatenati con ` - `, saltando i vuoti),
   - scegliere il **Campo da immettere** (l’ID che verrà salvato nello spot quando scegli una voce dall’elenco).

> Suggerimenti:
> - Dopo l’import OSM, usa spesso **`name`** (o `name:it`) + eventuali campi aggiuntivi (es. `alt_name`) per la label, e `id` (prefissato `n/w/r…`) come **Campo da immettere**.
> - Rispetta i limiti dei server Overpass (rate/timeout). In caso di errori, riduci la bbox o il limite risultati, oppure prova un **endpoint** alternativo nel menù.

---

## 📍 Creare, modificare, spostare i tag

### Aggiungere un tag
1. Zooma sul punto desiderato.
2. Clicca **Prendi coord dal canvas** e poi **clicca sull’immagine** → si compilano `x` e `y`.
3. In **Nuovo Tag**:
   - **Nome (visibile)**: digita liberamente **oppure** scegli dall’elenco (se hai caricato un dataset).
   - **Valore da salvare**: se scegli dall’elenco, si compila automaticamente (dal *Campo da immettere*).
   - **Note**: opzionali.
4. **Aggiungi punto**.

### Modificare o spostare
- **Trascina** un marker per spostarlo.
- Nella lista **Punti** (sidebar) puoi modificare **Nome**, **Valore**, **Note**, **x**, **y**; usare **Centra**; **Eliminare**.

> Ogni modifica attiva l’**autosave** nel browser.

---

## 💾 Esportare e riprendere il lavoro

### Esportare
- **Esporta JSON** → scarica `spots.json` con tutti i tag (id, nome, valore, note, x, y).
- **Esporta ZIP (viewer)** → scarica un pacchetto con:
  - `image.png` (snapshot dell’immagine attuale)
  - `spots.json`
  - `viewer.html` (pagina autonoma con pan/zoom e tooltip dei tag)

Apri `viewer.html` anche **offline** per esplorare i tag fuori dall’app.

### Riprendere
- **Autosave**: riaprendo l’app nello **stesso browser**, i tuoi tag e le preferenze sui campi vengono ripristinati.
- **Importa punti (JSON)**: carica un set già pronto (es. dai file demo):
  - `data/01.json` → punti per `01.png`
  - `data/02.json` → punti per `02.jpg`

> Consiglio: carica prima l’immagine, poi importa il JSON corrispondente.

### 🔗 Esportare la tabella d’intersezione (id_map ↔ id_place)

Questa funzione crea una tabella di corrispondenza tra la mappa corrente e i tag posati, utile per join o analisi esterne.

- **id_map**: è il nome del file immagine **senza estensione** (es. `01.png` → `01`).
- **id_place**: è il campo **Valore da salvare** di ciascun tag.

Per esportare:
- **Esporta intersezione (CSV)** → `intersection.csv` con colonne `id_map,id_place`
- **Esporta intersezione (JSON)** → `intersection.json` con oggetti `{ "id_map": "...", "id_place": "..." }`

> Se alcuni tag **non hanno** il campo “Valore da salvare”, l’app ti avvisa e suggerisce di:
> - associare un campo ID dal pannello **Dati (CSV/JSON)**, oppure
> - compilare manualmente il valore.  
> Puoi comunque procedere: in tal caso gli `id_place` mancanti resteranno vuoti.

---

## 🧪 Percorso guidato (5 minuti)

1. **Immagine** → carica `data/01.png`.
2. **Dati** → carica `data/toponimi.csv` (o `toponimi.json`).
   - Campi da visualizzare: `name` + `alternative_names`
   - Campo da immettere: `id`
3. **Nuovo Tag** → **Prendi coord dal canvas** → clic sull’immagine → scegli un nome dall’elenco → opzionali **Note** → **Aggiungi punto**.
4. **Spots** → prova **trascinare** un marker, **Centra**, **Elimina**.
5. **Esporta ZIP (viewer)** → apri `viewer.html` e verifica i tooltip.

---

## ✅ Requisiti e note

- Browser moderni (Chrome, Edge, Firefox, Safari).
- TIFF/GeoTIFF molto grandi vengono **ridotti in anteprima**; le coordinate restano **normalizzate**.
- Per usare i file in `data/`, **scaricali** prima in locale e caricali dall’app (il browser non legge direttamente i file del repo remoto).

---

Buon lavoro! Se qualcosa non funziona o hai proposte, apri una **Issue** su GitHub. ✨
