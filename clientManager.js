// clientManager.js
const { Client } = require('discord.js-selfbot-v13');
const { getAccountsWithRooms, getSetting } = require('./db');

class ClientManager {
  constructor() {
    this.clients = new Map(); // Map<accountId, client>
    this.ready = false;
  }

  async initialize() {
    if (this.ready) return this.clients;

    const accounts = await getAccountsWithRooms();
    if (accounts.length > 0) {
      console.log(`\x1b[36m🚀 Initializing ${accounts.length} accounts in background...\x1b[0m`);
      // Start all in parallel but don't await them here to not block the main menu
      accounts.forEach(account => this.startClient(account));
    }

    this.ready = true;
    return this.clients;
  }

  async startClient(account) {
    // Check if already exists to avoid duplicates
    if (this.clients.has(account.id)) return;

    const captchaKey = await getSetting('2captcha_key');
    const clientOptions = {
      checkUpdate: false,
      partials: ['MESSAGE', 'REACTION', 'USER']
    };

    if (captchaKey) {
      clientOptions.captchaService = '2captcha';
      clientOptions.captchaKey = captchaKey;
    }

    const client = new Client(clientOptions);
    const label = account.label || `Account #${account.id}`;

    const setupReady = async () => {
      // process.stdout.write(`\x1b[32m[LOGIN] ${label.padEnd(10)} ✔ Online          \x1b[0m\n`);
      if (account.voiceChannelId) {
        await this.joinChannel(client, account);
      }
    };

    client.once('ready', setupReady);

    client.on('error', (err) => {
      console.error(`[${label}] Error:`, err.message || err);
    });

    client.on('voiceStateUpdate', async (oldState, newState) => {
      if (client._isWatching) return;

      // Only re-join if we were actually IN a channel and now we are NOT, and we have an assignment
      if (oldState.member.id === client.user.id && oldState.channelId && !newState.channelId && account.voiceChannelId) {
        console.log(`\x1b[33m[REJOIN] ${label} disconnected. Waiting 5s...\x1b[0m`);
        setTimeout(() => this.joinChannel(client, account), 5000);
      }
    });

    try {
      await client.login(account.token);
      this.clients.set(account.id, client);

      // If login resolved but ready event didn't fire yet (rare in some versions)
      if (client.readyAt && !client.voice?.connection) {
        // This might be redundant but safe
      }
    } catch (e) {
      console.error(`[${label}] Login failed: ${e.message || e}`);
    }
  }

