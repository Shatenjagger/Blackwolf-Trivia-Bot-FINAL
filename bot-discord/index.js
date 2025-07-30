require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Cargar preguntas
const preguntasPath = path.join(__dirname, '../trivia-datos/blackwolf_preguntas_videojuegos.json');
const preguntas = JSON.parse(fs.readFileSync(preguntasPath, 'utf-8'));
console.log(`✅ Cargadas ${preguntas.length} preguntas`);

// Archivo de puntos
const puntosPath = path.join(__dirname, '../data/puntos.json');
let puntos = {};
if (fs.existsSync(puntosPath)) {
  puntos = JSON.parse(fs.readFileSync(puntosPath, 'utf-8'));
}

// Usuarios con trivia activa
const triviaActive = new Set();

client.once('ready', () => {
  console.log(`✅ Bot listo: ${client.user.tag}`);
  const canalId = process.env.CANAL_ID;
  const canal = client.channels.cache.get(canalId);

  if (!canal) {
    console.warn('⚠️ Canal no encontrado. Verifica el ID.');
    return;
  }

  const publicarLeaderboard = () => {
    const sorted = Object.entries(puntos).sort((a, b) => b[1] - a[1]);
    const lista = sorted.length > 0
      ? sorted.slice(0, 10).map(([id, pts], i) => {
          const nivel = i === 0 ? '🐺 **Lobo Alfa**' : `${i+1}. <@${id}> — ${pts} pts`;
          return `**${nivel}**`;
        }).join('\n')
      : 'Aún no hay puntuaciones.';

    const embed = new EmbedBuilder()
      .setTitle('📢 LEADERBOARD - LOBOS RETRO')
      .setDescription(lista)
      .setColor(0x00ffff)
      .setFooter({ text: 'Actualizado cada 12h' })
      .setTimestamp();

    canal.send({ content: '🐺 **Top 10 Lobos Retro**', embeds: [embed] }).catch(console.error);
  };

  setTimeout(publicarLeaderboard, 5000);
  setInterval(publicarLeaderboard, 12 * 60 * 60 * 1000);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!trivia') {
    if (message.channel.name !== 'trivias-gamer') {
      return message.reply('Usa este comando en #trivias-gamer');
    }

    const userId = message.author.id;
    if (triviaActive.has(userId)) {
      return message.reply('Ya tienes una trivia activa');
    }

    triviaActive.add(userId);
    iniciarTrivia(message, userId);
  }

  if (message.content === '!leaderboard' || message.content === '!lb') {
    const sorted = Object.entries(puntos).sort((a, b) => b[1] - a[1]);
    const lista = sorted.length > 0
      ? sorted.slice(0, 10).map(([id, pts], i) => `**${i+1}.** <@${id}> — ${pts} pts`).join('\n')
      : 'Aún no hay puntuaciones.';

    const embed = new EmbedBuilder()
      .setTitle('🐺 LEADERBOARD - LOBOS RETRO')
      .setDescription(lista)
      .setColor(0xff69b4)
      .setFooter({ text: `Jugadores: ${sorted.length}` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] }).catch(console.error);
  }
});

function iniciarTrivia(message, userId) {
  let puntaje = puntos[userId] || 0;
  let preguntaIndex = 0;

  const preguntasFiltradas = [...preguntas];

  function mostrarPregunta() {
    if (preguntaIndex >= preguntasFiltradas.length) {
      message.channel.send('🏆 ¡Trivia completada!').catch(console.error);
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

    const opciones = [...pregunta.respuestas_incorrectas, pregunta.respuesta_correcta].sort(() => Math.random() - 0.5);
    const row = new ActionRowBuilder();
    opciones.forEach((op, i) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`btn_${i}_${userId}`)
          .setLabel(op.length > 25 ? op.slice(0, 22) + '...' : op)
          .setStyle(ButtonStyle.Secondary)
      );
    });

    message.channel.send({ content: `<@${userId}>`, embeds: [embed], components: [row] })
      .then(msg => {
        const collector = msg.createMessageComponentCollector({ time: 30_000 });
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
                    tiempoRestante === 15
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

        collector.on('collect', async i => {
          if (i.user.id !== userId) return i.reply({ content: 'No es tu trivia.', ephemeral: true });
          respondida = true;
          clearInterval(timer);
          collector.stop();
          const respuestaSeleccionada = opciones[parseInt(i.customId.split('_')[1])];
          const esCorrecta = respuestaSeleccionada === pregunta.respuesta_correcta;

          if (esCorrecta) {
            puntaje += 10;
            await i.update({
              embeds: [
                new EmbedBuilder()
                  .setTitle('✅ ¡Correcto!')
                  .setDescription('+10 puntos.')
                  .setColor(0x00ff00)
              ],
              components: []
            });
          } else {
            puntaje = Math.max(0, puntaje - 5);
            await i.update({
              embeds: [
                new EmbedBuilder()
                  .setTitle('❌ Incorrecto')
                  .setDescription(`La respuesta era: **${pregunta.respuesta_correcta}**. -5 puntos.`)
                  .setColor(0xff0000)
              ],
              components: []
            });
          }

          puntos[userId] = puntaje;
          fs.writeFileSync(puntosPath, JSON.stringify(puntos, null, 2));
          setTimeout(preguntarContinuar, 1000);
        });
      })
      .catch(err => {
        console.error('❌ Error al iniciar trivia:', err);
        triviaActive.delete(userId);
      });

    function preguntarContinuar() {
      const mensajes = [
        "¿Otra? Vamos, seguro fue suerte la última vez.",
        "¿Seguro que quieres continuar?",
        "¿Alooo? ¿Hay alguien ahí?"
      ];
      const embed = new EmbedBuilder()
        .setTitle('🤔 ¿Continuar?')
        .setDescription(mensajes[Math.floor(Math.random() * mensajes.length)])
        .setColor(0x00ffff)
        .setFooter({ text: '9s para decidir' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('continuar_si').setLabel('Sí').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('continuar_no').setLabel('No').setStyle(ButtonStyle.Danger)
      );

      message.channel.send({ content: `<@${userId}>`, embeds: [embed], components: [row] })
        .then(msgCont => {
          let tiempo = 9;
          const contador = setInterval(() => {
            tiempo--;
            if (tiempo < 0) {
              clearInterval(contador);
              msgCont.edit({ embeds: [{ title: "👋 Adiós.", color: 0x808080 }], components: [] });
              triviaActive.delete(userId);
            } else {
              msgCont.edit({ embeds: [embed.setFooter({ text: `${tiempo}s para decidir` })], components: [row] });
            }
          }, 1000);
        });
    }
  }

  mostrarPregunta();
}

client.login(process.env.DISCORD_TOKEN);