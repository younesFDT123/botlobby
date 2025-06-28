require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('lobby')
    .setDescription('Erstellt eine neue Lobby.')
    .addStringOption(option =>
      option.setName('map')
        .setDescription('Wähle die Map')
        .setRequired(true)
        .addChoices(
          { name: 'Mirror Park', value: 'Mirror Park' },
          { name: 'Sandy', value: 'Sandy' },
          { name: '5001', value: '5001' }
        ))
    .addStringOption(option =>
      option.setName('modus')
        .setDescription('Boden oder Auto?')
        .setRequired(true)
        .addChoices(
          { name: 'Boden', value: 'Boden' },
          { name: 'Auto', value: 'Auto' }
        ))
    .addStringOption(option =>
      option.setName('team')
        .setDescription('Teamgröße wählen')
        .setRequired(true)
        .addChoices(
          { name: '1vs1', value: '1vs1' },
          { name: '2vs2', value: '2vs2' },
          { name: '3vs3', value: '3vs3' },
          { name: '4vs4', value: '4vs4' },
          { name: '5vs5', value: '5vs5' },
          { name: '6vs6', value: '6vs6' }
        ))
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🚀 Slash Commands werden registriert...');

    // Global registrieren (kann bis zu 1 Stunde dauern)
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    // Für Tests (schneller): Pro Server registrieren
    /*
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    */

    console.log('✅ Slash Commands erfolgreich registriert!');
  } catch (error) {
    console.error('❌ Fehler beim Registrieren der Commands:', error);
  }
})();


