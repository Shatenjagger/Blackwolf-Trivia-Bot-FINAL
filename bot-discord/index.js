const express = require('express');
const app = express();

// Para mantener el bot despierto
app.get('/', (req, res) => {
  res.send('🐾 BlackWolf está despierto. Carlos vive.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🟢 Servidor web iniciado en puerto ${PORT}`);
});
// bot-discord/index.js
require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// Crear el cliente del bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// Cargar preguntas
const preguntasPath = path.join(__dirname, '../trivia-datos/blackwolf_preguntas_videojuegos.json');
let preguntas = [];
try {
  preguntas = JSON.parse(fs.readFileSync(preguntasPath, 'utf-8'));
  console.log(`✅ Cargadas ${preguntas.length} preguntas`);
} catch (err) {
  console.error('❌ Error al cargar preguntas:', err);
}

// Archivo de puntos
const puntosPath = path.join(__dirname, '../data/puntos.json');
let puntos = {};
if (fs.existsSync(puntosPath)) {
  try {
    puntos = JSON.parse(fs.readFileSync(puntosPath, 'utf-8'));
  } catch (err) {
    console.error('❌ Error al cargar puntos.json:', err);
  }
}

// Usuarios con trivia activa
const triviaActive = new Set();

// Cuando el bot esté listo
client.once('ready', () => {
  console.log(`✅ Bot listo: ${client.user.tag}`);
  const canalId = process.env.CANAL_ID;
  const canal = client.channels.cache.get(canalId);

  if (!canal?.isTextBased()) {
    console.warn('⚠️ Canal no encontrado o no es de texto. Verifica el ID.');
    return;
  }

  const publicarLeaderboard = () => {
    const sorted = Object.entries(puntos).sort((a, b) => b[1] - a[1]);
    const niveles = { 1: '🐺 **Lobo Alfa**', 2: '🥇', 3: '🥈', 4: '🥉' };
    const lista = sorted.length > 0
      ? sorted.slice(0, 10).map(([id, pts], i) => {
          const nivel = niveles[i + 1] || `🔹 ${i + 1}°`;
          return `**${i + 1}.** <@${id}> — ${pts} pts (${nivel})`;
        }).join('\n')
      : 'Aún no hay puntuaciones. ¡Sé el primero con `!trivia`!';

    const embed = new EmbedBuilder()
      .setTitle('📢 LEADERBOARD - LOBOS RETRO')
      .setDescription(lista)
      .setColor(0x00ffff)
      .setFooter({ text: 'Actualizado cada 12 horas' })
      .setTimestamp();

    canal.send({ content: '🐺 **Top 10 Lobos Retro**', embeds: [embed] }).catch(console.error);
  };

  setTimeout(publicarLeaderboard, 5000);
  setInterval(publicarLeaderboard, 12 * 60 * 60 * 1000);
});

// Escuchar mensajes
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!trivia')) {
    if (message.channel.name !== 'trivias-gamer') {
      return message.reply('Usa este comando en el canal #trivias-gamer.');
    }
    const userId = message.author.id;
    if (triviaActive.has(userId)) {
      return message.reply('Ya tienes una trivia activa. Espera a terminarla.');
    }
    triviaActive.add(userId);
    await iniciarTrivia(message, userId);
  }

  if (message.content === '!leaderboard' || message.content === '!lb') {
    const sorted = Object.entries(puntos).sort((a, b) => b[1] - a[1]);
    const niveles = { 1: '🐺', 2: '🥇', 3: '🥈', 4: '🥉' };
    const lista = sorted.length > 0
      ? sorted.slice(0, 10).map(([id, pts], i) => {
          const nivel = niveles[i + 1] || `🔹`;
          return `**${i + 1}.** <@${id}> — ${pts} pts ${nivel}`;
        }).join('\n')
      : 'Aún no hay puntuaciones.';

    const embed = new EmbedBuilder()
      .setTitle('🐺 LEADERBOARD - LOBOS RETRO')
      .setDescription(lista)
      .setColor(0xff69b4)
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: `Jugadores: ${sorted.length}` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] }).catch(console.error);
  }
});

// Manejar interacciones de botones
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const { customId, user } = interaction;
  const userId = user.id;

  // Validar que el botón sea del usuario correcto
  if (!customId.includes(userId)) {
    return interaction.reply({ content: 'No es tu trivia.', ephemeral: true });
  }

  // Aquí se manejan los botones dentro de la trivia
  // No se hace nada aquí, lo maneja iniciarTrivia
});

