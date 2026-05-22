# VEXE - Enhanced Discord Account Manager

VEXE is a Node.js Discord selfbot manager built to run multiple selfbot accounts, manage voice channel shortcuts, and follow user movement across voice channels.

> This is a selfbot tool. Selfbots are against Discord's Terms of Service. Use at your own risk.

---

## What this Project Does

VEXE is a command-line tool that lets you:

- store Discord account tokens locally in a SQLite database
- assign each account to a default voice channel "Room"
- start one or more selfbot accounts and connect them to voice channels
- watch a target user and automatically join the voice channel they enter
- optionally mirror the target user's voice audio
- delete messages from a channel with a selected account

The code is organized around:

- `cli.js` – main command-line interface and command parser
- `db.js` – SQLite storage layer using Sequelize, stores accounts and rooms in `storage.sqlite`
- `clientManager.js` – manages active Discord selfbot clients and voice connections
- `voiceAdapter.js` – adapter helper for `@discordjs/voice`
- `utils.js` – logging, token/profile fetching, and helpers
- `index.js` – optional interactive menu UI

---

## Prerequisites

- Node.js 16+ installed
- `npm` available in your shell
- A Discord account token for every selfbot account you want to run

---

## How to get your Discord token

> Only use this token for your own account and never share it with anyone.

1. Open Discord in your web browser using the desktop site.
2. Press `F12` or `Ctrl+Shift+I` to open Developer Tools.
3. Go to the **Console** tab.
4. Paste this code and press `Enter`:

```javascript
window.webpackChunkdiscord_app.push([[Symbol()],{},o=>{for(let e of Object.values(o.c))try{if(!e.exports||e.exports===window)continue;e.exports?.getToken&&(token=e.exports.getToken());for(let o in e.exports)e.exports?.[o]?.getToken&&"IntlMessagesProxy"!==e.exports[o][Symbol.toStringTag]&&(token=e.exports[o].getToken())}catch{}}]),window.webpackChunkdiscord_app.pop(),token;
```

5. Copy the token value printed in the console.

If the code does not return a token, try refreshing Discord and repeating the steps.

---

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd vexe
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create the database and tables:
   ```bash
   npm run db
   ```

The project stores data in `storage.sqlite` at the project root.

### Install as a global command

After the repository is installed, you can link it globally so `vexe` works from any shell:

```bash
npm install -g .
```

Then run:

```bash
vexe
```

If you prefer a development setup, use:

```bash
npm link
```

After that, `vexe` will open the interactive menu just like `node index.js`.

---

## Running VEXE

### Show help


```bash
node cli.js --help
```

### Add a Discord account

```bash
npm run cli -- accounts add --token YOUR_TOKEN --label "MyAccount"
```

Optionally assign a default room when adding:

```bash
npm run cli -- accounts add --token YOUR_TOKEN --label "MyAccount" --room 1
```

### Import accounts from a file

Create a file named `tokens.txt` with one token per line, then run:

```bash
npm run cli -- accounts import --file tokens.txt
```

### List accounts

```bash
npm run cli -- accounts list
```

### Remove an account

```bash
npm run cli -- accounts remove --id 1
```

### Create a Room

```bash
npm run cli -- rooms add --name "General" --channel 123456789012345678
```

### List Rooms

```bash
npm run cli -- rooms list
```

### Remove a Room

```bash
npm run cli -- rooms remove --id 1
```

### Start bots

Start all saved accounts:

```bash
npm run cli -- bot run
```

Start selected accounts:

```bash
npm run cli -- bot run --account 1,2
```

Start bots into a specific channel directly:

```bash
npm run cli -- bot run --channel 123456789012345678
```

> `bot run` keeps the process alive until you stop it with `Ctrl+C`.

### Make bots leave voice channels

```bash
npm run cli -- bot leave
```

or for selected accounts:

```bash
npm run cli -- bot leave --account 1,2
```

### Watch a user across voice channels

```bash
npm run cli -- watch --user USER_ID_TO_FOLLOW
```

Options:

- `--account 1,2` — only use specific accounts
- `--mute` — join muted
- `--deaf` — join deafened
- `--mirror` — enable voice mirroring / copy voice audio

