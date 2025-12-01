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