  async joinChannel(client, account, fast = false) {
    const label = account.label || `Account #${account.id}`;
    const channelId = account.voiceChannelId;

    if (!channelId) return;

    try {
      if (!client.readyAt) return;

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isVoice()) return;

      const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');
      const { createDiscordJSAdapter } = require('./voiceAdapter');

      const delay = fast ? 100 : (Math.floor(Math.random() * 3000) + 1000);
      await new Promise(r => setTimeout(r, delay));

      process.stdout.write(`\x1b[36m[VOICE] ${label.padEnd(10)} ➜ Connecting to ${channel.name} (Modern)...\x1b[0m\r`);

      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: createDiscordJSAdapter(channel),
        selfMute: !!account.selfMute,
        selfDeaf: !!account.selfDeaf,
        group: client.user.id
      });

      // Wait for connection to be ready (or timeout after 10s)
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(connection); // Return anyway, don't crash
        }, 10000);

        connection.once(VoiceConnectionStatus.Ready, () => {
          clearTimeout(timeout);
          console.log(`\x1b[32m[VOICE] ${label.padEnd(10)} ✔ Joined ${channel.name} (Encrypted)         \x1b[0m`);
          resolve(connection);
        });

        connection.on('error', (err) => {
          console.error(`\x1b[31m[VOICE] ${label} Error: ${err.message}\x1b[0m`);
        });
      });
    } catch (err) {
      console.error(`[${label}] Failed to join channel ${channelId}:`, err.message || err);
    }
  }

  async runBots(accountIds = null, channelOverride = null) {
    const accounts = await getAccountsWithRooms();
    const selected = accountIds
      ? accounts.filter(a => accountIds.includes(a.id))
      : accounts;

    console.log(`🤖 Running ${selected.length} bots...`);

    await Promise.all(selected.map(async (account) => {
      let client = this.getClientById(account.id);
      if (!client) {
        await this.startClient(account);
        client = this.getClientById(account.id);
      }

      if (client) {
        const botData = channelOverride ? { ...account, voiceChannelId: channelOverride } : account;
        if (client.readyAt) {
          await this.joinChannel(client, botData);
        } else {
          client.once('ready', () => this.joinChannel(client, botData));
        }
      }
    }));
  }

  getClientById(id) {
    return this.clients.get(id);
  }

  getAllClients() {
    return [...this.clients.values()];
  }

  async updateProfile(accountId, { username, avatar, bio, displayName }) {
    let client = this.getClientById(accountId);
    if (!client) {
      // Try to start the client if not found
      const accounts = await getAccountsWithRooms();
      const account = accounts.find(a => a.id === accountId);
      if (!account) {
        throw new Error(`Account ${accountId} not found.`);
      }
      await this.startClient(account);
      client = this.getClientById(accountId);
      if (!client) {
        throw new Error(`Failed to start client for account ${accountId}.`);
      }
    }

    // Wait for client to be ready
    if (!client.readyAt) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Account ${accountId} failed to become ready within timeout.`));
        }, 30000); // 30 second timeout

        client.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });

        client.once('error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Account ${accountId} encountered error: ${error.message}`));
        });
      });
    }

    try {
      if (username) {
        await client.user.setUsername(username);
        console.log(`✅ Updated username for account ${accountId} to: ${username}`);
      }

      if (avatar) {
        await client.user.setAvatar(avatar);
        console.log(`✅ Updated avatar for account ${accountId}`);
      }

      if (bio !== undefined) {
        await client.user.setAboutMe(bio);
        console.log(`✅ Updated bio for account ${accountId}`);
      }

      if (displayName !== undefined) {
        await client.user.setGlobalName(displayName);
        console.log(`✅ Updated display name for account ${accountId}`);
      }
    } catch (error) {
      if (error.message.includes('CAPTCHA')) {
        const captchaKey = await getSetting('2captcha_key');
        if (!captchaKey) {
          throw new Error(`Discord requested a CAPTCHA and NO API Key was found. Please go to "Settings" in the Main Menu and set your 2Captcha API Key.`);
        } else {
          throw new Error(`Discord requested a CAPTCHA. An API Key is SET, but Discord or 2Captcha rejected the request. Check your 2Captcha balance or restart the bots.`);
        }
      }
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  async deleteAllMessages(channelId, accountId = null) {
    let client;

    if (accountId) {
      client = this.getClientById(accountId);
      if (!client) {
        // Try to start the client if not found
        const accounts = await getAccountsWithRooms();
        const account = accounts.find(a => a.id === accountId);
        if (!account) {
          throw new Error(`Account ${accountId} not found.`);
        }
        await this.startClient(account);
        client = this.getClientById(accountId);
        if (!client) {
          throw new Error(`Failed to start client for account ${accountId}.`);
        }
      }
    } else {
      // Use first available client
      const clients = this.getAllClients();
      if (clients.length === 0) {
        throw new Error('No clients available. Please specify an account or ensure accounts are initialized.');
      }
      client = clients[0];
    }

    // Wait for client to be ready
    if (!client.readyAt) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Client failed to become ready within timeout.'));
        }, 30000);

        client.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });

        client.once('error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Client encountered error: ${error.message}`));
        });
      });
    }

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isText()) {
        throw new Error('Channel not found or is not a text channel.');
      }

      console.log(`🗑️ Starting to delete messages in ${channel.name}...`);

      let deletedCount = 0;
      let fetchedCount = 0;
      let lastMessageId = null;
      const batchSize = 100;

      while (true) {
        let messages;
        try {
          // Fetch messages in batches
          messages = await channel.messages.fetch({
            limit: batchSize,
            before: lastMessageId
          });
        } catch (e) {
          console.log(`⚠️ Fetch error: ${e.message}. Retrying in 5 seconds...`);
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }

        if (messages.size === 0) {
          console.log(`🏁 Reached the end of message history.`);
          break;
        }

        fetchedCount += messages.size;
        console.log(`🔍 Fetched ${messages.size} messages (Total examined: ${fetchedCount}). Total deleted: ${deletedCount}`);

        // Filter messages that can be deleted
        const deletableMessages = messages.filter(msg =>
          msg.author.id === client.user.id ||
          channel.permissionsFor(client.user)?.has('MANAGE_MESSAGES')
        );

        if (deletableMessages.size > 0) {
          try {
            const hasManageMessages = channel.permissionsFor(client.user)?.has('MANAGE_MESSAGES');

            if (hasManageMessages) {
              const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
              const bulkDeletable = deletableMessages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
              const oldMessages = deletableMessages.filter(msg => msg.createdTimestamp <= twoWeeksAgo);

              if (bulkDeletable.size >= 2) {
                try {
                  await channel.bulkDelete(bulkDeletable, true);
                  deletedCount += bulkDeletable.size;
                  console.log(`   ✅ Bulk deleted ${bulkDeletable.size} messages.`);
                } catch (e) {
                  console.log(`   ⚠️ Bulk delete failed, switching to individual: ${e.message}`);
                  for (const msg of bulkDeletable.values()) {
                    await msg.delete().catch(() => { });
                    deletedCount++;
                    await new Promise(r => setTimeout(r, 1000));
                  }
                }
              } else if (bulkDeletable.size === 1) {
                await bulkDeletable.first().delete().catch(() => { });
                deletedCount++;
              }

              for (const msg of oldMessages.values()) {
                try {
                  await msg.delete();
                  deletedCount++;
                  if (deletedCount % 10 === 0) console.log(`   🗑️ Total deleted so far: ${deletedCount}`);
                  await new Promise(resolve => setTimeout(resolve, 1100));
                } catch (e) {
                  if (e.message.includes('Rate limit')) {
                    console.log(`   ⏳ Rate limited. Waiting 10s...`);
                    await new Promise(r => setTimeout(r, 10000));
                  }
                }
              }
            } else {
              // Delete only own messages
              for (const msg of deletableMessages.values()) {
                if (msg.author.id === client.user.id) {
                  try {
                    await msg.delete();
                    deletedCount++;
                    if (deletedCount % 10 === 0) console.log(`   🗑️ Deleted ${deletedCount} of your messages...`);
                    await new Promise(resolve => setTimeout(resolve, 1100));
                  } catch (e) {
                    if (e.message.includes('Rate limit')) await new Promise(r => setTimeout(r, 5000));
                  }
                }
              }
            }
          } catch (error) {
            console.log(`⚠️ Error in deletion batch: ${error.message}`);
          }
        }

        // Update ID for next fetch (oldest ID in current batch)
        lastMessageId = messages.last().id;

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      console.log(`✅ Finished! Total messages deleted: ${deletedCount} out of ${fetchedCount} examined.`);

    } catch (error) {
      throw new Error(`Failed to delete messages: ${error.message}`);
    }
  }
}

module.exports = new ClientManager();