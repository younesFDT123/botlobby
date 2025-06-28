// ✅ ENV-Variablen laden
require('dotenv').config();

// ✅ Webserver für Replit & UptimeRobot
const express = require('express');
const app = express();
app.get('/', (req, res) => {
  res.send('✅ Bot läuft!');
});
app.listen(3000, () => {
  console.log('🌐 Webserver läuft auf Port 3000');
});

// ✅ Discord-Bot Start
const {
  Client,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ComponentType,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once('ready', () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'lobby') {
    const map = interaction.options.getString('map');
    const mode = interaction.options.getString('modus');
    const teams = interaction.options.getString('team');

    const embed = new EmbedBuilder()
      .setTitle('🎮 Neue Lobby erstellt')
      .setColor(0x2ecc71)
      .setThumbnail('https://cdn.discordapp.com/attachments/1263943643346239619/1387888063807492267/image.png')
      .addFields(
        { name: '📍 Map', value: map, inline: true },
        { name: '🚗 Modus', value: mode, inline: true },
        { name: '⚔️ Teamgröße', value: teams, inline: true },
        { name: '🎟️ Host', value: `<@${interaction.user.id}>`, inline: false },
      )
      .setFooter({ text: 'Klicke auf den Button, um anzunehmen.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('annehmen')
        .setLabel('✅ Annehmen')
        .setStyle(ButtonStyle.Success),
    );

    const lobbyChannel = interaction.guild.channels.cache.find(c => c.name === 'lobby-suche');
    if (!lobbyChannel) return interaction.reply({ content: '❌ Channel "lobby-suche" nicht gefunden.', ephemeral: true });

    await interaction.reply({ content: '✅ Lobby erfolgreich erstellt!', ephemeral: true });

    const msg = await lobbyChannel.send({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30 * 60 * 1000 });

    let accepted = false;

    collector.on('collect', async i => {
      if (i.customId === 'annehmen' && !accepted) {
        accepted = true;

        const category = interaction.guild.channels.cache.find(c => c.name.toLowerCase() === 'lobby suche' && c.type === ChannelType.GuildCategory);
        if (!category) return i.reply({ content: '❌ Kategorie "Lobby Suche" nicht gefunden.', ephemeral: true });

        const ticketChannel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
              id: interaction.user.id,
              allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
            },
            {
              id: i.user.id,
              allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
            },
          ],
        });

        const closeBtn = new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('🔒 Ticket schließen')
          .setStyle(ButtonStyle.Danger);

        const closeRow = new ActionRowBuilder().addComponents(closeBtn);

        await ticketChannel.send({
          content: `🎮 **${interaction.user.username}** vs **${i.user.username}**\nWillkommen <@${interaction.user.id}> & <@${i.user.id}>!\nNutze den Button unten, um das Ticket zu schließen.`,
          components: [closeRow],
        });

        const inactivityTimer = setTimeout(() => {
          ticketChannel.send('⏰ Ticket wurde wegen Inaktivität geschlossen.').then(() => {
            ticketChannel.delete().catch(() => {});
          });
        }, 30 * 60 * 1000);

        const btnCollector = ticketChannel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60 * 60 * 1000 });

        btnCollector.on('collect', async btn => {
          if (btn.customId === 'close_ticket') {
            if (btn.user.id !== interaction.user.id && !btn.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
              return btn.reply({ content: '❌ Nur der Lobby-Ersteller oder ein Admin kann das Ticket schließen.', ephemeral: true });
            }

            await btn.reply('🔒 Ticket wird geschlossen...');
            ticketChannel.delete().catch(() => {});
          }
        });

        // Button deaktivieren
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('annehmen')
            .setLabel('✅ Bereits angenommen')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        );

        await msg.edit({ components: [disabledRow] });
      }
    });
  }
});

client.login(process.env.TOKEN);