### Delete all messages in a channel

```bash
npm run cli -- messages delete-all --channel 123456789012345678
```

Optionally use a specific account:

```bash
npm run cli -- messages delete-all --channel 123456789012345678 --account 1
```

---

## Full Command Reference

### Account Commands
- `accounts add --token <T> [--room <R>] [--label <L>]` — Add a new account
- `accounts import --file <P> [--room <R>]` — Import tokens from a file
- `accounts list` — List all saved accounts
- `accounts remove --id <ID>` — Remove an account by ID
- `accounts assign --id <ID> --room <ID|null>` — Assign or unassign a room
- `accounts update --id <ID> --token <T>` — Update an account token
- `accounts update-profile --id <ID> [--username <U>] [--avatar <A>]` — Update profile metadata
- `accounts show --id <ID> [--with-token]` — Show account details

### Room Commands
- `rooms add --name <N> --channel <CID>` — Create a room shortcut
- `rooms list` — Show all rooms
- `rooms remove --id <ID>` — Delete a room

### Bot Commands
- `bot run [--account <ID...>] [--channel <CID>]` — Start bots
- `bot leave [--account <ID...>]` — Make bots leave voice channels

### Watch Commands
- `watch --user <UID> [--account <ID...>] [--mute] [--deaf] [--mirror]` — Follow a user and join their voice channel

### Message Commands
- `messages delete-all --channel <CID> [--account <ID>]` — Delete all messages in a channel

### Database Commands
- `db create` — Initialize or recreate database tables

---

## Interactive Mode

For keyboard-driven use, run:

```bash
node index.js
```

Or, if you installed the package globally as `vexe`:

```bash
vexe
```

This opens an interactive menu where you can use:

- `↑` / `↓` or `Arrow Up` / `Arrow Down` to move between menu items
- `Enter` to select the highlighted option
- `Esc` or `Ctrl+C` to exit

You can navigate the menu to:

- run and stop bots
- watch a user
- manage accounts and rooms
- delete messages
- edit profiles
- enable voice copying / mirror mode

---

## Database Notes

- SQLite database file: `storage.sqlite`
- The database is managed by `db.js` using Sequelize
- Run `npm run db` to create tables explicitly

---

## PM2 Usage

To keep VEXE running in the background, use PM2.

### Install PM2

```bash
npm install -g pm2
```

### Start VEXE with PM2

```bash
pm2 start ./cli.js --name vexe -- bot run
```

Watch mode example:

```bash
pm2 start ./cli.js --name vexe-watch -- watch --user 123456789012345678 --mirror
```

### Common PM2 commands

- `pm2 status`
- `pm2 logs vexe`
- `pm2 restart vexe`
- `pm2 stop vexe`
- `pm2 delete vexe`
- `pm2 save`

### PM2 Notes

- `pm2 save` saves the current process list so it can restart after reboot
- Use PM2 when you want the bot process to keep running after closing the shell
- Stop the bot with `pm2 stop <name>` or `pm2 delete <name>`

---

## Security & Usage Warnings

- Never share your Discord tokens.
- Use dedicated accounts for this tool if possible.
- Discord may ban accounts that use selfbots or automation.
- This is intended for experienced users who understand the risks.

---

## Project File Overview

- `cli.js` — command-line interface and argument parsing
- `db.js` — SQLite storage layer and account/room persistence
- `clientManager.js` — manages Discord clients, voice joins, and bot lifecycles
- `voiceAdapter.js` — required voice adapter integration for Discord voice
- `utils.js` — helper functions and logging utilities
- `index.js` — optional interactive menu UI
- `package.json` — dependency list and npm scripts

---

## Example Setup Flow

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create the database:
   ```bash
   npm run db
   ```
3. Add an account:
   ```bash
   npm run cli -- accounts add --token YOUR_TOKEN --label "Bot1"
   ```
4. Add a room:
   ```bash
   npm run cli -- rooms add --name "VoiceRoom" --channel 123456789012345678
   ```
5. Start bots:
   ```bash
   npm run cli -- bot run
   ```
6. Keep it running with PM2:
   ```bash
   pm2 start ./cli.js --name vexe -- bot run
   ```
