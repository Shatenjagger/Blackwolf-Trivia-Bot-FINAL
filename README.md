# 🐺 BlackWolf Trivia Bot

Un bot de trivia retro para Discord, dedicado a los **80s, 90s y 2000s**.

Con **96 preguntas únicas**, sistema de puntos, leaderboard automático y mensajes sarcásticos, este bot es una celebración de la nostalgia, la memoria y el amor.

## 🧩 Características

- ✅ **96 preguntas de videojuegos** (consolas, personajes, juegos, trucos, desarrolladores)
- ✅ **Flujo continuo**: después de cada pregunta, opción de continuar sin reiniciar
- ✅ **Sistema de puntos**: +10 por correcta, -5 por incorrecta o tiempo agotado
- ✅ **Leaderboard automático** cada 12 horas en el canal `#trivias-gamer`
- ✅ **Temporizador de 15 segundos** con pista visible en los últimos 5 segundos
- ✅ **Mensajes con personalidad**: *"¿Otra? Seguro fue suerte la última vez..."*
- ✅ **Respuesta correcta → sigue automáticamente**, sin preguntar
- ✅ **Respuesta incorrecta o tiempo agotado → pregunta si desea continuar**
- ✅ **Sincronización con GitHub**: `puntos.json` se actualiza y sube automáticamente
- ✅ **Bot 24/7** en Replit, mantenido por UptimeRobot o cron-job.org

## 🐺 Sistema Lobo Alfa

- ✅ Implementado y estable desde el 31 de julio, 2025
- Cada semana, el jugador con más puntos se convierte en **Lobo Alfa**
- Obtiene el rol especial `Lobo Alfa` en Discord
- Comando: `!loboalfa`
- Actualización automática cada lunes a las 00:00 UTC
- Anuncio en el canal `#trivias-gamer`

## 📂 Estructura del Proyecto

```
Blackwolf-Trivia-Bot-FINAL/
├── index.js                  # Bot principal (Discord + Express)
├── puntos.json               # Almacena puntuaciones en tiempo real
├── lobo_alfa.json            # Guarda al Lobo Alfa semanal
├── .github/workflows/
│   └── bot.yml               # Publica leaderboard en Reddit
├── bot.py                    # Script de publicación en Reddit (PRAW)
├── trivia-datos/
│   └── blackwolf_preguntas_videojuegos.json  # 96 preguntas en formato JSON
└── README.md
```

## 🌐 Publicación Automática en Reddit

- ✅ El workflow `bot.yml` se activa:
  - Manualmente (via GitHub Actions)
  - Cada lunes a las 00:00 UTC
- Publica en: [`r/BlackWolfProject`](https://www.reddit.com/r/BlackWolfProject/)
- Incluye:
  - Top 10 jugadores
  - Enlace al Discord
  - Mensaje automático: *"¿Puedes ser el próximo Lobo Alfa?"*
- Usa credenciales almacenadas en `secrets` de GitHub

## 🚀 Cómo desplegar

1. Clona el repositorio
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Configura tu `.env`:
   ```env
   TOKEN=TuTokenDeBotDeDiscord
   GITHUB_TOKEN=TuTokenDeAccesoPersonal
   REDDIT_CLIENT_ID=TuClientID
   REDDIT_CLIENT_SECRET=TuClientSecret
   REDDIT_USERNAME=TuUsuarioReddit
   REDDIT_PASSWORD=TuContraseñaReddit
   REDDIT_USER_AGENT=blackwolfbot/1.0 by u/Hollow_Point79
   ```
4. Ejecuta el bot:
   ```bash
   node index.js
   ```
5. Asegúrate de que el servidor web escuche en `PORT` (Replit)

## 🔄 Mantenimiento y Estabilidad

- ✅ Evita múltiples instancias con lógica de flujo controlado (no con `global`)
- ✅ Reinicio limpio: `pkill -9 node` antes de ejecutar
- ✅ El bot se mantiene despierto con un servidor Express en `/`
- ✅ Monitoreado por UptimeRobot o cron-job.org

## 📜 Historia

Este bot fue creado por **Hollow Point** como un regalo de amor para su hijo **Carlos**.  
No es solo un proyecto de código.  
Es un **legado**.

> *"El Lobo Alfa no juega. Domina."*

## 💌 Créditos

Creado con amor, café, cerveza y nostalgia.  
Para Carlos. Siempre.
```

---

### ✅ Cambios clave realizados

| Sección | Actualización |
|--------|---------------|
| **Tiempo de respuesta** | De 30s a **15s** (más justo, evita ayuda externa) |
| **Pista** | Ahora aparece en los **últimos 5 segundos**, no en 15-10 |
| **Flujo de trivia** | Ahora especifica que sigue automáticamente si es correcta |
| **Sincronización** | Detalla cómo se sube `puntos.json` a GitHub |
| **Reddit Bot** | Incluye el workflow y el script `bot.py` |
| **Estructura** | Añadida para claridad técnica |
| **Mantenimiento** | Guía clara para evitar duplicados en Replit |

---

