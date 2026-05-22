#!/usr/bin/env node
const { Select, Input, MultiSelect, Toggle } = require('enquirer');
const cli = require('./cli');
const { colors, log, fetchAccountProfile } = require('./utils');
const clientManager = require('./clientManager');
const db = require('./db');
const fs = require('fs');
const sodium = require('libsodium-wrappers');

// Initialize sodium for voice encryption/decryption
sodium.ready.then(() => {
  log('🛡️ Voice encryption (libsodium) initialized.', colors.dim);
});

// Prevent the process from crashing due to internal Discord library errors
process.on('uncaughtException', (err) => {
  if (err.message?.includes('WebSocket') || err.message?.includes('closed') || err.code === 'ERR_UNHANDLED_ERROR') {
    return; // Ignore internal voice/websocket cleanup errors
  }
  log(`Critical Error: ${err.message}`, colors.red);
});

process.on('unhandledRejection', (reason) => {
  // Silent ignore for internal library rejections
});

async function gracefulExit() {
  log('\n👋 Gracefully shutting down...', colors.cyan);
  const clients = clientManager.getAllClients();
  if (clients.length > 0) {
    log(`🛑 Stopping ${clients.length} bots...`, colors.dim);
    for (const client of clients) {
      try {
        if (client.voice?.connection) {
          client.voice.connection.disconnect();
        }
        client.destroy();
      } catch (e) { }
    }
  }
  process.exit(0);
}

process.on('SIGINT', gracefulExit);
process.on('SIGTERM', gracefulExit);

const banner = `
${colors.cyan}${colors.bright}
  ██╗   ██╗███████╗██╗  ██╗███████╗
  ██║   ██║██╔════╝╚██╗██╔╝██╔════╝
  ██║   ██║█████╗   ╚███╔╝ █████╗  
  ╚██╗ ██╔╝██╔══╝   ██╔██╗ ██╔══╝  
   ╚████╔╝ ███████╗██╔╝ ██╗███████╗
    ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝
${colors.reset}
  ${colors.dim}Premium Discord Manager - Arrow Key Navigation${colors.reset}
`;

async function mainMenu() {
  console.clear();
  console.log(banner);

  const prompt = new Select({
    name: 'action',
    message: 'Main Menu',
    choices: [
      { name: 'run_bots', message: '🚀 Run Bots' },
      { name: 'stop_bots', message: '🛑 Stop Bots' },
      { name: 'watch_user', message: '👀 Watch User' },
      { name: 'manage_accounts', message: '👤 Manage Accounts' },
      { name: 'manage_rooms', message: '🏠 Manage Rooms' },
      { name: 'delete_messages', message: '🗑️ Delete Messages' },
      { name: 'edit_profile', message: '✏️ Edit Profile' },
      { name: 'voice_mirror', message: '🎙️ Voice Copying (Mirror)' },
      { name: 'settings', message: '⚙️ Settings' },
      { name: 'exit', message: '❌ Exit' }
    ]
  });

  try {
    const action = await prompt.run();
    await handleAction(action);
  } catch (err) {
    if (err === '' || (err && err.message === 'cancel')) {
      await gracefulExit();
      return;
    }
    log(`Error: ${err.message || err}`, colors.red);
    await pause();
    await mainMenu();
  }
}

async function handleAction(action) {
  switch (action) {
    case 'run_bots':
      await runBotsMenu();
      break;
    case 'stop_bots':
      await stopBotsAction();
      break;
    case 'watch_user':
      await watchUserMenu();
      break;
    case 'manage_accounts':
      await accountsMenu();
      break;
    case 'manage_rooms':
      await roomsMenu();
      break;
    case 'delete_messages':
      await deleteMessagesMenu();
      break;
    case 'edit_profile':
      await editProfileMenu();
      break;
    case 'voice_mirror':
      await voiceCopyMenu();
      break;
    case 'settings':
      await settingsMenu();
      break;
    case 'exit':
      log('Goodbye! 👋', colors.cyan);
      process.exit(0);
  }
  await pause();
  await mainMenu();
}

