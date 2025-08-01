// === DEPENDENCIAS ===
const express = require('express');
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
require('dotenv').config();

// === SERVIDOR WEB (para mantener el bot despierto) ===
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
  res.send('🐾 BlackWolf está despierto. Carlos vive.');
});
app.listen(PORT, () => {
  console.log(`🟢 Servidor web iniciado en puerto ${PORT}`);
});

// === CLIENTE DISCORD ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// === RUTAS DE ARCHIVOS ===
const PUNTOS_PATH = path.join(__dirname, 'puntos.json');
const LOBO_ALFA_PATH = path.join(__dirname, 'lobo_alfa.json');
const PREGUNTAS_PATH = path.join(__dirname, '..', 'trivia-datos', 'blackwolf_preguntas_videojuegos.json');

// === CARGAR PREGUNTAS ===
let preguntas = [];
console.log('🔍 Buscando archivo de preguntas en:', PREGUNTAS_PATH);
if (!fs.existsSync(PREGUNTAS_PATH)) {
  console.error('❌ Archivo de preguntas no encontrado:', PREGUNTAS_PATH);
} else {
  try {
    const data = fs.readFileSync(PREGUNTAS_PATH, 'utf8');
    preguntas = JSON.parse(data);
    console.log(`✅ Cargadas ${preguntas.length} preguntas desde blackwolf_preguntas_videojuegos.json`);
  } catch (err) {
    console.error('❌ Error cargando o parseando el archivo JSON:', err);
  }
}

// === CARGAR O CREAR puntos.json ===
let puntos = {};
if (fs.existsSync(PUNTOS_PATH)) {
  try {
    puntos = JSON.parse(fs.readFileSync(PUNTOS_PATH, 'utf8'));
  } catch (err) {
    console.error('❌ Error leyendo puntos.json, iniciando vacío');
  }
} else {
  fs.writeFileSync(PUNTOS_PATH, '{}');
}

// === CARGAR O CREAR lobo_alfa.json ===
if (!fs.existsSync(LOBO_ALFA_PATH)) {
  fs.writeFileSync(LOBO_ALFA_PATH, JSON.stringify({
    id: "",
    nombre: "",
    puntos: 0,
    semana: ""
  }, null, 2));
}

// === GUARDAR PUNTOS Y SUBIR A GITHUB ===
function guardarPuntos() {
  fs.writeFileSync(PUNTOS_PATH, JSON.stringify(puntos, null, 2));
  subirAPuntosGit();
}

function subirAPuntosGit() {
  const { exec } = require('child_process');
  const repoUrl = `https://Shatenjagger:${process.env.GITHUB_TOKEN}@github.com/Shatenjagger/Blackwolf-Trivia-Bot-FINAL.git`;

  // Paso 1: Configurar usuario
  exec('git config --global user.name "BlackWolfBot"', () => {
    exec('git config --global user.email "bot@blackwolfproject.com"', () => {

      // Paso 2: Asegurar que estamos en la rama correcta
      exec('git checkout main', () => {

        // Paso 3: Hacer pull forzado para evitar conflictos
        exec('git fetch origin main && git reset --hard origin/main', () => {

          // Paso 4: Añadir y commitear
          exec('git add puntos.json', () => {
            exec('git commit -m "📊 Actualiza puntos.json"', () => {

              // Paso 5: Forzar el push
              exec(`git push --force ${repoUrl} main`, (pushErr, stdout, stderr) => {
                if (pushErr) {
                  console.error('❌ Error al hacer push:', pushErr);
                  console.error('stderr:', stderr);
                  return;
                }
                console.log('✅ puntos.json subido a GitHub correctamente');
              });
            }, () => {
              // Si no hay cambios, no es error
              console.log('ℹ️ No hay cambios en puntos.json para commitear');
              // Igual intentamos push por si hay otro cambio
              exec(`git push --force ${repoUrl} main`, (err) => {
                if (err) console.error('⚠️ Push sin cambios falló:', err);
              });
            });
          });
        });
      });
    });
  });
}

// === USUARIOS CON TRIVIA ACTIVA (evita múltiples instancias por usuario) ===
const triviaActive = new Set();

