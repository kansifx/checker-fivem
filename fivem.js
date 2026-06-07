require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.TOKEN;

const SERVER = { name: 'INDOPRIDE', url: 'http://kota2.indopride.id:30120' };

client.once('ready', () => {
    console.log(`Bot online sebagai ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!find')) return;

    const keyword = message.content.split(' ').slice(1).join(' ').toLowerCase().trim();

    if (!keyword) {
        return message.reply('Usage: `!find <nama>` — contoh: `!find gp`');
    }

    const waitingMessage = await message.reply(`Lagi nyari **"${keyword}"** di ${SERVER.name}...`);

    try {
        const res = await axios.get(`${SERVER.url}/players.json`, { timeout: 8000 });
        const players = Array.isArray(res.data) ? res.data : [];

        const matched = players.filter(p => p.name?.toLowerCase().startsWith(keyword));

        if (matched.length === 0) {
            return waitingMessage.edit(
                `Ga ketemu player dengan nama berawalan **"${keyword}"** di ${SERVER.name}.\nTotal online: **${players.length}** player`
            );
        }

        let list = matched.map(p => `— (ID: ${p.id}) **${p.name}**`).join('\n');

        if (list.length > 1800) list = list.slice(0, 1800) + '\n... (terpotong)';

        await waitingMessage.edit(
            `Ketemu **${matched.length} player** dengan nama berawalan **"${keyword}"** di ${SERVER.name} (total online: ${players.length}):\n\n${list}\n\nTotal **"${keyword}"**: ${matched.length} orang`
        );

    } catch (error) {
        await waitingMessage.edit(`Error: \`${error.message}\``);
    }
});

client.login(TOKEN);