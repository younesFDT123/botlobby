require('dotenv').config();
const express = require('express');
const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ComponentType,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot ist online!');
});

app.listen(PORT, () => {
  console.log(`Webserver läuft auf Port ${PORT}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
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

    const rollenPing = '<@&1388296883159437382>'; // Die Rolle wird gepingt
    const msg = await lobbyChannel.send({
      content: rollenPing,
      embeds: [embed],
      components: [row]
    });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30 * 60 * 1000 });

    let angenommen = false;

    collector.on('collect', async i => {
      if (i.customId === 'annehmen') {
        if (angenommen) {
          return i.reply({ content: '❌ Diese Lobby wurde bereits angenommen.', ephemeral: true });
        }
        angenommen = true;

        await i.deferUpdate();

        embed.setTitle('🎮 Lobby angenommen')
          .setDescription(`<@${interaction.user.id}> vs <@${i.user.id}>`)
          .setFooter({ text: 'Das Ticket wurde erstellt.' });

        await msg.edit({ embeds: [embed], components: [] });

        const category = interaction.guild.channels.cache.find(c => c.name.toLowerCase() === 'lobby suche' && c.type === ChannelType.GuildCategory);
        if (!category) return i.followUp({ content: '❌ Kategorie "Lobby Suche" nicht gefunden.', ephemeral: true });

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
          content: `Willkommen <@${interaction.user.id}> & <@${i.user.id}>!\nNutze den Button unten, um das Ticket zu schließen.`,
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
      }
    });
  }
});

client.login(process.env.TOKEN);