async function pause() {
  const prompt = new Input({
    message: 'Press Enter to return',
  });
  try {
    await prompt.run();
  } catch (e) {
    if (e === '' || (e && e.message === 'cancel')) throw e;
  }
}

async function runBotsMenu() {
  const accounts = await db.getAccountsWithRooms();
  if (accounts.length === 0) {
    log('❌ No accounts found. Please add accounts first.', colors.red);
    return;
  }

  const choices = accounts.map(a => ({
    name: a.id.toString(),
    message: `${a.username || a.label} ${colors.dim}(Room: ${a.roomName || 'None'})${colors.reset}`
  }));

  const prompt = new MultiSelect({
    name: 'selected',
    message: 'Select accounts (Space to select)',
    choices: [{ name: 'all', message: '🌟 All Accounts' }, ...choices]
  });

  let selected = await prompt.run();

  if (selected.length === 0) {
    log('ℹ No accounts selected, defaulting to all accounts.', colors.dim);
    selected = ['all'];
  }

  const ids = selected.includes('all') ? null : selected.map(id => parseInt(id));

  log('🚀 Starting bots...', colors.cyan);
  await clientManager.runBots(ids);
  log('✅ Bots are running in background.', colors.green);
}

async function stopBotsAction() {
  const clients = clientManager.getAllClients();
  if (clients.length === 0) {
    log('ℹ️ No bots are currently running.', colors.yellow);
    return;
  }

  for (const client of clients) {
    if (client.voice?.connection) {
      client.voice.connection.disconnect();
    }
    client.destroy();
  }
  log(`✅ Stopped ${clients.length} bots.`, colors.green);
}

