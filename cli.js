#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const {
  createAccount,
  createRoom,
  listAccounts,
  listRooms,
  updateAccount,
  assignAccountToRoom,
  removeAccount,
  removeRoom,
  getAccountsWithRooms,
  createDatabase,
} = require('./db');
const { fetchAccountProfile, colors, log } = require('./utils');
const clientManager = require('./clientManager');
const sodium = require('libsodium-wrappers');

// Initialize sodium
sodium.ready.catch(() => { });

require('dotenv').config({ quiet: true });

/**
 * Auto-load accounts if needed.
 */
async function initializeAccounts() {
  try {
    await clientManager.initialize();
  } catch (error) {
    log(`❌ Error initializing accounts: ${error.message}`, colors.red);
  }
}

/**
 * Print the help menu.
 */
function getHelpText() {
  return `
${colors.cyan}${colors.bright}⚡ VEXE - Enhanced Discord Bot Manager${colors.reset}

${colors.yellow}🔧 ACCOUNT COMMANDS:${colors.reset}
  ${colors.white}accounts add --token <T> [--room <R>] [--label <L>]${colors.reset}   Add new account
  ${colors.white}accounts import --file <P> [--room <R>]${colors.reset}              Import tokens from file
  ${colors.white}accounts list${colors.reset}                                       List all accounts
  ${colors.white}accounts remove --id <ID>${colors.reset}                          Remove account
  ${colors.white}accounts assign --id <ID> --room <ID|null>${colors.reset}           Assign account to room
  ${colors.white}accounts update --id <ID> --token <T>${colors.reset}                 Update account token
  ${colors.white}accounts update-profile --id <ID> [--username <U>] [--avatar <A>]${colors.reset}  Update profile
  ${colors.white}accounts show --id <ID> [--with-token]${colors.reset}                Account details

${colors.yellow}🏠 ROOM COMMANDS:${colors.reset}
  ${colors.white}rooms add --name <N> --channel <CID>${colors.reset}                  Add a voice room
  ${colors.white}rooms list${colors.reset}                                         List all rooms
  ${colors.white}rooms remove --id <ID>${colors.reset}                             Remove room

${colors.yellow}🤖 BOT OPERATIONS:${colors.reset}
  ${colors.white}bot run [--account <ID...>] [--channel <CID>]${colors.reset}          Start bots
  ${colors.white}bot leave [--account <ID...>]${colors.reset}                         Bots leave voice

${colors.yellow}👀 MONITORING:${colors.reset}
  ${colors.white}watch --user <UID> [--account <ID...>] [--mute] [--deaf] [--mirror]${colors.reset}  Follow & Copy Voice

${colors.yellow}� MESSAGE COMMANDS:${colors.reset}
  ${colors.white}messages delete-all --channel <CID> [--account <ID>]${colors.reset}     Delete all messages in channel

${colors.yellow}�🗄️ DATABASE:${colors.reset}
  ${colors.white}db create${colors.reset}                                               Create database and tables
`;
}

function parseArgs(args) {
  const options = { _: [] };
  for (let i = 0; i < args.length; i += 1) {
    const current = args[i];
    if (current.startsWith('--')) {
      const key = current.slice(2);
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        options[key] = true;
      } else {
        options[key] = next;
        i += 1;
      }
    } else {
      options._.push(current);
    }
  }
  return options;
}

function parseId(value, fieldName) {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) throw new Error(`${fieldName} must be a number.`);
  return parsed;
}

function parseAccountIdList(value) {
  if (!value) return null;
  return value.split(',').map(v => parseId(v.trim(), '--account'));
}

/**
 * Main execution logic.
 */
