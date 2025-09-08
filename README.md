# ⵌ Tagging Maps

Annota **mappe/immagini** direttamente nel browser: carica la tua mappa, naviga e **clicca** per creare tag con Json associati (nome, valore, note, foreign key) e **esporta** il risultato. Progettato per funzionare direttamente online tramite **GitHub Pages**: nessuna installazione o download necessario.

> **Privacy-by-design:** i file restano nel tuo browser (nessun upload). Il lavoro è salvato in automatico (autosave).

---

<details open>
<summary><strong>📑 Indice</strong></summary>

<table>
  <tr>
    <td width="34%" valign="top">
      <ul>
        <li><a href="#funzionalita-in-breve">✨ Funzionalità in breve</a></li>
        <li><a href="#aprire-lapp-github-pages">🚀 Aprire l’app (GitHub Pages)</a></li>
        <li><a href="#come-caricare-limmagine">🖼️ Come caricare l’immagine</a></li>
        <li>
          <a href="#carica-il-tuo-dataset">📚 Carica il tuo dataset</a>
          <ul>
            <li><a href="#non-hai-una-lista-di-toponimi-gia-mappati-usa-lapi-per-osm">🌐 Non hai una lista di toponimi già mappati? Usa l'API per OSM!</a></li>
          </ul>
        </li>
      </ul>
    </td>
    <td width="33%" valign="top">
      <ul>
        <li>
          <a href="#creare-modificare-spostare-i-tag">📍 Creare, modificare, spostare i tag</a>
          <ul>
            <li><a href="#aggiungere-un-tag">Aggiungere un tag</a></li>
            <li><a href="#hai-sbagliato-a-inserire-o-popolare-un-tag">Hai sbagliato a inserire o popolare un TAG?</a></li>
          </ul>
        </li>
        <li><a href="#riprendere-il-lavoro">🔄 Riprendere il lavoro</a></li>
        <li>
          <a href="#esportare-i-risultati">💾 Esportare i risultati</a>
          <ul>
            <li><a href="#esporta-i-tuoi-tag">Esporta i tuoi TAG</a></li>
            <li><a href="#esporta-la-tabella-dintersezione-per-il-tuo-database">🔗 Esporta la tabella d’intersezione per il tuo database</a></li>
          </ul>
        </li>
      </ul>
    </td>
    <td width="33%" valign="top">
      <ul>
        <li><a href="#un-piccolo-riassunto-sui-dati-di-prova">🧪 Un piccolo riassunto sui dati di prova</a></li>
        <li><a href="#requisiti-e-note">✅ Requisiti e note</a></li>
      </ul>
    </td>
  </tr>
</table>

</details>

---

## ✨ Funzionalità in breve

- Caricamento di **TIFF/GeoTIFF** (anche multipagina), **PNG**, **JPG**
- Pan/zoom fluido e posizionamento di **punti** con coordinate normalizzate (0–1)
- **Dataset CSV/JSON** per suggerimenti: etichette composte da più campi (concatenate con ` - `), selezione del campo da salvare come valore
- **Editing rapido**: trascina i marker, modifica i va
- **Export** in JSON o **ZIP** con viewer interattivo (pan/zoom + tooltip), utilizzabile offline
- **Autosave** trasparente nel browser

---

## 🚀 Aprire l’app (GitHub Pages)

1. Pubblica il repo su **GitHub Pages** (branch `main`, root `/`).
2. Apri:  
   `https://<tuo-utente>.github.io/<nome-repo>/`

L’app è subito utilizzabile **e non richiede installazioni**

---

## 🖼️ Caricare l’immagine

Per iniziare, carica l'immagine che ti interessa 'taggare' direttamente dal tuo PC e importala nel progetto.

>- In **Immagine** → **Scegli file** e seleziona una mappa/immagine - **TIFF/GeoTIFF** , **PNG**, **JPG**
>-  Usa **Zoom + / Zoom − / Adatta** (oppure rotellina/trascinamento per navigare la tua mappa).
>- Per TIFF multipagina, usa il selettore **Pagina TIFF**.

**File demo** 