async function watchUserMenu() {
  const userIdPrompt = new Input({
    message: 'Enter User ID to watch:',
    validate: value => /^\d{17,19}$/.test(value.trim()) || 'Invalid User ID'
  });

  let userId, selected, selfMute, selfDeaf, mimicMessages, mimicEmojis, mimicVoice, speed, accounts;
  try {
    userId = (await userIdPrompt.run()).trim();

    accounts = await db.getAccountsWithRooms();
    if (accounts.length === 0) {
      log('❌ No accounts found.', colors.red);
      return;
    }

    const choices = accounts.map(a => ({
      name: a.id.toString(),
      message: a.username || a.label
    }));

    const prompt = new MultiSelect({
      name: 'selected',
      message: 'Select accounts for watching (Space to select)',
      choices: [{ name: 'all', message: '🌟 All Accounts' }, ...choices]
    });

    selected = await prompt.run();

    // If nothing is selected, default to all accounts
    if (selected.length === 0) {
      log('ℹ No accounts selected, defaulting to all accounts.', colors.dim);
      selected = ['all'];
    }

    selfMute = await new Toggle({ message: 'Join Muted?', enabled: 'Yes', disabled: 'No' }).run();
    selfDeaf = await new Toggle({ message: 'Join Deafened?', enabled: 'Yes', disabled: 'No' }).run();
    mimicMessages = await new Toggle({ message: 'Mimic messages?', enabled: 'Yes', disabled: 'No' }).run();
    mimicEmojis = await new Toggle({ message: 'Mimic emojis?', enabled: 'Yes', disabled: 'No' }).run();
    mimicVoice = await new Toggle({ message: 'Mimic voice (Echo)?', enabled: 'Yes', disabled: 'No' }).run();

    speed = await new Select({
      name: 'speed',
      message: 'Mimic Speed',
      choices: [
        { name: 'lightning', message: '⚡ Lightning (Instant)' },
        { name: 'fast', message: '🚀 Fast (0.2s - 0.5s)' },
        { name: 'normal', message: '🚶 Normal (1s - 2s)' },
        { name: 'realistic', message: '🎭 Realistic (2s - 5s)' }
      ]
    }).run();
  } catch (e) { return; }

  const ids = selected.includes('all') ? null : selected.map(id => parseInt(id));

  if (mimicVoice && selfDeaf) {
    log('⚠️ Voice mimic requires bots to NOT be deafened. Disabling self-deaf.', colors.yellow);
  }
  if (mimicVoice && selfMute) {
    log('⚠️ Voice mimic requires bots to NOT be muted. Disabling self-mute.', colors.yellow);
  }

  log(`👀 Setting up watchers for user ${userId} [Speed: ${speed}${mimicVoice ? ', Echo: ON' : ''}]...`, colors.magenta);

  const targetAccounts = ids ? accounts.filter(a => ids.includes(a.id)) : accounts;

  await Promise.all(targetAccounts.map(async (account) => {
    let client = clientManager.getClientById(account.id);
    if (!client) {
      log(`🔄 Starting bot ${account.username || account.id}...`, colors.dim);
      await clientManager.runBots([account.id]);
      client = clientManager.getClientById(account.id);
    }

    if (client) {
      // Disable auto-home-join
      client._isWatching = true;

      // Clean up previous watchers
      if (client._watchers) {
        for (const w of client._watchers) {
          (w.target || client).off(w.event, w.listener);
        }
      }
      client._watchers = [];
      client._echoStream = null;

      const setupVoiceEcho = async (conn) => {
        if (!conn || !mimicVoice) return;

        const {
          createAudioPlayer,
          createAudioResource,
          StreamType,
          AudioPlayerStatus,
          EndBehaviorType
        } = require('@discordjs/voice');

        const startMirroring = () => {
          if (client._activeMirrorPlayer) return;

          try {
            const player = createAudioPlayer();
            const stream = conn.receiver.subscribe(userId, {
              mode: 'opus',
              end: { behavior: EndBehaviorType.AfterInactivity, duration: 1000 }
            });

            const resource = createAudioResource(stream, { inputType: StreamType.Opus });
            player.play(resource);
            conn.subscribe(player);

            client._activeMirrorPlayer = player;

            player.on(AudioPlayerStatus.Idle, () => {
              if (client._activeMirrorPlayer === player) client._activeMirrorPlayer = null;
              player.stop();
            });

            player.on('error', (err) => {
              log(`❌ ${client.user.tag} player error: ${err.message}`, colors.red);
              if (client._activeMirrorPlayer === player) client._activeMirrorPlayer = null;
              player.stop();
            });

            log(`✅ ${client.user.tag}: Mirror active! (DAVE compatible)`, colors.green);
          } catch (e) {
            log(`❌ ${client.user.tag} mirror setup error: ${e.message}`, colors.red);
          }
        };

        const { VoiceConnectionStatus } = require('@discordjs/voice');
        conn.on(VoiceConnectionStatus.Disconnected, () => {
          if (client._activeMirrorPlayer) client._activeMirrorPlayer.stop();
          client._activeMirrorPlayer = null;
        });

        // Re-trigger on every speaking event for maximum reliability
        // Using receiver speaking map is more reliable in modern @discordjs/voice
        if (conn.receiver.speaking) {
          conn.receiver.speaking.on('start', (uid) => {
            if (uid === userId) startMirroring();
          });
        } else {
          // Fallback for some self-bot library versions
          conn.on('speaking', (u) => {
            if ((u.id || u) === userId) startMirroring();
          });
        }

        // Initial try
        startMirroring();
      };

      const joinWatchedUser = async (channel) => {
        if (!channel) return;

        // Prevent duplicate joins, but update status if needed
        if (client.voice.connection?.channel?.id === channel.id) {
          if (mimicVoice) {
            setupVoiceEcho(client.voice.connection);
          }
          return;
        }

        log(`🏃 ${client.user.tag}: Joining user in ${channel.name}...`, colors.dim);
        try {
          const conn = await clientManager.joinChannel(client, {
            ...account,
            voiceChannelId: channel.id,
            selfMute: mimicVoice ? false : selfMute,
            selfDeaf: mimicVoice ? false : selfDeaf
          }, true);

          if (conn && mimicVoice) {
            setupVoiceEcho(conn);
          }
        } catch (e) {
          log(`❌ ${client.user.tag} join error: ${e.message}`, colors.red);
        }
      };

      const checkNow = async () => {
        for (const guild of client.guilds.cache.values()) {
          const vs = guild.voiceStates.cache.get(userId);
          if (vs?.channel) {
            await joinWatchedUser(vs.channel);
            return true;
          }
        }
        return false;
      };

      const voiceListener = async (oldState, newState) => {
        const tid = newState.member?.id || newState.id;
        if (tid !== userId) return;

        if (newState.channel) {
          await joinWatchedUser(newState.channel);
        } else if (oldState.channel) {
          log(`👋 ${client.user.tag}: User left voice.`, colors.dim);
          const { getVoiceConnection } = require('@discordjs/voice');
          const conn = getVoiceConnection(oldState.guild.id, client.user.id);
          if (conn) conn.destroy();
        }
      };

      client.on('voiceStateUpdate', voiceListener);
      client._watchers.push({ event: 'voiceStateUpdate', listener: voiceListener });

      if (mimicMessages) {
        const messageListener = async (msg) => {
          if (msg.author.id !== userId) return;

          let delay = 0;
          let showTyping = false;

          switch (speed) {
            case 'lightning':
              delay = Math.floor(Math.random() * 100);
              showTyping = false;
              break;
            case 'fast':
              delay = Math.floor(Math.random() * 300) + 200;
              showTyping = true;
              break;
            case 'normal':
              delay = Math.floor(Math.random() * 1000) + 1000;
              showTyping = true;
              break;
            case 'realistic':
              delay = Math.floor(Math.random() * 3000) + 2000;
              showTyping = true;
              break;
          }

          try {
            if (showTyping) {
              await msg.channel.sendTyping();
            }

            if (delay > 0) {
              await new Promise(r => setTimeout(r, delay));
            }

            const sendOptions = { files: [] };

            // Handle Attachments (Images, Videos, Files)
            if (msg.attachments.size > 0) {
              sendOptions.files = msg.attachments.map(a => ({
                attachment: a.proxyURL || a.url,
                name: a.name
              }));
            }

            // Handle Stickers
            if (msg.stickers.size > 0) {
              // Note: Most self-bots can only send stickers they own or are global, 
              // but we'll try to mimic the IDs.
              sendOptions.stickers = msg.stickers.map(s => s.id);
            }

            if (msg.reference) {
              sendOptions.reply = { messageReference: msg.reference.messageId, failIfNotExists: false };
            }

            if (msg.content || sendOptions.files.length > 0 || (sendOptions.stickers && sendOptions.stickers.length > 0)) {
              await msg.channel.send(msg.content || '', sendOptions);
              log(`📝 ${client.user.tag}: Mimicked message in ${msg.channel.name} ${sendOptions.files.length > 0 ? '(with files)' : ''}`, colors.dim);
            }
          } catch (e) {
            log(`❌ ${client.user.tag} mimic msg error: ${e.message}`, colors.red);
          }
        };
        client.on('messageCreate', messageListener);
        client._watchers.push({ event: 'messageCreate', listener: messageListener });
      }

      if (mimicEmojis) {
        const reactionListener = async (reaction, user) => {
          if (user.id !== userId) return;

          try {
            // Handle partials if necessary
            if (reaction.partial) await reaction.fetch();

            await reaction.message.react(reaction.emoji);
            log(`✨ ${client.user.tag}: Mimicked reaction on message`, colors.dim);
          } catch (e) {
            // Ignore reaction errors (e.g. no permission)
          }
        };
        client.on('messageReactionAdd', reactionListener);
        client._watchers.push({ event: 'messageReactionAdd', listener: reactionListener });
      }

      if (client.readyAt) {
        await checkNow();
      } else {
        client.once('ready', async () => {
          await new Promise(r => setTimeout(r, 2000));
          await checkNow();
        });
      }
    }
  }));
  log('✅ Watchers established. Use "Stop Bots" to clear.', colors.green);
}