// === COMANDO !TRIVIA ===
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  if (msg.content === '!trivia') {
    if (msg.channel.name !== 'trivias-gamer') {
      return msg.reply('Usa este comando en el canal #trivias-gamer.');
    }

    const userId = msg.author.id;
    if (triviaActive.has(userId)) {
      return msg.reply('Ya tienes una trivia activa. Espera a terminarla.');
    }

    triviaActive.add(userId);
    await iniciarTrivia(msg, userId);
  }

  // === COMANDO !LEADERBOARD ===
  if (msg.content === '!leaderboard' || msg.content === '!lb') {
    const ordenados = Object.values(puntos)
      .filter(p => typeof p === 'object')
      .sort((a, b) => b.puntos - a.puntos)
      .slice(0, 10);

    let descripcion = '';
    const niveles = { 1: '🐺', 2: '🥇', 3: '🥈', 4: '🥉' };
    for (let i = 0; i < ordenados.length; i++) {
      const p = ordenados[i];
      const nivel = niveles[i + 1] || '🔹';
      const marca = i === 0 ? ' (Lobo Alfa)' : '';
      descripcion += `${i + 1}. <@${p.id || 'Desconocido'}> — ${p.puntos} pts ${nivel}${marca}\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle('🏆 LEADERBOARD - LOBOS RETRO')
      .setDescription(descripcion || 'Aún no hay puntuaciones.')
      .setColor('#FF6B00')
      .setFooter({ text: `Jugadores: ${ordenados.length}` })
      .setTimestamp();

    msg.channel.send({ embeds: [embed] }).catch(console.error);
  }

  // === COMANDO !LOBOALFA ===
  if (msg.content === '!loboalfa') {
    try {
      const lobo = JSON.parse(fs.readFileSync(LOBO_ALFA_PATH, 'utf8'));
      if (lobo.id === "") {
        msg.reply("Todavía no hay un Lobo Alfa definido. ¡Juega para ser el primero!");
        return;
      }
      msg.reply(
        `🐺 **Lobo Alfa de la semana**\n` +
        `**Nombre:** ${lobo.nombre}\n` +
        `**Puntos:** ${lobo.puntos}\n` +
        `¡Demuestra que puedes superarlo en !trivia!`
      );
    } catch (e) {
      msg.reply("No se pudo cargar al Lobo Alfa.");
    }
  }
});

// === FUNCION PRINCIPAL: INICIAR TRIVIA ===
async function iniciarTrivia(message, userId) {
  let puntaje = (puntos[userId] && puntos[userId].puntos) || 0;
  const userName = message.author.username;

  // Mensajes sarcásticos para "¿continuar?"
  const mensajesSarcasticos = [
    "¿Otra? Vamos, seguro fue suerte la última vez.",
    "¿Seguro que quieres continuar? Tu última correcta solo fue suerte.",
    "¿Otro intento? Tal vez esta vez adivines... o no. Quién sabe.",
    "¿Alooo? ¿Hay alguien ahí?",
    "¿Otra pregunta? ¿Estás seguro? Ojalá no te dé fiebre.",
    "¿Seguimos? O... ¿culpamos a los desarrolladores?",
    "¿Otro intento? No te preocupes, hasta los errores tienen su encanto.",
    "¿Vas a rendirte ya? No te culpo, no todos nacen con talento.",
    "¿Otra? Pensé que ya habías entendido que no eres el más listo de la manada.",
    "¿Vas a demostrar que puedes con más... o solo fingirlo?"
  ];

  let collector = null;
  let timer = null;

  async function mostrarPregunta() {
    const pregunta = preguntas[Math.floor(Math.random() * preguntas.length)];
    const respuestas = [...pregunta.respuestas_incorrectas, pregunta.respuesta_correcta].sort(() => Math.random() - 0.5);
    const respuestaCorrecta = pregunta.respuesta_correcta;

    const embed = new EmbedBuilder()
      .setTitle('❓ ¡Trivia Retro!')
      .setDescription(pregunta.pregunta)
      .setColor('#FFD700')
      .setFooter({ text: `Tienes 15 segundos | Puntos: ${puntaje}` });

    const row = new ActionRowBuilder();
    respuestas.forEach((op, i) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`btn_${i}_${userId}`)
          .setLabel(op.length > 25 ? op.slice(0, 22) + '...' : op)
          .setStyle(ButtonStyle.Primary)
      );
    });

    const msg = await message.channel.send({
      content: `<@${userId}>`,
      embeds: [embed],
      components: [row]
    }).catch(err => {
      console.error('❌ Error al enviar pregunta:', err);
      message.reply('Hubo un error al iniciar la trivia.');
      triviaActive.delete(userId);
    });

    if (!msg) return;

    let tiempoRestante = 15;
    let respondida = false;

    // Limpiar temporizador anterior
    if (timer) clearInterval(timer);

    timer = setInterval(() => {
      tiempoRestante--;
      if (respondida) return clearInterval(timer);

      if (tiempoRestante <= 0) {
        clearInterval(timer);
        if (collector) collector.stop();
        // ✅ Solo edita el mensaje, NO llama a preguntarContinuar
        msg.edit({
          content: `⏱️ Tiempo terminado. La respuesta era: **${respuestaCorrecta}**`,
          embeds: [],
          components: []
        }).catch(() => {});
        // El puntaje y la pregunta se manejan en collector.on('end')
      } else {
        const descripcionConPista = tiempoRestante <= 5
          ? `${pregunta.pregunta}\n💡 **Pista:** ${pregunta.pista}`
          : pregunta.pregunta;

        msg.edit({
          content: `<@${userId}>`,
          embeds: [{
            title: '❓ ¡Trivia Retro!',
            description: descripcionConPista,
            color: tiempoRestante <= 5 ? 0x00ffff : 0xFFD700,
            footer: { text: `Tienes ${tiempoRestante} segundos | Puntos: ${puntaje}` }
          }],
          components: [row]
        }).catch(() => {});
      }
    }, 1000);

    // Limpiar colector anterior
    if (collector) collector.stop();

    collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === userId,
      time: 15_000
    });

    collector.on('collect', async (i) => {
      respondida = true;
      clearInterval(timer);
      collector.stop();

      const seleccionada = respuestas[parseInt(i.customId.split('_')[1])];
      const esCorrecta = seleccionada === respuestaCorrecta;

      if (esCorrecta) {
        puntaje += 10;
        try {
          await i.update({
            content: `✅ ¡Correcto! +10 puntos para ${userName}`,
            embeds: [],
            components: []
          });
        } catch (error) {
          if (error.code !== 10062) console.error('❌ Error al actualizar:', error);
        }

        // ✅ Continuar automáticamente tras respuesta correcta
        setTimeout(() => {
          mostrarPregunta();
        }, 1500);
      } else {
        puntaje = Math.max(0, puntaje - 5);
        try {
          await i.update({
            content: `❌ Incorrecto. La respuesta era: **${respuestaCorrecta}**`,
            embeds: [],
            components: []
          });
        } catch (error) {
          if (error.code !== 10062) console.error('❌ Error al actualizar:', error);
        }

        puntos[userId] = { id: userId, nombre: userName, puntos: puntaje };
        guardarPuntos();
        setTimeout(preguntarContinuar, 1000);
      }
    });

    // ✅ ÚNICA llamada a preguntarContinuar() → aquí
    collector.on('end', collected => {
      if (!collected.size && !respondida) {
        puntaje = Math.max(0, puntaje - 5);
        puntos[userId] = { id: userId, nombre: userName, puntos: puntaje };
        guardarPuntos();
        setTimeout(preguntarContinuar, 1000);
      }
    });

    function preguntarContinuar() {
      const embedContinuar = new EmbedBuilder()
        .setTitle('🤔 ¿Deseas continuar?')
        .setDescription(mensajesSarcasticos[Math.floor(Math.random() * mensajesSarcasticos.length)])
        .setColor('#00ffff')
        .setFooter({ text: '9 segundos para responder' });

      const rowContinuar = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`continuar_si_${userId}`)
          .setLabel('Sí')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`continuar_no_${userId}`)
          .setLabel('No')
          .setStyle(ButtonStyle.Danger)
      );

      message.channel.send({
        content: `<@${userId}>`,
        embeds: [embedContinuar],
        components: [rowContinuar]
      }).then(msgCont => {
        let tiempo = 9;
        const contador = setInterval(() => {
          tiempo--;
          if (tiempo < 0) {
            clearInterval(contador);
            msgCont.edit({
              embeds: [{
                title: "👋 Adiós, campeón.",
                description: "La trivia se ha detenido.",
                color: 0x808080
              }],
              components: []
            }).catch(() => {});
            triviaActive.delete(userId);
          } else {
            msgCont.edit({
              embeds: [{
                title: '🤔 ¿Deseas continuar?',
                description: embedContinuar.data.description,
                color: 0x00ffff,
                footer: { text: `${tiempo} segundos para responder` }
              }],
              components: [rowContinuar]
            }).catch(() => {});
          }
        }, 1000);

        const col = msgCont.createMessageComponentCollector({ time: 9000 });
        col.on('collect', async (i) => {
          const actionUserId = i.customId.split('_').pop();
          if (actionUserId !== userId) {
            return i.reply({ content: 'No es tu trivia.', ephemeral: true });
          }

          clearInterval(contador);
          if (i.customId.startsWith('continuar_si')) {
            try {
              await i.update({
                embeds: [{
                  title: "🚀 ¡Allá vamos!",
                  description: "Cargando siguiente pregunta...",
                  color: 0x00ff00
                }],
                components: []
              });
            } catch (error) {
              if (error.code !== 10062) console.error('❌ Error al continuar:', error);
            }
            setTimeout(mostrarPregunta, 1500);
          } else {
            try {
              await i.update({
                embeds: [{
                  title: "👋 Hasta la próxima.",
                  color: 0x808080
                }],
                components: []
              });
            } catch (error) {
              if (error.code !== 10062) console.error('❌ Error al detener:', error);
            }
            triviaActive.delete(userId);
          }
        });
      });
    }
  }

  mostrarPregunta();
}

// === SISTEMA LOBO ALFA (cada lunes a las 00:00) ===
const cron = require('node-cron');
cron.schedule('0 0 * * 1', () => {
  const ids = Object.keys(puntos).filter(k => typeof puntos[k] === 'object');
  let maxPuntos = -1;
  let loboAlfa = null;

  for (const id of ids) {
    if (puntos[id].puntos > maxPuntos) {
      maxPuntos = puntos[id].puntos;
      loboAlfa = { id, ...puntos[id] };
    }
  }

  if (loboAlfa) {
    const data = { ...loboAlfa, semana: new Date().toLocaleDateString('en-CA') };
    fs.writeFileSync(LOBO_ALFA_PATH, JSON.stringify(data, null, 2));
    console.log(`🏆 Nuevo Lobo Alfa: ${loboAlfa.nombre} (${loboAlfa.puntos} pts)`);

    const guild = client.guilds.cache.first();
    if (guild) {
      const member = guild.members.cache.get(loboAlfa.id);
      const rol = guild.roles.cache.find(r => r.name === "Lobo Alfa");
      if (member && rol) {
        member.roles.add(rol).catch(console.error);
      }
      const channel = guild.channels.cache.find(ch => ch.name === 'trivias-gamer');
      if (channel) {
        channel.send(
          `🐺 **¡Nuevo Lobo Alfa de la semana!**\n` +
          `El jugador más fuerte es **${loboAlfa.nombre}** con **${loboAlfa.puntos} puntos**.\n` +
          `¡Desafíalo en !trivia!`
        );
      }
    }
  }
});

// === LEADERBOARD AUTOMÁTICO CADA 12H ===
cron.schedule('0 */12 * * *', () => {
  const guild = client.guilds.cache.first();
  if (!guild) return;

  const channel = guild.channels.cache.find(ch => ch.name === 'trivias-gamer');
  if (!channel) return;

  const ordenados = Object.values(puntos)
    .filter(p => typeof p === 'object')
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, 10);

  let descripcion = '';
  const niveles = { 1: '🐺', 2: '🥇', 3: '🥈', 4: '🥉' };
  for (let i = 0; i < ordenados.length; i++) {
    const p = ordenados[i];
    const nivel = niveles[i + 1] || '🔹';
    const marca = i === 0 ? ' (Lobo Alfa)' : '';
    descripcion += `${i + 1}. <@${p.id || 'Desconocido'}> — ${p.puntos} pts ${nivel}${marca}\n`;
  }

  const embed = new EmbedBuilder()
    .setTitle('🏆 LEADERBOARD - LOBOS RETRO')
    .setDescription(descripcion || 'No hay jugadores aún.')
    .setColor('#FF6B00')
    .setFooter({ text: 'Actualizado cada 12 horas' })
    .setTimestamp();

  channel.send({ embeds: [embed] });
});

// === INICIAR BOT ===
client.on('ready', () => {
  console.log(`✅ Bot listo: ${client.user.tag}`);
});

client.login(process.env.TOKEN);