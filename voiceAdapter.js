
// voiceAdapter.js
// A bridge between discord.js-selfbot-v13 and @discordjs/voice to support modern encryption (DAVE)

/**
 * Creates a Discord.js gateway adapter for @discordjs/voice.
 * @param {import('discord.js-selfbot-v13').VoiceChannel} channel The voice channel to join.
 */
function createDiscordJSAdapter(channel) {
    return (methods) => {
        const adapter = {
            sendPayload(payload) {
                if (channel.guild.shard) {
                    channel.guild.shard.send(payload);
                    return true;
                }
                return false;
            },
            destroy() {
                return methods.destroy();
            },
        };

        const onRaw = (packet) => {
            if (packet.t === 'VOICE_SERVER_UPDATE') {
                if (packet.d.guild_id === channel.guild.id) {
                    methods.onVoiceServerUpdate(packet.d);
                }
            } else if (packet.t === 'VOICE_STATE_UPDATE') {
                if (packet.d.guild_id === channel.guild.id && packet.d.user_id === channel.client.user.id) {
                    methods.onVoiceStateUpdate(packet.d);
                }
            }
        };

        channel.client.on('raw', onRaw);

        // Cleanup listener when destroyed
        adapter.onDispose = () => {
            channel.client.removeListener('raw', onRaw);
        };

        return adapter;
    };
}

module.exports = { createDiscordJSAdapter };
