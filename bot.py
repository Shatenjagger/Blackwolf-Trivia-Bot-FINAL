import os
import praw
import json
import re
from datetime import datetime

def limpiar_user_agent(ua: str) -> str:
    if ua is None:
        return "blackwolfbot/1.0 by u/Hollow_Point79"
    ua = ua.strip()
    ua = re.sub(r'[\n\r\t]', ' ', ua)
    ua = re.sub(r'\s+', ' ', ua)
    return ua

# Configuración de Reddit
raw_user_agent = os.getenv("REDDIT_USER_AGENT")
clean_user_agent = limpiar_user_agent(raw_user_agent)

print(f"🔧 User agent usado: '{clean_user_agent}'")

try:
    reddit = praw.Reddit(
        client_id=os.getenv("REDDIT_CLIENT_ID"),
        client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
        username=os.getenv("REDDIT_USERNAME"),
        password=os.getenv("REDDIT_PASSWORD"),
        user_agent=clean_user_agent
    )
    reddit.user.me()  # Esto verifica si las credenciales son válidas
    print("✅ Autenticado en Reddit correctamente")
except Exception as e:
    print(f"❌ Error de autenticación en Reddit: {e}")
    exit(1)

subreddit = reddit.subreddit("BlackWolfProject")

# Ruta al archivo de puntos
PUNTOS_JSON = "puntos.json"
ARCHIVO_ULTIMO_POST = "last_leaderboard_week.txt"

def obtener_semana_actual():
    return datetime.now().strftime("%Y-W%U")  # Ej: 2025-W31

def generar_leaderboard():
    if not os.path.exists(PUNTOS_JSON):
        print("❌ No se encontró puntos.json")
        return None

    try:
        with open(PUNTOS_JSON, "r", encoding="utf-8") as f:
            puntos = json.load(f)
    except Exception as e:
        print(f"❌ Error al leer puntos.json: {e}")
        return None

    jugadores = [
        {"nombre": datos["nombre"], "puntos": datos["puntos"]}
        for k, datos in puntos.items()
        if isinstance(datos, dict) and "nombre" in datos
    ]
    jugadores.sort(key=lambda x: x["puntos"], reverse=True)
    top_10 = jugadores[:10]

    cuerpo = "## 🏆 **LEADERBOARD SEMANAL - BLACKWOLF TRIVIA**\n\n"
    cuerpo += "¡Demuestra que sabes más que un lobo! 🐺\n\n"
    cuerpo += "```\n"
    cuerpo += "POS  | NOMBRE           | PUNTOS\n"
    cuerpo += "-----|------------------|-------\n"
    for i, jugador in enumerate(top_10, 1):
        nombre = jugador['nombre'][:15].ljust(15)
        cuerpo += f"{i:2}   | {nombre} | {jugador['puntos']}\n"
    cuerpo += "```\n\n"
    cuerpo += "🎮 Únete al servidor y compite: https://discord.gg/7ksHtVj5ns    \n"
    cuerpo += "💬 ¿Puedes ser el próximo Lobo Alfa?\n\n"
    cuerpo += "---\n"
    cuerpo += "📅 Publicado automáticamente cada semana | #TheBlackWolfProject"

    return cuerpo

# Verificar si ya se publicó esta semana
semana_actual = obtener_semana_actual()
ultima_semana = ""

if os.path.exists(ARCHIVO_ULTIMO_POST):
    try:
        with open(ARCHIVO_ULTIMO_POST, "r") as f:
            ultima_semana = f.read().strip()
    except Exception as e:
        print(f"⚠️ No se pudo leer {ARCHIVO_ULTIMO_POST}: {e}")

if semana_actual != ultima_semana:
    mensaje = generar_leaderboard()
    if mensaje:
        try:
            titulo = f"🏆 Leaderboard Semanal - BlackWolf Trivia ({semana_actual})"
            post = subreddit.submit(titulo, selftext=mensaje)
            print("✅ Leaderboard publicado con éxito en Reddit.")
            # Intentar guardar la semana (aunque no persista en el repositorio)
            try:
                with open(ARCHIVO_ULTIMO_POST, "w") as f:
                    f.write(semana_actual)
                print("💾 Semana guardada localmente")
            except Exception as e:
                print(f"⚠️ No se pudo guardar {ARCHIVO_ULTIMO_POST}: {e}")
        except Exception as e:
            print("❌ Error al publicar en Reddit:", e)
    else:
        print("❌ No se pudo generar el leaderboard.")
else:
    print("⏩ Ya se publicó el leaderboard esta semana. No se repite.")





