const { Client, GatewayIntentBits } = require('discord.js');
const https = require('https');
const fs = require('fs'); // Modul bawaan untuk membaca/menulis file database

// === CONFIGURATION ===
// GANTI TOKEN DI BAWAH INI JIKA SUDAH KAMU RESET DI DEVELOPER PORTAL!
const TOKEN = process.env.TOKEN;
const TARGET_CHANNEL_ID = '1512793386199945437'; 
const HISTORY_FILE = 'checked_history.txt'; // Nama file database riwayat kamu

const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
const CONCURRENT_REQUESTS = 30; 
const DELAY_BETWEEN_BATCH = 300; 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let isRunning = false;
let queue = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Fungsi untuk mencatat nama yang TAKEN ke dalam file txt
function saveToHistory(username) {
    fs.appendFileSync(HISTORY_FILE, username + '\n', 'utf8');
}

// Fungsi untuk membaca daftar nama yang sudah pernah dicek
function loadHistory() {
    if (!fs.existsSync(HISTORY_FILE)) {
        return new Set(); // Jika file belum ada, return database kosong
    }
    const fileContent = fs.readFileSync(HISTORY_FILE, 'utf8');
    // Memasukkan riwayat ke dalam struktur 'Set' agar proses pencarian data super instan
    return new Set(fileContent.split('\n').map(name => name.trim()).filter(Boolean));
}

function checkUsername(username, channel) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'discord.com',
            port: 443,
            path: `/users/${username}`,
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        };

        const req = https.request(options, (res) => {
            if (res.statusCode === 404) {
                console.log(`[FOUND] ${username} KOSONG!`);
                channel.send(`⚠️ **JACKPOT! USERNAME KOSONG NEGO HALAL!** ⚠️\n> Username: \`${username}\` beneran kosong! Buruan ganti sekarang! @everyone`);
            } else if (res.statusCode === 200) {
                console.log(`[TAKEN] ${username}`);
                saveToHistory(username); // Masukkan ke riwayat txt agar besok-besok gak dicek lagi
            }
            resolve();
        });
        req.on('error', () => resolve());
        req.end();
    });
}

client.once('ready', () => {
    console.log(`=== Bot ${client.user.tag} Sudah Online! ===`);
    console.log("Ketik !start di server Discord untuk memulai pencarian.");
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Perintah Memulai
    if (message.content === '!start') {
        if (isRunning) return message.reply('Bot-nya kan lagi jalan nyari, sabar dulu kocak! 😤');
        
        isRunning = true;
        
        // 1. Ambil riwayat pengecekan sebelumnya
        const checkedHistory = loadHistory();
        message.reply(`🔄 **Memuat database riwayat...** Sudah ada \`${checkedHistory.size}\` nama yang pernah dicatat & dilewati.`);

        // 2. Generate kombinasi baru
        queue = [];
        let totalGenerated = 0;
        
        for (let i = 0; i < chars.length; i++) {
            for (let j = 0; j < chars.length; j++) {
                for (let k = 0; k < chars.length; k++) {
                    for (let l = 0; l < chars.length; l++) {
                        const username = chars[i] + chars[j] + chars[k] + chars[l];
                        totalGenerated++;
                        
                        // HANYA MASUKKAN KE ANTREAN JIKA BELUM PERNAH DICEK
                        if (!checkedHistory.has(username)) {
                            queue.push(username);
                        }
                    }
                }
            }
        }
        
        if (queue.length === 0) {
            isRunning = false;
            return message.channel.send('🏁 Wah gila, semua kombinasi 4 karakter di dunia ini sudah habis kamu cek semua!');
        }

        // 3. Acak sisa antrean yang belum dicek
        queue = shuffle(queue);
        
        message.channel.send(`🚀 **Pencarian dilanjutkan!** Memeriksa \`${queue.length}\` sisa kombinasi baru dari total ${totalGenerated} variasi secara acak.`);

        const targetChannel = client.channels.cache.get(TARGET_CHANNEL_ID) || message.channel;

        while (queue.length > 0 && isRunning) {
            const batch = queue.splice(0, CONCURRENT_REQUESTS);
            await Promise.all(batch.map(username => checkUsername(username, targetChannel)));
            await sleep(DELAY_BETWEEN_BATCH);
        }
        
        if (!isRunning) {
            targetChannel.send('🛑 Pencarian dihentikan. Semua riwayat sebelum tombol stop ditekan sudah aman tersimpan!');
        } else {
            targetChannel.send('🏁 Semua kombinasi selesai dicek total tanpa sisa!');
            isRunning = false;
        }
    }

    // Perintah Menghentikan
    if (message.content === '!stop') {
        if (!isRunning) return message.reply('Bot-nya emang lagi tidur, gak usah di-stop.');
        isRunning = false;
        message.reply('Siaapp, sistem ngerem total!');
    }
});

client.login(BOT_TOKEN);