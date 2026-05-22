
const { Client } = require('discord.js-selfbot-v13');

async function testVoice(token, channelId, targetUserId) {
    const client = new Client({ checkUpdate: false });
    const { joinVoiceChannel, VoiceConnectionStatus, createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice');
    const { createDiscordJSAdapter } = require('../voiceAdapter');

    client.on('error', (err) => console.error(`🔴 Client Error: ${err.message}`));

    client.on('ready', async () => {
        console.log(`✅ Diagnostic Bot Online: ${client.user.tag}`);

        try {
            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (!channel || !channel.isVoice()) {
                console.error('❌ Channel not found!');
                return;
            }

            console.log(`🔊 Joining ${channel.name} (Modern Engine - Encrypted)...`);

            const conn = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: createDiscordJSAdapter(channel),
                selfMute: false,
                selfDeaf: false,
                group: client.user.id
            });

            conn.on('stateChange', (oldS, newS) => {
                console.log(`🔄 Connection State: ${oldS.status} -> ${newS.status}`);
            });

            conn.once(VoiceConnectionStatus.Ready, () => {
                console.log('📡 Voice Connection READY! (DAVE / AEAD_AES256_GCM)');

                const receiver = conn.receiver;
                console.log('👂 Subscribing to target user...');

                const stream = receiver.subscribe(targetUserId, { mode: 'opus' });
                stream.on('data', (chunk) => {
                    process.stdout.write(`📦 PACKET RECEIVED: ${chunk.length} bytes             \r`);
                });

                stream.on('error', (e) => console.error(`⚠️ Stream Error: ${e.message}`));
            });

        } catch (e) {
            console.error(`❌ Error: ${e.message}`);
        }
    });

    client.login(token).catch(e => console.error(`❌ Login failed: ${e.message}`));
}

// Read args from process
const [, , token, cid, tid] = process.argv;
if (!token || !cid || !tid) {
    console.log('Usage: node voice-diag.js <token> <channelId> <targetUserId>');
} else {
    testVoice(token, cid, tid);
}