async function accountsMenu() {
  const prompt = new Select({
    message: 'Account Management',
    choices: [
      { name: 'list', message: '📋 List Accounts' },
      { name: 'add', message: '➕ Add Account' },
      { name: 'import', message: '📂 Import Tokens' },
      { name: 'assign', message: '🔗 Assign to Room' },
      { name: 'remove', message: '🗑️ Remove Account' },
      { name: 'back', message: '⬅️ Back' }
    ]
  });

  const action = await prompt.run();
  if (action === 'back') return;

  switch (action) {
    case 'list': {
      const accounts = await db.listAccounts();
      if (accounts.length === 0) log('ℹ️ No accounts found.', colors.yellow);
      else console.table(accounts.map(a => ({ ID: a.id, Name: a.username || a.label, Room: a.roomName || 'None' })));
      break;
    }
    case 'add': {
      const token = await new Input({ message: 'Enter Discord Token:' }).run();
      try {
        log('🔍 Fetching profile...', colors.dim);
        const profile = await fetchAccountProfile(token);
        const id = await db.createAccount({
          label: profile.tag,
          token,
          userId: profile.userId,
          username: profile.username
        });
        log(`✅ Added: ${profile.tag} (ID: ${id})`, colors.green);
      } catch (e) {
        log(`❌ Error: ${e.message}`, colors.red);
      }
      break;
    }
    case 'import': {
      const file = await new Input({ message: 'File path:', initial: 'tokens.txt' }).run();
      if (!fs.existsSync(file)) {
        log('❌ File not found', colors.red);
        break;
      }
      const tokens = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(line => line.trim());
      log(`📂 Importing ${tokens.length} tokens...`, colors.cyan);
      for (const t of tokens) {
        try {
          const profile = await fetchAccountProfile(t.trim());
          await db.createAccount({ label: profile.tag, token: t.trim(), userId: profile.userId, username: profile.username });
          log(` ✅ Imported: ${profile.tag}`, colors.green);
        } catch (e) { log(` ❌ Failed token: ${t.slice(0, 10)}...`, colors.red); }
      }
      break;
    }
    case 'assign': {
      const accounts = await db.listAccounts();
      if (accounts.length === 0) { log('ℹ️ No accounts available.', colors.yellow); break; }

      const rooms = await db.listRooms();

      const accountChoice = await new Select({
        message: 'Select account to assign:',
        choices: accounts.map(a => ({ name: a.id.toString(), message: a.username || a.label }))
      }).run();

      const roomChoices = [
        { name: 'null', message: '❌ None (Unassign)' },
        ...rooms.map(r => ({ name: r.id.toString(), message: r.name }))
      ];

      const roomChoice = await new Select({
        message: 'Select room:',
        choices: roomChoices
      }).run();

      const roomId = roomChoice === 'null' ? null : parseInt(roomChoice);
      try {
        await db.assignAccountToRoom(parseInt(accountChoice), roomId);
        log('✅ Account assigned successfully.', colors.green);
      } catch (e) {
        log(`❌ Error: ${e.message}`, colors.red);
      }
      break;
    }
    case 'remove': {
      const accounts = await db.listAccounts();
      if (accounts.length === 0) { log('No accounts to remove.', colors.yellow); break; }
      const choices = accounts.map(a => ({ name: a.id.toString(), message: a.username || a.label }));
      const selected = await new Select({ message: 'Select account to remove', choices }).run();
      if (await db.removeAccount(parseInt(selected))) log('✅ Account removed', colors.green);
      break;
    }
  }
  await pause();
  await accountsMenu();
}

