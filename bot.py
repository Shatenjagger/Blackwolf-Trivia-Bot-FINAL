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

# === Paso 1: Leer credenciales
print("🔧 Leyendo variables de entorno...")
client_id = os.getenv("REDDIT_CLIENT_ID")
client_secret = os.getenv("REDDIT_CLIENT_SECRET")
username = os.getenv("REDDIT_USERNAME")
password = os.getenv("REDDIT_PASSWORD")
raw_user_agent = os.getenv("REDDIT_USER_AGENT")

if not all([client_id, client_secret, username, password, raw_user_agent]):
    print("❌ Faltan variables de entorno")
    print(f"  CLIENT_ID: {'✅' if client_id else '❌'}")
    print(f"  CLIENT_SECRET: {'✅' if client_secret else '❌'}")
    print(f"  USERNAME: {'✅' if username else '❌'}")
    print(f"  PASSWORD: {'✅' if password else '❌'}")
    print(f"  USER_AGENT: {'✅' if raw_user_agent else '❌'}")
    exit(1)

clean_user_agent = limpiar_user_agent(raw_user_agent)
print(f"✅ User agent limpio: '{clean_user_agent}'")

# === Paso 2: Autenticar en Reddit
try:
    reddit = praw.Reddit(
        client_id=client_id,
        client_secret=client_secret,
        username=username,
        password=password,
        user_agent=clean_user_agent
    )
    # Forzar autenticación
    me = reddit.user.me()
    print(f"✅ Autenticado en Reddit como: {me}")
except Exception as e:
    print(f"❌ Error de autenticación en Reddit: {e}")
    exit(1)

# === Paso 3: Leer puntos.json
PUNTOS_JSON = "puntos.json"
if not os.path.exists(PUNTOS_JSON):
    print(f"❌ No se encontró {PUNTOS_JSON}")
    exit(1)

try:
    with open(PUNTOS_JSON, "r", encoding="utf-8") as f:
        puntos = json.load(f)
    print(f"✅ {PUNTOS_JSON} cargado con {len(puntos)} jugadores")
except Exception as e:
    print(f"❌ Error al leer {PUNTOS_JSON}: {e}")
    exit(1)

# === Paso 4: Generar leaderboard
jugadores = [
    {"nombre": datos["nombre"], "puntos": datos["puntos"]}
    for k, datos in puntos.items()
    if isinstance(datos, dict) and "nombre" in datos
]
jugadores.sort(key=lambda x: x["puntos"], reverse=True)
top_10 = jugadores[:10]

if not top_10:
    print("❌ No hay jugadores en el leaderboard")
    exit(1)

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

print("✅ Mensaje del leaderboard generado")

# === Paso 5: Publicar en Reddit
subreddit_name = "BlackWolfProject"
try:
    subreddit = reddit.subreddit(subreddit_name)
    # Verificar que el subreddit existe
    if subreddit.display_name != subreddit_name:
        print(f"❌ Subreddit no encontrado: {subreddit_name}")
        exit(1)
    print(f"✅ Subreddit encontrado: {subreddit.display_name}")
except Exception as e:
    print(f"❌ Error al acceder al subreddit: {e}")
    exit(1)

try:
    titulo = f"🏆 Leaderboard Semanal - BlackWolf Trivia ({datetime.now().strftime('%Y-W%U')})"
    post = subreddit.submit(titulo, selftext=cuerpo)
    print(f"✅ ¡Post publicado con éxito! URL: {post.url}")
except Exception as e:
    print(f"❌ Error al publicar en Reddit: {e}")
    exit(1)