// Función para iniciar trivia
async function iniciarTrivia(message, userId) {
  let puntaje = puntos[userId] || 0;
  let preguntaIndex = 0;

  const categoriaActual = 'consolas';
  const nivelActual = 'basico';

  const preguntasFiltradas = preguntas.filter(
    p => p.categoria === categoriaActual && p.nivel === nivelActual
  );

  if (preguntasFiltradas.length === 0) {
    await message.reply(`❌ No hay preguntas para **${categoriaActual} - ${nivelActual}**`);
    triviaActive.delete(userId);
    return;
  }

  async function mostrarPregunta() {
    if (preguntaIndex >= preguntasFiltradas.length) {
      await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🏆 ¡Trivia completada!')
            .setDescription(`¡Felicidades! Terminaste con **${puntaje} puntos**.`)
            .setColor(0xffd700)
        ]
      });
      triviaActive.delete(userId);
      return;
    }

    const pregunta = preguntasFiltradas[preguntaIndex];
    let tiempoRestante = 30;
    let respondida = false;

    const embed = new EmbedBuilder()
      .setTitle(`🎮 Pregunta ${preguntaIndex + 1}`)
      .setDescription(pregunta.pregunta)
      .setColor(0x00ff00)
      .setFooter({ text: `Tiempo: ${tiempoRestante}s | Puntos: ${puntaje}` });

    const opciones = [...pregunta.respuestas_incorrectas, pregunta.respuesta_correcta]
      .sort(() => Math.random() - 0.5);

    const row = new ActionRowBuilder();
    opciones.forEach((op, i) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`btn_${i}_${userId}`)
          .setLabel(op.length > 25 ? op.slice(0, 22) + '...' : op)
          .setStyle(ButtonStyle.Secondary)
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

    const collector = msg.createMessageComponentCollector({ 
      filter: i => {
        if (i.user.id !== userId) {
          i.reply({ content: 'No es tu trivia.', ephemeral: true });
          return false;
        }
        return true;
      },
      time: 30_000 
    });

    const timer = setInterval(() => {
      tiempoRestante--;
      if (respondida) return clearInterval(timer);
      if (tiempoRestante <= 0) {
        clearInterval(timer);
        collector.stop();
        msg.edit({
          embeds: [
            new EmbedBuilder()
              .setTitle('⏰ ¡Se acabó el tiempo!')
              .setDescription(`La respuesta era: **${pregunta.respuesta_correcta}**. -5 puntos.`)
              .setColor(0xffa500)
          ],
          components: []
        }).catch(() => {});
        puntaje = Math.max(0, puntaje - 5);
        puntos[userId] = puntaje;
        fs.writeFileSync(puntosPath, JSON.stringify(puntos, null, 2));
        setTimeout(preguntarContinuar, 1000);
      } else {
        msg.edit({
          embeds: [
            new EmbedBuilder()
              .setTitle(`🎮 Pregunta ${preguntaIndex + 1}`)
            .setDescription(
              tiempoRestante <= 15 && tiempoRestante >= 10
                ? `${pregunta.pregunta}\n\n💡 **Pista:** ${pregunta.pista}`
                : pregunta.pregunta
            )
              .setColor(tiempoRestante === 15 ? 0x00ffff : 0x00ff00)
              .setFooter({ text: `Tiempo: ${tiempoRestante}s | Puntos: ${puntaje}` })
          ],
          components: [row]
        }).catch(() => {});
      }
    }, 1000);

    collector.on('collect', async (i) => {
      if (i.user.id !== userId) return;
      respondida = true;
      clearInterval(timer);
      collector.stop();
      const respuestaSeleccionada = opciones[parseInt(i.customId.split('_')[1])];
      const esCorrecta = respuestaSeleccionada === pregunta.respuesta_correcta;

      if (esCorrecta) {
        puntaje += 10;
        try {
          await i.update({
            embeds: [
              new EmbedBuilder()
                .setTitle('✅ ¡Correcto!')
                .setDescription('+10 puntos.')
                .setColor(0x00ff00)
            ],
            components: []
          });
        } catch (error) {
          if (error.code === 10062) {
            console.log('⚠️ Interacción expirada al responder.');
          } else {
            console.error('❌ Error al actualizar respuesta:', error);
          }
        }
      } else {
        puntaje = Math.max(0, puntaje - 5);
        try {
          await i.update({
            embeds: [
              new EmbedBuilder()
                .setTitle('❌ Incorrecto')
                .setDescription(`La respuesta era: **${pregunta.respuesta_correcta}**. -5 puntos.`)
                .setColor(0xff0000)
            ],
            components: []
          });
        } catch (error) {
          if (error.code === 10062) {
            console.log('⚠️ Interacción expirada al responder.');
          } else {
            console.error('❌ Error al actualizar respuesta:', error);
          }
        }
      }
      puntos[userId] = puntaje;
      fs.writeFileSync(puntosPath, JSON.stringify(puntos, null, 2));
      setTimeout(preguntarContinuar, 1000);
    });

    collector.on('end', collected => {
      if (!collected.size && !respondida) {
        puntaje = Math.max(0, puntaje - 5);
        puntos[userId] = puntaje;
        fs.writeFileSync(puntosPath, JSON.stringify(puntos, null, 2));
        setTimeout(preguntarContinuar, 1000);
      }
    });

    function preguntarContinuar() {
      const mensajes = [
        "¿Otra? Vamos, seguro fue suerte la última vez.",
        "¿Seguro que quieres continuar? Tu última correcta solo fue suerte.",
        "¿Otro intento? Tal vez esta vez adivines... o no. Quién sabe.",
        "¿Alooo? ¿Hay alguien ahí?",
        "¿Otra pregunta? ¿Estás seguro? Ojalá no te dé fiebre.",
        "¿Seguimos? O... ¿culpamos a los desarrolladores?",
        "¿Otro round? No te preocupes, hasta los errores tienen su encanto.",
        "¿Vas a rendirte ya? No te culpo, no todos nacen con talento.",
        "¿Otra? Pensé que ya habías entendido que no eres el más listo de la manada.",
        "¿Vas a demostrar que puedes con más... o solo fingirlo?"
      ];

      const embedContinuar = new EmbedBuilder()
        .setTitle('🤔 ¿Deseas continuar?')
        .setDescription(mensajes[Math.floor(Math.random() * mensajes.length)])
        .setColor(0x00ffff)
        .setFooter({ text: 'Conteo: 9' });

      // ✅ Incluye el userId en el customId
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
      })
      .then(msgCont => {
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
                footer: { text: `Conteo: ${tiempo}` }
              }],
              components: [rowContinuar]
            }).catch(() => {});
          }
        }, 1000);

        // ✅ Colector que valida el userId del customId
        const col = msgCont.createMessageComponentCollector({ time: 9000 });
        col.on('collect', async (i) => {
          // Extrae el userId del customId
          const parts = i.customId.split('_');
          const actionUserId = parts.pop(); // El último es el userId
          const action = parts.join('_');   // El resto es la acción

          // ✅ Valida que el usuario sea el correcto
          if (actionUserId !== userId) {
            return i.reply({ content: 'No es tu trivia.', ephemeral: true });
          }

          clearInterval(contador);

          if (action === 'continuar_si') {
            preguntaIndex++;
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
              if (error.code === 10062) {
                console.log('⚠️ Interacción expirada al continuar.');
              } else {
                console.error('❌ Error al actualizar continuar:', error);
              }
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
              if (error.code === 10062) {
                console.log('⚠️ Interacción expirada al continuar.');
              } else {
                console.error('❌ Error al actualizar continuar:', error);
              }
            }
            triviaActive.delete(userId);
          }
        });
      });
    }}

  mostrarPregunta();
}