async function roomsMenu() {
  const prompt = new Select({
    message: 'Room Management',
    choices: [
      { name: 'list', message: '📋 List Rooms' },
      { name: 'add', message: '➕ Add Room' },
      { name: 'remove', message: '🗑️ Remove Room' },
      { name: 'back', message: '⬅️ Back' }
    ]
  });

  const action = await prompt.run();
  if (action === 'back') return;

  switch (action) {
    case 'list': {
      const rooms = await db.listRooms();
      if (rooms.length === 0) log('ℹ️ No rooms found.', colors.yellow);
      else console.table(rooms.map(r => ({ ID: r.id, Name: r.name, ChannelID: r.voiceChannelId })));
      break;
    }
    case 'add': {
      const channelId = await new Input({
        message: 'Voice Channel ID:',
        validate: v => /^\d{17,19}$/.test(v.trim()) || 'Invalid ID'
      }).run();

      let finalName = '';
      const clients = clientManager.getAllClients();

      if (clients.length > 0) {
        log('🔍 Fetching channel name from Discord...', colors.cyan);
        for (const client of clients) {
          try {
            const channel = await client.channels.fetch(channelId.trim());
            if (channel && channel.isVoice()) {
              finalName = channel.name;
              log(`✨ Found channel: ${colors.bright}${finalName}${colors.reset}`, colors.green);
              break;
            }
          } catch (e) { /* try next client */ }
        }
      }

      if (!finalName) {
        if (clients.length === 0) {
          log('ℹ️ No bots are running to fetch name automatically.', colors.yellow);
        } else {
          log('⚠️ Could not fetch channel name (ID might be wrong or no shared servers).', colors.yellow);
        }
        finalName = await new Input({ message: 'Enter Room Name manually:', validate: v => v.length > 0 }).run();
      } else {
        const confirmName = await new Toggle({
          message: `Use name "${finalName}"?`,
          enabled: 'Yes',
          disabled: 'No'
        }).run();

        if (!confirmName) {
          finalName = await new Input({ message: 'Enter custom name:', initial: finalName }).run();
        }
      }

      try {
        const id = await db.createRoom({ name: finalName, voiceChannelId: channelId.trim() });
        log(`✅ Room "${finalName}" created and stored with ID ${id}`, colors.green);
      } catch (e) { log(`❌ Error: ${e.message}`, colors.red); }
      break;
    }
    case 'remove': {
      const rooms = await db.listRooms();
      if (rooms.length === 0) { log('No rooms to remove.', colors.yellow); break; }
      const choices = rooms.map(r => ({ name: r.id.toString(), message: r.name }));
      const selected = await new Select({ message: 'Select room to remove', choices }).run();
      if (await db.removeRoom(parseInt(selected))) log('✅ Room removed', colors.green);
      break;
    }
  }
  await pause();
  await roomsMenu();
}