Non hai una mappa o vuoi fare un tentativo prima di iniziare? Usa i nostri dati di test, già taggati!
👇
 >**Prova rapida:** nella cartella `data/` trovi due immagini dimostrative:
 > - 👉 [`data/01.jpg`](https://github.com/erasmdif/map_picker/blob/main/data/01.jpg)
 > - 👉 [`data/02.jpg`](https://github.com/erasmdif/map_picker/blob/main/data/02.jpg)

**Scaricali in locale** e procedi allo step successivo!

---

## 📚 Caricare il *dataset*

Collega i tuoi tag ad elementi geolocalizzati caricando i tuoi dati e usali per la compilazione automatica di valorie e ID! Ecco come fare:

>1. In **Dati** → carica un file **CSV** o **JSON**.

> 2. Seleziona **uno o più** *Campi da visualizzare*: Questo/i campo/i sarà quello che darà il nome all'etichetta del TAG (**"nome"**) del tuo Json finale. **Selezionando più campi** il risultato sarà una **concatenazione** di valori dei campi scelti, divisi da "-"

**NB:** In caso di campi **NULL/vuoti**, il carattere di divisione sarà omesso

> 3. **Scegli il campo con il tuo ID**: questo sarà associato al campo **Valore** nel tuo json finale e **fungerà da chiave esterna per mettere** in comunicazione il tuo TAG con il tuo *dataset* principale

**File demo** 
👇

Sempre nella repo, troverai un piccolo dataset di prova con toponimo di alcune regioni del Nord-Italia, in formato CSV. Scaricalo in locale e usalo per provare lo strumento:

- [toponimi.csv](https://github.com/erasmdif/map_picker/blob/main/data/toponimi.csv)

> **Suggerimenti:**
> - **Campi da visualizzare** → `name` e `alternative_names`  
> - **Campo da immettere** → `id` (questo ID fungerà da chiave esterna per i dati riportati nel Json di prova)

### 🌐 Non hai una lista di toponimi già mappati? Usa l'API per OSM!

Se non hai un file CSV/JSON, puoi **recuperare un dataset da OpenStreetMap** senza uscire dall’app. Ecco come fare:

> 1. In **Dati (CSV/JSON)** clicca **Connetti a OSM**.

> 2. Nella scheda che si apre, seleziona :
     - **Tipi**: `node`, `way`, `relation` (puoi selezionarne più di uno).
     - **Chiave (tag)** e **Valore (opzionale)**: es. `place` = `city`, oppure solo `amenity`. Si consiglia fortemente di  limitare la ricerca a determinati layer per evitare risposte troppo pesanti. 
     - **Filtra per nome** (contiene): opzionale, es. “Aiano”.
     - **Limite risultati**: inserisci un numero massimo di risultati per evitare esiti troppo voluminosi.
     - **Includi tutti i tag OSM (flatten)**: se attivo (consigliato), ogni tag OSM diventa un campo selezionabile (es.  `name`, `name:it`, `amenity`). Se disattivato, viene usato uno schema compatto con pochi campi utili (`name`, `alternative_names`, `wikidata`). 

Riferimenti utili: 
    · [Guida ai tag OSM](https://wiki.openstreetmap.org/wiki/Tagging) 
    · [Map Features](https://wiki.openstreetmap.org/wiki/Map_features)

 > 3. **Limita la chiamata ad una porzione di mondo** (consigliato): Per ottimizzare la chiamata ed evitare call globali difficilmente gestibili si consiglia fortemente di immettere un  **bbox** rettangolare sulla porzione di mondo su cui si indirizza la propria ricerca. 
 Lo strumento permette di inserire manualmente le coordinate oppure di **disegnarle direttamente su mappa**. Una volta inseriti i limiti della bbox, selezionare **Usa bbox selezionata**.  

 > 4. Premi **Recupera e usa come dataset**: ritornerai alla schermata principale potrai selezionare etichette e id sfruttando i campi di OSM!

---

## 📍 Creare, modificare, spostare i tag

Finalmente sei pronto per "taggare la tua immagine". 
Ecco come:
👇

### ⵌ Aggiungere un tag
>1. Porta il puntatore sul **punto** sul quale vuoi inserire il TAG;
>2. Clicca sul punto per inserire automaticamente le 'coordinate' interne dell'immagine (noterai che i campi `x` e `y` si compileranno al tuo click).
>3. Completa il tuo **tag** inserendo i seguenti campi (opzionali):
   > - **Nome (visibile)**: digita liberamente; se hai caricato un *dataset*, un menù a tendina con le opzioni disponibili sarà generato (*scelta consigliata*);
   > - **Valore da salvare**: digita liberamente l'ID di collegamento al tuo *dataset*; se hai caricato i dati da OSM/*dataset* locale, l'ID verrà recuperato automaticamente alla selezione del nome (*scelta consigliata*).
   > - **Note**: arricchisci il tuo TAG con note o appunti interni (opzionale)
>4. **Clicca su Aggiungi punto per salvare il punto**.


 ### ⚠️ Hai sbagliato a inserire o popolare un TAG?
Nessun problema! Editalo o eliminalo quando vuoi!
👇

 > - Modifica la posizione **inserendo nuove coordinate (x,y)** o **trascinando il TAG** (*scelta consigliata*).

 > - Nella lista **Punti** (sidebar) puoi editare in ogni momento i campi **Nome**, **Valore** e **Note**.

 > - Usa l'opzione **Centra** per puntare lo schermo sul tag desiderato.

 > - Se ti sei sbagliato, seleziona **Elimina** per rimuovere definitivamente il TAG (⚠️ la scelta **non** è reversibile).

⚠️ NB: Ogni modifica attiva l’**autosave** nel browser.

---

## 🔄 Riprendere il lavoro

Interrompi e riprendi il lavoro quando vuoi. Il *browser* manterrà in memoria il tuo **ultimo lavoro**, anche in caso di errori o interruzioni improvvise! **Autosave**.

In alternativa, puoi caricare un Json già creato tramite lo strumento **Importa punti (JSON)** nella sezione **spots** ed importarlo nel tuo progetto attuale; modificalo o usalo per creare di un nuovo file di TAG!

> Consiglio: carica prima l’immagine, poi importa il JSON corrispondente.

**File demo** 
👇

Se stai usando le mappe di prova, puoi caricare dei Json già esistenti ed associati alle mappe. 
Seleziona:

  - [`data/01.json`](https://github.com/erasmdif/map_picker/blob/main/data/01.json) → punti per `01.jpg`
  - [`data/02.json`](https://github.com/erasmdif/map_picker/blob/main/data/02.json) → punti per `02.jpg`

---

## 💾 Esportare i risultati

### Esporta i tuoi TAG

Sei pronto finalmente per esportare il risultato finale. Usa gli strumenti di esportazione presenti nella sezione **spots** per:

> - **Esportare il singolo JSON con i TAG** 
> - **Esporta un progetto completo ZIP** → il pacchetto comprende:
    - `image.png` (snapshot dell’immagine attuale)
    - `spots.json`
    - `viewer.html` (pagina autonoma con pan/zoom e tooltip dei tag) **versione demo**


### 🔗 Esporta la tabella d’intersezione per il tuo *database*

Se hai lavorato con ID e chiavi esterne, probabilmente vorrei collegare i tuoi TAG al tuo dataset principale. Seleziona l'opzione **Esporta intersezione** nella sezione **SPOT** nel formato che preferisci (CSV/JSON) per ottenere una tabella d'intersezione contenente:

> - **id_map**: questo campo sarà automaticamente popolato con il nome del file immagine **privato dell'estensione** (es. `01.png` → `01`).
> - **id_place**: qui verranno salvati tutti i **Valori (campo ID)** dei tuoi tag.

⚠️ In caso i tuoi tag **non avessero** il campo “Valore”, l’esportazione verrà bloccata e ti verrà chiesto di scegliere se:
 - Associare un campo ID dal pannello **Dati (CSV/JSON)**;
 - inserire manualmente i valori mancanti;
 - Procedere lasciando alcuni campi di `id_place` vuoti (*scelta sconsigliata*)

---

## 🧪 Un piccolo riassunto sui dati di prova

Se hai deciso di provare il tool con gli strumenti, ecco un piccolo riassunto dei passi da fare
👇

1. Scarica la **mappa di prova** → salva in locale [`data/01.jpg`](https://github.com/erasmdif/map_picker/blob/main/data/01.jpg) oppure [`data/02.jpg`](https://github.com/erasmdif/map_picker/blob/main/data/02.jpg) e **caricala** nello strumento; 
2. **Dati** → carica `data/toponimi.csv` (o `toponimi.json`) e seleziona:
   - Campi **da visualizzare**: `name` (se vuoi un campo concatenato, seleziona anche `alternative_names`);
   - ID: `id`
3. Crea nuovi **Nuovo Tag** → **Prendi coord dal canvas** → clic sull’immagine → scegli un nome dall’elenco → opzionali **Note** → **Aggiungi punto**;

> In alternativa importa i file con i tag già creati:
> - [`data/01.json`](https://github.com/erasmdif/map_picker/blob/main/data/01.json) → punti per `01.jpg`
> - [`data/02.json`](https://github.com/erasmdif/map_picker/blob/main/data/02.json) → punti per `02.jpg`

4. Edita gli **Spots** → prova a **trascinare** un marker, **Centra**, **Elimina**.
5. **Esporta il progetto o i singoli tag** → Se hai scaricato il progetto, apri `viewer.html` e verifica i tooltip.

---

## ✅ Requisiti e note

- Browser moderni (Chrome, Edge, Firefox, Safari).
- TIFF/GeoTIFF molto grandi vengono **ridotti in anteprima**; le coordinate restano **normalizzate**.
- Per usare i file in `data/`, **scaricali** prima in locale e caricali dall’app (il browser non legge direttamente i file del repo remoto).

---

Buon lavoro! Se qualcosa non funziona o hai proposte, apri una **Issue** su GitHub. ✨