// Iniciar el bot
client.login(process.env.DISCORD_TOKEN);
// === SISTEMA LOBO ALFA ===
const cron = require('node-cron');

// Ruta de los archivos
const PUNTOS_FILE = path.join(__dirname, 'puntos.json');
const LOBO_ALFA_FILE = path.join(__dirname, 'lobo_alfa.json');

// Actualiza al Lobo Alfa cada lunes a las 00:00
cron.schedule('0 0 * * 1', () => {
  try {
    const puntos = JSON.parse(fs.readFileSync(PUNTOS_FILE, 'utf8'));
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
      const data = {
        ...loboAlfa,
        semana: new Date().toLocaleDateString('en-CA') // Ej: 2025-07-31
      };
      fs.writeFileSync(LOBO_ALFA_FILE, JSON.stringify(data, null, 2));
      console.log(`🏆 Lobo Alfa actualizado: ${loboAlfa.nombre} (${loboAlfa.puntos} pts)`);

      // Opcional: asignar rol en Discord
      const guild = client.guilds.cache.first();
      if (guild) {
        const member = guild.members.cache.get(loboAlfa.id);
        const rol = guild.roles.cache.find(r => r.name === "Lobo Alfa");
        if (member && rol) {
          member.roles.add(rol)
            .then(() => console.log(`✅ Rol asignado a ${member.displayName}`))
            .catch(console.error);
        }
      }

      // Anunciar en el servidor
      const channel = guild.channels.cache.find(ch => ch.name === 'trivias-gamer');
      if (channel) {
        channel.send(
          `🐺 **¡Nuevo Lobo Alfa de la semana!**\n` +
          `El jugador más fuerte es **${loboAlfa.nombre}** con **${loboAlfa.puntos} puntos**.\n` +
          `¡Desafíalo en !trivia!`
        );
      }
    }
  } catch (err) {
    console.error('❌ Error actualizando Lobo Alfa:', err);
  }
});

// Comando: !loboalfa
client.on('messageCreate', msg => {
  if (msg.content === '!loboalfa') {
    try {
      const lobo = JSON.parse(fs.readFileSync(LOBO_ALFA_FILE, 'utf8'));
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
      msg.reply("No se pudo cargar al Lobo Alfa. Asegúrate de que el sistema ya haya corrido una semana.");
    }
  }
});