async function deleteMessagesMenu() {
  const channelIdPrompt = new Input({
    message: 'Enter Channel ID to delete messages from:',
    validate: value => /^\d{17,19}$/.test(value.trim()) || 'Invalid Channel ID'
  });

  const channelId = (await channelIdPrompt.run()).trim();

  const accounts = await db.getAccountsWithRooms();
  if (accounts.length === 0) {
    log('❌ No accounts found. Please add accounts first.', colors.red);
    return;
  }

  const choices = accounts.map(a => ({
    name: a.id.toString(),
    message: `${a.username || a.label} ${colors.dim}(ID: ${a.id})${colors.reset}`
  }));

  const prompt = new Select({
    name: 'accountId',
    message: 'Select account to delete messages with:',
    choices: [{ name: 'first', message: '🌟 Use First Available Account' }, ...choices]
  });

  const selected = await prompt.run();
  const accountId = selected === 'first' ? null : parseInt(selected);

  const confirmPrompt = new Toggle({
    message: `⚠️ This will delete ALL messages in the channel. Are you sure?`,
    enabled: 'Yes, Delete',
    disabled: 'Cancel'
  });

  const confirmed = await confirmPrompt.run();
  if (!confirmed) {
    log('❌ Operation cancelled.', colors.yellow);
    return;
  }

  try {
    log('🔄 Initializing deletion process...', colors.cyan);
    await clientManager.deleteAllMessages(channelId, accountId);
    log('✅ Message deletion completed successfully.', colors.green);
  } catch (err) {
    log(`❌ Error: ${err.message}`, colors.red);
  }
}

