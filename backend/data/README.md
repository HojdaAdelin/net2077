# Seed Data - Cum să adaugi întrebări

## Structura unei întrebări

Fiecare întrebare din `questions.json` are următoarea structură:

```json
{
  "title": "Textul întrebării?",
  "type": "basic|all|acadnet",
  "answers": ["Răspuns 1", "Răspuns 2", "Răspuns 3", "..."],
  "correctAnswers": [0, 2],
  "multipleCorrect": true,
  "difficulty": "easy|medium|hard",
  "points": 2
}
```

## Câmpuri

### `title` (obligatoriu)
Textul întrebării. Poate fi orice lungime.

### `type` (obligatoriu)
Categoria întrebării:
- `basic` - Comenzi fundamentale
- `all` - Toate întrebările
- `acadnet` - Întrebări specifice Acadnet

### `answers` (obligatoriu)
Array cu toate răspunsurile posibile. Poți avea **3, 4, 5, 6 sau oricâte răspunsuri** vrei.

### `correctAnswers` (obligatoriu)
Array cu indexurile răspunsurilor corecte (începe de la 0).

**Exemple:**
- Un singur răspuns corect: `[0]` (primul răspuns)
- Două răspunsuri corecte: `[0, 2]` (primul și al treilea)
- Trei răspunsuri corecte: `[1, 3, 4]` (al doilea, al patrulea și al cincilea)

### `multipleCorrect` (obligatoriu)
- `true` - Întrebarea are mai multe răspunsuri corecte (utilizatorul poate selecta multiple)
- `false` - Întrebarea are un singur răspuns corect

### `difficulty` (opțional)
Dificultatea întrebării: `easy`, `medium`, sau `hard`
Default: `medium`

### `points` (opțional)
Câte puncte valorează întrebare.
- Întrebări simple (1 răspuns corect): `1` punct
- Întrebări complexe (multiple răspunsuri): `2-3` puncte
Default: `1`

### `tags` (opțional)
Array cu tag-uri pentru categorizare și filtrare.

**Tag-uri disponibile:**
- `LINUX` - Comenzi și concepte Linux
- `NETWORK` - Rețele și protocoale
- `DATABASE` - Baze de date
- `SECURITY` - Securitate
- `ALGORITHMS` - Algoritmi
- `DATA_STRUCTURES` - Structuri de date
- `HTTP` - Protocol HTTP
- `SQL` - SQL și query-uri
- `COMMANDS` - Comenzi sistem
- `HARDWARE` - Hardware
- `OPERATING_SYSTEMS` - Sisteme de operare
- `OSI` - Model OSI
- `IP` - Adresare IP

Poți adăuga oricâte tag-uri vrei la o întrebare.

**Exemplu:**
```json
"tags": ["LINUX", "COMMANDS", "SECURITY"]
```

## Exemple

### 1. Întrebare simplă (1 răspuns corect din 4)
```json
{
  "title": "What is the capital of France?",
  "type": "basic",
  "answers": ["London", "Paris", "Berlin", "Madrid"],
  "correctAnswers": [1],
  "multipleCorrect": false,
  "difficulty": "easy",
  "points": 1
}
```

### 2. Întrebare cu 3 răspunsuri
```json
{
  "title": "Which is a programming language?",
  "type": "all",
  "answers": ["Python", "HTML", "CSS"],
  "correctAnswers": [0],
  "multipleCorrect": false,
  "difficulty": "easy",
  "points": 1
}
```

### 3. Întrebare cu 6 răspunsuri și 2 corecte
```json
{
  "title": "Which of these are databases?",
  "type": "all",
  "answers": [
    "MySQL",
    "React",
    "MongoDB",
    "Angular",
    "Vue",
    "PostgreSQL"
  ],
  "correctAnswers": [0, 2, 5],
  "multipleCorrect": true,
  "difficulty": "medium",
  "points": 2
}
```

### 4. Întrebare complexă (4 răspunsuri corecte din 7)
```json
{
  "title": "Select all valid HTTP status codes:",
  "type": "acadnet",
  "answers": [
    "200 OK",
    "150 Continue",
    "404 Not Found",
    "999 Error",
    "500 Internal Server Error",
    "301 Moved Permanently",
    "750 Unknown"
  ],
  "correctAnswers": [0, 2, 4, 5],
  "multipleCorrect": true,
  "difficulty": "hard",
  "points": 3
}
```

## Cum se punctează?

### Răspuns unic (multipleCorrect: false)
- Răspuns corect: **punctele întrebării**
- Răspuns greșit: **0 puncte**

### Răspunsuri multiple (multipleCorrect: true)
- Toate răspunsurile corecte selectate: **punctele întrebării**
- Orice altceva (lipsă sau în plus): **0 puncte**

**Exemplu:**
Întrebare cu `correctAnswers: [0, 2, 4]` și `points: 2`
- User selectează `[0, 2, 4]` → **2 puncte** ✓
- User selectează `[0, 2]` → **0 puncte** ✗ (lipsește 4)
- User selectează `[0, 2, 3, 4]` → **0 puncte** ✗ (3 în plus)

## Cum să adaugi întrebări noi

1. Deschide `backend/data/questions.json`
2. Adaugă obiectul JSON la sfârșitul array-ului
3. Rulează seed:
```bash
cd backend
npm run seed
```

## Cum funcționează seed-ul?

Scriptul de seed este **inteligent** și sincronizează automat:

### ✅ Adaugă întrebări noi
Dacă adaugi o întrebare nouă în JSON, va fi adăugată în DB.

### 🔄 Actualizează întrebări existente
Dacă modifici o întrebare existentă (același `title`), va fi actualizată în DB.

### 🗑️ Șterge întrebări vechi
Dacă ștergi o întrebare din JSON, va fi ștearsă și din DB.

**Identificare:** Întrebările sunt identificate după `title`. Dacă schimbi titlul, va fi considerată o întrebare nouă.

### Exemplu de output:
```
📊 Syncing Questions...
   🗑️  Deleted: "Old question that was removed"
   ✅ Added: 2 | Updated: 8 | Deleted: 1
   📝 Total questions in DB: 15
```

## Tips

- Folosește `points: 1` pentru întrebări simple
- Folosește `points: 2-3` pentru întrebări cu răspunsuri multiple
- Poți avea oricâte răspunsuri vrei (3, 4, 5, 10...)
- Poți avea oricâte răspunsuri corecte vrei (1, 2, 3, toate...)
- Asigură-te că indexurile din `correctAnswers` sunt valide (< lungimea array-ului `answers`)
