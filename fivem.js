require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.TOKEN;

const SERVERS = {
    'idp': { name: 'IndoPride', url: 'http://kota2.indopride.id:30120', color: 0x00BFFF, emoji: '🏙️' },
    'ime': { name: 'iMe Roleplay',        url: 'http://main.imeroleplay.com:30120', color: 0xFF4500, emoji: '🎮' },
};

async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await axios.get(url, { timeout: 15000 });
            return res;
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

client.once('ready', () => {
    console.log(`Bot online sebagai ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!find')) return;

    const args = message.content.split(' ').slice(1);

    if (args.length < 2) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Format Salah')
            .setDescription('**Usage:** `!find <server> <nama>`')
            .addFields({ name: 'Server Tersedia', value: '`idp` — IndoPride (Kota 2)\n`ime` — iMe Roleplay' })
            .addFields({ name: 'Contoh', value: '`!find idp gp`\n`!find ime ht`' })
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    const serverKey = args[0].toLowerCase();
    const keyword = args.slice(1).join(' ').toLowerCase().trim();
    const server = SERVERS[serverKey];

    if (!server) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Server Tidak Ditemukan')
            .setDescription(`Server **"${serverKey}"** tidak ada.`)
            .addFields({ name: 'Server Tersedia', value: '`idp` — IndoPride (Kota 2)\n`ime` — iMe Roleplay' })
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    const loadingEmbed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('🔍 Mencari player...')
        .setDescription(`Lagi nyari **${keyword}** di ${server.emoji} ${server.name}`)
        .setTimestamp();

    const waitingMessage = await message.reply({ embeds: [loadingEmbed] });

    try {
        const res = await fetchWithRetry(`${server.url}/players.json`);
        const players = Array.isArray(res.data) ? res.data : [];
        const matched = players.filter(p => p.name?.toLowerCase().startsWith(keyword));

        if (matched.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(`${server.emoji} ${server.name}`)
                .setDescription(`Ga ada player dengan nama berawalan **"${keyword}"**`)
                .addFields({ name: '📊 Statistik', value: `**0** player ditemukan dengan nama berawalan **"${keyword}"**` })
                .setTimestamp();
            return waitingMessage.edit({ embeds: [embed] });
        }

        let list = matched.map(p => `\`${p.id}\` ${p.name}`).join('\n');
        if (list.length > 1800) list = list.slice(0, 1800) + '\n... (terpotong)';

        const embed = new EmbedBuilder()
            .setColor(server.color)
            .setTitle(`${server.emoji} ${server.name}`)
            .setDescription(`Player dengan nama berawalan **${keyword}**\n\n${list}`)
            .addFields({ name: '📊 Statistik', value: `**${matched.length}** player **${keyword}**` })
            .setTimestamp();

        await waitingMessage.edit({ embeds: [embed] });

    } catch (error) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Error')
            .setDescription(`\`${error.message}\``)
            .setTimestamp();
        await waitingMessage.edit({ embeds: [embed] });
    }
});

client.login(TOKEN);