async function editProfileMenu() {
  const accounts = await db.listAccounts();
  if (accounts.length === 0) {
    log('ℹ️ No accounts found.', colors.yellow);
    return;
  }

  const accountChoice = await new Select({
    message: 'Select account to edit profile:',
    choices: accounts.map(a => ({ name: a.id.toString(), message: a.username || a.label }))
  }).run();

  const accountId = parseInt(accountChoice);
  const account = accounts.find(a => a.id === accountId);

  const editChoices = [
    { name: 'username', message: '👤 Change Username (Real @ID)' },
    { name: 'displayName', message: '📛 Change Display Name (Visible Name)' },
    { name: 'avatar', message: '🖼️ Change Avatar (URL)' },
    { name: 'bio', message: '📝 Change Bio/About Me' },
    { name: 'back', message: '⬅️ Back' }
  ];

  const editChoice = await new Select({
    message: `Editing profile for ${account.username || account.label}:`,
    choices: editChoices
  }).run();

  if (editChoice === 'back') return;

  try {
    if (editChoice === 'username') {
      const newUsername = await new Input({ message: 'Enter new username:', initial: account.username }).run();
      if (!newUsername) return;
      log('⏳ Updating username...', colors.cyan);
      await clientManager.updateProfile(accountId, { username: newUsername });
      await db.updateAccount(accountId, { username: newUsername });
      log('✅ Username updated successfully!', colors.green);
    } else if (editChoice === 'displayName') {
      const newDisplayName = await new Input({ message: 'Enter new display name:', initial: account.username }).run();
      if (!newDisplayName) return;
      log('⏳ Updating display name...', colors.cyan);
      await clientManager.updateProfile(accountId, { displayName: newDisplayName });
      log('✅ Display name updated successfully!', colors.green);
    } else if (editChoice === 'avatar') {
      const newAvatar = await new Input({ message: 'Enter avatar image URL (or local path):' }).run();
      if (!newAvatar) return;
      log('⏳ Updating avatar...', colors.cyan);
      await clientManager.updateProfile(accountId, { avatar: newAvatar });
      log('✅ Avatar updated successfully!', colors.green);
    } else if (editChoice === 'bio') {
      const newBio = await new Input({ message: 'Enter new bio (About Me):' }).run();
      log('⏳ Updating bio...', colors.cyan);
      await clientManager.updateProfile(accountId, { bio: newBio });
      log('✅ Bio updated successfully!', colors.green);
    }
  } catch (err) {
    log(`❌ Error: ${err.message}`, colors.red);
  }
}

async function settingsMenu() {
  const currentKey = await db.getSetting('2captcha_key');

  const prompt = new Select({
    message: 'Global Settings',
    choices: [
      { name: 'captcha', message: `🔑 Set 2Captcha API Key ${currentKey ? '(Already Set)' : '(Not Set)'}` },
      { name: 'back', message: '⬅️ Back' }
    ]
  });

  const action = await prompt.run();
  if (action === 'back') return;

  if (action === 'captcha') {
    const key = await new Input({
      message: 'Enter 2Captcha API Key:',
      initial: currentKey || ''
    }).run();

    if (key) {
      await db.setSetting('2captcha_key', key.trim());
      log(`✅ 2Captcha Key saved! Please restart the bots to apply changes.`, colors.green);
    }
  }
}