async function run(argv) {
  if (!argv.length || argv.includes('--help') || argv.includes('-h')) {
    console.log(getHelpText());
    return;
  }

  const entity = argv[0];
  const options = parseArgs(argv.slice(1));
  const action = options._[0];

  try {
    // Shared initialization for commands that interact with Discord
    if (['bot', 'watch', 'accounts', 'messages'].includes(entity)) {
      if (!(entity === 'accounts' && ['list', 'remove', 'assign', 'show'].includes(action))) {
        await initializeAccounts();
      }
    }

    if (entity === 'accounts') {
      switch (action) {
        case 'add': {
          const { token, label, room } = options;
          if (!token) throw new Error('Missing --token argument.');
          const defaultRoomId = room ? parseId(room, '--room') : null;

          log(`🔍 Fetching profile for token...`, colors.dim);
          const profile = await fetchAccountProfile(token);
          const accountId = await createAccount({
            label: label || profile.tag,
            token,
            userId: profile.userId,
            username: profile.username,
            defaultRoomId,
          });
          log(`✅ Saved: ${profile.tag} (ID: ${accountId})`, colors.green);
          break;
        }

        case 'import': {
          const { file, room } = options;
          if (!file) throw new Error('Missing --file argument.');
          if (!fs.existsSync(file)) throw new Error(`File not found: ${file}`);

          const defaultRoomId = room ? parseId(room, '--room') : null;
          const tokens = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(line => line.trim());

          log(`📂 Found ${tokens.length} tokens. Importing...`, colors.cyan);
          for (const token of tokens) {
            try {
              const profile = await fetchAccountProfile(token.trim());
              const id = await createAccount({
                label: profile.tag,
                token: token.trim(),
                userId: profile.userId,
                username: profile.username,
                defaultRoomId,
              });
              log(`  ✅ Imported: ${profile.tag} (#${id})`, colors.green);
            } catch (err) {
              log(`  ❌ Failed: ${token.substring(0, 15)}... (${err.message})`, colors.red);
            }
          }
          break;
        }

        case 'list': {
          const accounts = await listAccounts();
          if (!accounts.length) return log('ℹ️ No accounts found.', colors.yellow);

          console.table(accounts.map(a => ({
            ID: a.id,
            Name: a.username || a.label,
            Room: a.roomName || 'None',
            Token: a.token.substring(0, 10) + '...'
          })));
          break;
        }

        case 'remove': {
          const id = parseId(options.id, '--id');
          if (await removeAccount(id)) log(`✅ Removed account ${id}`, colors.green);
          else log(`❌ Account ${id} not found`, colors.red);
          break;
        }

        case 'assign': {
          const id = parseId(options.id, '--id');
          const room = options.room === 'null' ? null : parseId(options.room, '--room');
          await assignAccountToRoom(id, room);
          log(`✅ Account ${id} ${room ? 'assigned to room ' + room : 'unassigned'}`, colors.green);
          break;
        }

        case 'show': {
          const id = parseId(options.id, '--id');
          const accounts = await getAccountsWithRooms();
          const account = accounts.find(a => a.id === id);
          if (!account) throw new Error(`Account ${id} not found.`);
          if (!options['with-token']) delete account.token;
          console.log(JSON.stringify(account, null, 2));
          break;
        }

        case 'update': {
          const id = parseId(options.id, '--id');
          const { token } = options;
          if (!token) throw new Error('Missing --token argument.');
          await updateAccount(id, { token });
          log(`✅ Updated account ${id}`, colors.green);
          break;
        }

        case 'update-profile': {
          const id = parseId(options.id, '--id');
          const { username, avatar } = options;
          if (!username && !avatar) throw new Error('Missing --username or --avatar argument.');

          await clientManager.updateProfile(id, { username, avatar });
          log(`✅ Updated profile for account ${id}`, colors.green);
          break;
        }

        default: throw new Error(`Unknown accounts action: ${action}`);
      }
      return;
    }

    if (entity === 'rooms') {
      switch (action) {
        case 'add': {
          const { name, channel } = options;
          if (!name || !channel) throw new Error('Missing --name or --channel.');
          const id = await createRoom({ name, voiceChannelId: channel });
          log(`✅ Room created with ID ${id}`, colors.green);
          break;
        }
        case 'list': {
          const rooms = await listRooms();
          if (!rooms.length) return log('ℹ️ No rooms found.', colors.yellow);
          console.table(rooms.map(r => ({ ID: r.id, Name: r.name, Channel: r.voiceChannelId })));
          break;
        }
        case 'remove': {
          const id = parseId(options.id, '--id');
          if (await removeRoom(id)) log(`✅ Removed room ${id}`, colors.green);
          else log(`❌ Room ${id} not found`, colors.red);
          break;
        }
        default: throw new Error(`Unknown rooms action: ${action}`);
      }
      return;
    }

    if (entity === 'bot') {
      const accountIds = parseAccountIdList(options.account);
      if (action === 'run') {
        await clientManager.runBots(accountIds, options.channel);
        log('🚀 Bots are running. Press Ctrl+C to stop.', colors.cyan);
        await new Promise(() => { }); // Keep alive
      } else if (action === 'leave') {
        const clients = accountIds
          ? accountIds.map(id => clientManager.getClientById(id)).filter(Boolean)
          : clientManager.getAllClients();

        for (const client of clients) {
          if (client.voice?.connection) {
            client.voice.connection.disconnect();
            log(`  🚪 Left channel: ${client.user.tag}`, colors.yellow);
          }
        }
        log('✅ Leave command processed.', colors.green);
      } else {
        throw new Error(`Unknown bot action: ${action}`);
      }
      return;
    }

    if (entity === 'watch') {
      const userId = options.user;
      if (!userId) throw new Error('Missing --user <userId>');

      const accountIds = parseAccountIdList(options.account);
      const accounts = await getAccountsWithRooms();
      const selected = accountIds ? accounts.filter(a => accountIds.includes(a.id)) : accounts;

      log(`👀 Watching ${userId}. Press Ctrl+C to stop.`, colors.magenta);

      for (const account of selected) {
        const client = clientManager.getClientById(account.id);
        if (!client) continue;

        client.on('voiceStateUpdate', async (oldState, newState) => {
          if (newState.id !== userId) return;
          const channel = newState.channel;
          if (channel) {
            const { joinVoiceChannel } = require('@discordjs/voice');
            const { createDiscordJSAdapter } = require('./voiceAdapter');
            log(`  🏃 User moved to ${channel.name}. Joining (Modern)...`, colors.dim);
            const conn = joinVoiceChannel({
              channelId: channel.id,
              guildId: channel.guild.id,
              adapterCreator: createDiscordJSAdapter(channel),
              selfMute: !!options.mirror ? false : !!options.mute,
              selfDeaf: !!options.mirror ? false : !!options.deaf,
              group: client.user.id
            });

            if (conn && options.mirror) {
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
                    client._activeMirrorPlayer = null;
                    player.stop();
                  });

                  player.on('error', (e) => {
                    log(`  ❌ Audio error: ${e.message}`, colors.red);
                    client._activeMirrorPlayer = null;
                    player.stop();
                  });
                } catch (e) {
                  log(`  ❌ Mirror error: ${e.message}`, colors.red);
                }
              };

              conn.on('speaking', (u) => {
                if ((u.id || u) === userId) startMirroring();
              });

              startMirroring();
              log(`  🎙️ Mirroring active for ${client.user.tag}`, colors.cyan);
            }
          } else if (!options.stay) {
            log(`  👋 User left voice.`, colors.dim);
            if (conn && conn.state.status !== 'destroyed') conn.destroy();
          }
        });

        // Initial check: is user already in a voice channel?
        for (const guild of client.guilds.cache.values()) {
          const vs = guild.voiceStates.cache.get(userId);
          if (vs?.channel) {
            client.emit('voiceStateUpdate', {}, vs);
            break;
          }
        }
      }
      await new Promise(() => { }); // Keep alive
      return;
    }

    if (entity === 'messages') {
      switch (action) {
        case 'delete-all': {
          const { channel, account } = options;
          if (!channel) throw new Error('Missing --channel argument.');

          const accountId = account ? parseId(account, '--account') : null;
          await clientManager.deleteAllMessages(channel, accountId);
          log('✅ All messages deleted', colors.green);
          break;
        }
        default: throw new Error(`Unknown messages action: ${action}`);
      }
      return;
    }

    if (entity === 'db') {
      switch (action) {
        case 'create': {
          await createDatabase();
          log('✅ Database created successfully', colors.green);
          break;
        }
        default: throw new Error(`Unknown db action: ${action}`);
      }
      return;
    }

    throw new Error(`Unknown command: ${entity}`);
  } catch (error) {
    log(`❌ Error: ${error.message}`, colors.red);
    if (!process.stdin.isTTY) process.exit(1);
  }
}

if (require.main === module) {
  run(process.argv.slice(2));
}

module.exports = { run, getHelpText };