async function voiceCopyMenu() {
  const userIdPrompt = new Input({
    message: 'Enter User ID to copy voice from:',
    validate: value => /^\d{17,19}$/.test(value.trim()) || 'Invalid User ID'
  });

  let userId;
  try {
    userId = (await userIdPrompt.run()).trim();
  } catch (e) { return; }

  const accounts = await db.getAccountsWithRooms();
  if (accounts.length === 0) {
    log('❌ No accounts found.', colors.red);
    return;
  }

  const choices = accounts.map(a => ({
    name: a.id.toString(),
    message: a.username || a.label
  }));

  const prompt = new MultiSelect({
    name: 'selected',
    message: 'Select accounts for copying (Space to select):',
    choices: [{ name: 'all', message: '🌟 All Accounts' }, ...choices]
  });

  let selected;
  try {
    selected = await prompt.run();
  } catch (e) { return; }

  if (selected.length === 0) selected = ['all'];
  const ids = selected.includes('all') ? null : selected.map(id => parseInt(id));
  const targetAccounts = ids ? accounts.filter(a => ids.includes(a.id)) : accounts;

  log(`🎙️ Voice Copying (Mirror) activated for user ${userId}...`, colors.magenta);

  await Promise.all(targetAccounts.map(async (account) => {
    let client = clientManager.getClientById(account.id);
    if (!client) {
      log(`🔄 Starting bot ${account.username || account.id}...`, colors.dim);
      await clientManager.runBots([account.id]);
      client = clientManager.getClientById(account.id);
    }

    if (client) {
      client._isWatching = true;

      // Clean up previous watchers
      if (client._voiceCopyWatchers) {
        for (const w of client._voiceCopyWatchers) {
          (w.target || client).off(w.event, w.listener);
        }
      }
      client._voiceCopyWatchers = [];
      client._activeEchoStream = null;

      const setupEcho = async (conn) => {
        if (!conn) return;

        const {
          createAudioPlayer,
          createAudioResource,
          StreamType,
          AudioPlayerStatus,
          EndBehaviorType
        } = require('@discordjs/voice');

        log(`🔍 ${client.user.tag}: Initializing mirror (Modern Engine)...`, colors.dim);

        const startMirroring = () => {
          if (client._activeMirrorPlayer) return;

          try {
            const player = createAudioPlayer();
            const receiver = conn.receiver;

            const { PassThrough } = require('stream');
            const bridge = new PassThrough({ highWaterMark: 1024 * 512 });

            const subscribeAndPipe = () => {
              try {
                const stream = conn.receiver.subscribe(userId, {
                  mode: 'pcm',
                  end: { behavior: EndBehaviorType.AfterInactivity, duration: 2000 }
                });
                stream.pipe(bridge, { end: false });
              } catch (e) { }
            };

            const resource = createAudioResource(bridge, {
              inputType: StreamType.Raw,
              sampleRate: 48000
            });

            player.play(resource);
            conn.subscribe(player);

            subscribeAndPipe();
            const refreshInterval = setInterval(subscribeAndPipe, 15000);

            client._activeMirrorPlayer = player;
            client._activeEchoStream = null;
            client._bridge = bridge;

            const cleanup = (reason) => {
              clearInterval(refreshInterval);
              if (client._activeMirrorPlayer === player) {
                player.stop();
                bridge.destroy();
                client._activeMirrorPlayer = null;
                log(`🛑 ${client.user.tag}: Mirror stopped (${reason}).`, colors.yellow);
              }
            };

            player.on('error', (err) => {
              log(`❌ ${client.user.tag} mirror error: ${err.message}`, colors.red);
              cleanup('error');
            });

            log(`✅ ${client.user.tag}: Mirror active! (Encrypted Relay)`, colors.green);

          } catch (e) {
            log(`❌ ${client.user.tag} mirror setup error: ${e.message}`, colors.red);
          }
        };

        startMirroring();
      };

      const mirrorLogic = async (oldState, newState) => {
        const tid = newState.member?.id || newState.id;
        if (tid !== userId) return;

        if (newState.channel) {
          log(`🏃 ${client.user.tag}: Joining ${newState.channel.name} to follow user...`, colors.dim);
          try {
            const conn = await clientManager.joinChannel(client, {
              ...account,
              voiceChannelId: newState.channel.id,
              selfMute: false,
              selfDeaf: false
            }, true);

            if (conn) setupEcho(conn);
          } catch (e) {
            log(`❌ ${client.user.tag} join failed: ${e.message}`, colors.red);
          }
        } else if (oldState.channel) {
          log(`👋 ${client.user.tag}: User left. Resetting bot.`, colors.dim);
          const { getVoiceConnection } = require('@discordjs/voice');
          const conn = getVoiceConnection(oldState.guild.id, client.user.id);
          if (conn) conn.destroy();
        }
      };

      client.on('voiceStateUpdate', mirrorLogic);
      client._voiceCopyWatchers.push({ event: 'voiceStateUpdate', listener: mirrorLogic });

      // Check current state
      let targetChannel = null;
      for (const guild of client.guilds.cache.values()) {
        const vs = guild.voiceStates.cache.get(userId);
        if (vs?.channel) {
          targetChannel = vs.channel;
          break;
        }
      }

      if (targetChannel) {
        await mirrorLogic({}, { channel: targetChannel, id: userId, member: { id: userId } });
      } else {
        log(`⏳ ${client.user.tag}: Waiting for user to join voice...`, colors.dim);
      }
    }
  }));
  log('✅ Voice Copying established.', colors.green);
}

async function start() {
  clientManager.initialize().catch(err => {
    log(`⚠️  Background initialization error: ${err.message}`, colors.yellow);
  });
  await mainMenu();
}

start();
