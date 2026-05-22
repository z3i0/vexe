<div align="center">

# 🎙️ VEXE

### Advanced Discord Selfbot Manager

*Powerful, multi-account selfbot management built for developers*

[![Node.js Version](https://img.shields.io/badge/Node.js-18+-00C853?style=flat-square&logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/github/license/z3i0/vexe?style=flat-square&logo=github)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/z3i0/vexe?style=flat-square&logo=github)](https://github.com/z3i0/vexe)
[![GitHub Forks](https://img.shields.io/github/forks/z3i0/vexe?style=flat-square&logo=github)](https://github.com/z3i0/vexe/network)
[![Last Commit](https://img.shields.io/github/last-commit/z3i0/vexe?style=flat-square&logo=github)](https://github.com/z3i0/vexe/commits)
[![GitHub Issues](https://img.shields.io/github/issues/z3i0/vexe?style=flat-square&logo=github)](https://github.com/z3i0/vexe/issues)

[Features](#-features) • [Quick Start](#-quick-start) • [Installation](#-installation) • [Documentation](#-command-reference) • [Contributing](#-contributing)

</div>

---

<div align="center">

> ⚠️ **Disclaimer**: This is a selfbot tool. Selfbots violate Discord's Terms of Service. Use at your own risk and only on accounts you're willing to have banned.

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [📦 Installation](#-installation)
- [🎯 Why VEXE?](#-why-vexe)
- [⚙️ Tech Stack](#-tech-stack)
- [🔄 Example Workflow](#-example-workflow)
- [💻 Usage Guide](#-usage-guide)
- [📖 Command Reference](#-command-reference)
- [🏗️ Project Architecture](#-project-architecture)
- [🚀 PM2 Deployment](#-pm2-deployment)
- [📸 Screenshots](#-screenshots)
- [❓ FAQ](#-faq)
- [🔐 Security](#-security)
- [📝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Multi-Account Management** | Store and manage multiple Discord selfbot accounts securely in SQLite |
| 🎙️ **Voice Channel Automation** | Automatically join voice channels or follow target users |
| 🔄 **User Following** | Watch a target user and join any voice channel they enter |
| 🎧 **Voice Mirroring** | Optional audio relay/mirror mode for advanced scenarios |
| 📝 **Message Tools** | Delete messages from channels using managed accounts |
| 💾 **Persistent Storage** | SQLite-powered database with Sequelize ORM |
| 🖥️ **CLI & Interactive UI** | Both command-line and interactive menu interfaces |
| 🌍 **Room Shortcuts** | Create named shortcuts to frequently-used voice channels |
| 🔌 **PM2 Ready** | Easy background process management and auto-restart |
| 📊 **Profile Management** | Update usernames and avatars per account |

---

## 🚀 Quick Start

### 1️⃣ Prerequisites

```bash
# Node.js 18+ and npm
node --version  # v18.0.0 or higher
npm --version   # 8.0.0 or higher
```

### 2️⃣ Clone & Install

```bash
git clone https://github.com/z3i0/vexe.git
cd vexe
npm install
npm run db
```

### 3️⃣ Add Your First Account

```bash
npm run cli -- accounts add --token YOUR_DISCORD_TOKEN --label "MainBot"
```

### 4️⃣ Start the Bot

```bash
npm run cli -- bot run
```

That's it! The bot is now running and ready to use.

---

## 📦 Installation

### Standard Installation

```bash
git clone https://github.com/z3i0/vexe.git
cd vexe
npm install
```

### Initialize Database

```bash
npm run db
```

This creates `storage.sqlite` with all necessary tables.

### Global Installation

Install globally to use `vexe` from anywhere:

```bash
npm install -g .
```

Then simply run:

```bash
vexe
```

### Development Setup

For development with auto-reload:

```bash
npm link
# Now use 'vexe' directly in your terminal
```

---

## 🎯 Why VEXE?

| Aspect | VEXE | Basic Discord Bots |
|--------|------|-------------------|
| **Multiple Accounts** | ✅ Manage unlimited accounts from one CLI | ❌ Single bot per instance |
| **Voice Following** | ✅ Auto-follow users across channels | ❌ Manual intervention required |
| **Profile Editing** | ✅ Update usernames/avatars per account | ❌ Limited control |
| **Message Tools** | ✅ Bulk operations, automated cleanup | ❌ Basic functionality |
| **Room Shortcuts** | ✅ Named channel shortcuts for quick access | ❌ Manual channel IDs |
| **Audio Mirroring** | ✅ Advanced voice relay capabilities | ❌ Not available |
| **Database Persistence** | ✅ SQLite with Sequelize ORM | ❌ Manual configuration |
| **PM2 Integration** | ✅ Background process + auto-restart | ❌ Manual process management |

---

## ⚙️ Tech Stack

```
Node.js 18+          - JavaScript runtime
discord.js 14+       - Discord API client library
@discordjs/voice     - Voice channel connection handler
SQLite               - Lightweight persistent database
Sequelize            - SQL ORM for database operations
PM2                  - Process manager for background execution
Yargs                - Command-line argument parsing
Winston              - Structured logging
```

---

## 🔄 Example Workflow

### A complete setup from zero to running:

```mermaid
graph LR
    A["🔧 npm install"] -->|Initialize| B["📁 Create Database"]
    B -->|Setup| C["🔐 Add Account"]
    C -->|Configure| D["🎙️ Create Room"]
    D -->|Ready| E["▶️ Start Bot"]
    E -->|Monitor| F["👤 Watch User"]
    F -->|Maintain| G["🔄 PM2 Keep Alive"]
    
    style A fill:#2d2d2d
    style B fill:#2d2d2d
    style C fill:#2d2d2d
    style D fill:#2d2d2d
    style E fill:#2d2d2d
    style F fill:#2d2d2d
    style G fill:#2d2d2d
```

**Step-by-step:**

1. **Install** → `npm install && npm run db`
2. **Add Account** → Get your Discord token and add it
3. **Create Room** → Set up a voice channel shortcut
4. **Run Bot** → Start the selfbot instance(s)
5. **Watch User** → Make the bot follow a specific user
6. **Keep Alive** → Use PM2 for persistent background operation

---

## 💻 Usage Guide

### How to Get Your Discord Token

<details>
<summary>🔑 Step-by-step token extraction</summary>

1. Open Discord in your web browser (desktop site)
2. Press `F12` or `Ctrl+Shift+I` to open Developer Tools
3. Navigate to the **Console** tab
4. Paste this code and press `Enter`:

```javascript
window.webpackChunkdiscord_app.push([[Symbol()],{},o=>{for(let e of Object.values(o.c))try{if(!e.exports||e.exports===window)continue;e.exports?.getToken&&(token=e.exports.getToken());for(let o in e.exports)e.exports?.[o]?.getToken&&"IntlMessagesProxy"!==e.exports[o][Symbol.toStringTag]&&(token=e.exports[o].getToken())}catch{}}]),window.webpackChunkdiscord_app.pop(),token;
```

5. Copy the token string returned
6. Use it in VEXE with: `npm run cli -- accounts add --token YOUR_TOKEN`

⚠️ **Important**: Never share your token. Anyone with it can access your account.

</details>

### Account Management

```bash
# Add a new account
npm run cli -- accounts add --token YOUR_TOKEN --label "MyBot"

# List all accounts
npm run cli -- accounts list

# View account details
npm run cli -- accounts show --id 1 --with-token

# Update an account's token
npm run cli -- accounts update --id 1 --token NEW_TOKEN

# Update profile (username/avatar)
npm run cli -- accounts update-profile --id 1 --username "NewName"

# Assign a default room
npm run cli -- accounts assign --id 1 --room 1

# Remove an account
npm run cli -- accounts remove --id 1

# Bulk import from file
npm run cli -- accounts import --file tokens.txt --room 1
```

### Room/Channel Shortcuts

```bash
# Create a room shortcut
npm run cli -- rooms add --name "VoiceRoom" --channel 1234567890

# List all rooms
npm run cli -- rooms list

# Delete a room
npm run cli -- rooms remove --id 1
```

### Bot Control

```bash
# Start all bots
npm run cli -- bot run

# Start specific bots (comma-separated IDs)
npm run cli -- bot run --account 1,2,3

# Start bots in a specific channel
npm run cli -- bot run --channel 1234567890

# Make bots leave voice channels
npm run cli -- bot leave
npm run cli -- bot leave --account 1,2
```

### User Following & Voice Mirroring

```bash
# Follow a user across voice channels
npm run cli -- watch --user USER_ID

# Follow with specific accounts
npm run cli -- watch --user USER_ID --account 1,2

# Join muted and deafened
npm run cli -- watch --user USER_ID --mute --deaf

# Enable voice audio mirroring
npm run cli -- watch --user USER_ID --mirror
```

### Message Tools

```bash
# Delete all messages in a channel
npm run cli -- messages delete-all --channel CHANNEL_ID

# Delete using a specific account
npm run cli -- messages delete-all --channel CHANNEL_ID --account 1
```

### Interactive Mode

```bash
# Launch interactive menu
node index.js

# Or globally:
vexe
```

Use **Arrow Keys** to navigate, **Enter** to select, **Esc** to exit.

---

## 📖 Command Reference

<details>
<summary>📋 Full command list</summary>

### Account Commands
```
accounts add --token <TOKEN>
  [--label <LABEL>]
  [--room <ROOM_ID>]
  Add a new Discord account

accounts import --file <PATH>
  [--room <ROOM_ID>]
  Import multiple accounts from a file (one token per line)

accounts list
  Display all stored accounts

accounts show --id <ID>
  [--with-token]
  Display account details

accounts update --id <ID> --token <TOKEN>
  Update an account's token

accounts update-profile --id <ID>
  [--username <USERNAME>]
  [--avatar <AVATAR_URL>]
  Update account profile (username/avatar)

accounts assign --id <ID> --room <ROOM_ID|null>
  Assign or unassign a default room

accounts remove --id <ID>
  Delete an account
```

### Room Commands
```
rooms add --name <NAME> --channel <CHANNEL_ID>
  Create a new voice channel shortcut

rooms list
  Display all room shortcuts

rooms remove --id <ID>
  Delete a room shortcut
```

### Bot Commands
```
bot run [--account <ID,ID,...>]
        [--channel <CHANNEL_ID>]
  Start bot instances (keeps running until Ctrl+C)

bot leave [--account <ID,ID,...>]
  Make running bots leave voice channels
```

### Watch Commands
```
watch --user <USER_ID>
  [--account <ID,ID,...>]
  [--mute]
  [--deaf]
  [--mirror]
  Follow a user and join their voice channels
  
  Options:
    --mute   Join channels in muted state
    --deaf   Join channels in deafened state
    --mirror Enable voice audio copying/relaying
```

### Message Commands
```
messages delete-all --channel <CHANNEL_ID>
  [--account <ID>]
  Delete all messages in a channel using the specified account
```

### Database Commands
```
db create
  Initialize or recreate database tables
```

</details>

---

## 🏗️ Project Architecture

### File Structure

```
vexe/
├── cli.js                 # CLI entry point & command parser
├── clientManager.js       # Discord client lifecycle management
├── db.js                  # SQLite + Sequelize database layer
├── voiceAdapter.js        # Voice connection adapter
├── utils.js               # Logging & utility functions
├── index.js               # Interactive menu UI
├── package.json           # Dependencies & npm scripts
├── README.md              # This file
└── config/
    └── config.json        # Configuration (gitignored)
└── models/
    └── index.js           # Sequelize data models
└── storage.sqlite         # SQLite database (gitignored)
```

### Core Modules

| Module | Purpose |
|--------|---------|
| **cli.js** | Parses CLI arguments and routes commands |
| **db.js** | SQLite database operations using Sequelize |
| **clientManager.js** | Manages Discord.js client instances and voice connections |
| **voiceAdapter.js** | Provides Discord.js voice adapter integration |
| **utils.js** | Shared utilities: logging, formatting, helpers |
| **index.js** | Keyboard-driven interactive menu interface |

### Data Models

```
Account
├── id (primary key)
├── token (Discord bot token)
├── label (custom name)
├── roomId (default room reference)
├── username (profile name)
└── avatar (profile avatar URL)

Room
├── id (primary key)
├── name (room label)
└── channelId (Discord channel ID)
```

---

## 🚀 PM2 Deployment

Keep VEXE running in the background with automatic restart on failure.

### Installation

```bash
npm install -g pm2
```

### Start with PM2

```bash
# Start bot service
pm2 start ./cli.js --name vexe -- bot run

# Start with watch mode
pm2 start ./cli.js --name vexe-watch -- watch --user USER_ID --mirror

# Start with specific accounts
pm2 start ./cli.js --name vexe -- bot run --account 1,2,3

# Start with logging
pm2 start ./cli.js --name vexe -- bot run --log-date-format "YYYY-MM-DD HH:mm:ss Z"
```

### Monitor & Manage

```bash
# View status
pm2 status

# View logs in real-time
pm2 logs vexe

# View last 100 lines
pm2 logs vexe --lines 100

# Restart service
pm2 restart vexe

# Stop service
pm2 stop vexe

# Delete from PM2
pm2 delete vexe

# Save process list (restarts after reboot)
pm2 save

# Restore saved processes after reboot
pm2 resurrect
```

### Auto-Start on Reboot

```bash
# Configure PM2 to start on system boot
pm2 startup

# Save current process list
pm2 save
```

---

## 📸 Screenshots

<details>
<summary>📷 CLI Output Examples</summary>

**Account List:**
```
┌─────┬──────────────┬──────────────────────────────┬──────┐
│ ID  │ Label        │ Username                     │ Room │
├─────┼──────────────┼──────────────────────────────┼──────┤
│ 1   │ MainBot      │ MyBot#0001                   │ 1    │
│ 2   │ SideBot      │ SideBot#0002                 │ null │
└─────┴──────────────┴──────────────────────────────┴──────┘
```

**Room List:**
```
┌─────┬──────────────┬────────────────────────────┐
│ ID  │ Name         │ Channel ID                 │
├─────┼──────────────┼────────────────────────────┤
│ 1   │ General      │ 123456789012345678         │
│ 2   │ VoiceRoom    │ 987654321098765432         │
└─────┴──────────────┴────────────────────────────┘
```

**Interactive Menu:**
```
? Select an option:
  ▶ Run Bots
    Watch User
    Manage Accounts
    Manage Rooms
    Delete Messages
    Edit Profile
    Exit
```

</details>

---

## ❓ FAQ

<details>
<summary><b>Q: Can I use this with regular bot tokens?</b></summary>

A: Technically yes, but VEXE is specifically designed for selfbot accounts (user tokens). Regular bot tokens won't be able to execute selfbot commands. For regular bots, use discord.js directly or other bot frameworks.

</details>

<details>
<summary><b>Q: Will Discord ban my account?</b></summary>

A: Yes, Discord's Terms of Service prohibit selfbots and automation. Using this tool carries a real risk of account termination. Use throwaway/secondary accounts only.

</details>

<details>
<summary><b>Q: How do I update to the latest version?</b></summary>

A: Pull the latest changes and reinstall:
```bash
git pull
npm install
npm run db  # Migrate database if needed
```

</details>

<details>
<summary><b>Q: Can I run multiple instances of VEXE?</b></summary>

A: Yes! You can use PM2 to run multiple named instances:
```bash
pm2 start ./cli.js --name vexe1 -- bot run --account 1,2
pm2 start ./cli.js --name vexe2 -- bot run --account 3,4
```

</details>

<details>
<summary><b>Q: What if I get a token error?</b></summary>

A: Verify your token is:
- Correctly copied (no extra spaces)
- Still valid (tokens can expire)
- From the right account
- Not already in use elsewhere

</details>

<details>
<summary><b>Q: How do I bulk import accounts?</b></summary>

A: Create a `tokens.txt` file with one token per line, then:
```bash
npm run cli -- accounts import --file tokens.txt --room 1
```

</details>

<details>
<summary><b>Q: Can I mirror multiple users at once?</b></summary>

A: The current version follows one target user at a time. You can start multiple watch instances with PM2 if needed, but they'll all follow the same user.

</details>

<details>
<summary><b>Q: How do I monitor bot activity?</b></summary>

A: With PM2:
```bash
pm2 logs vexe --lines 500
pm2 monit  # Real-time dashboard
```

Or check the database directly with Sequelize CLI.

</details>

<details>
<summary><b>Q: Is there an API or REST endpoint?</b></summary>

A: Not currently. VEXE is CLI-driven only. You can extend it by modifying `cli.js` or `index.js`.

</details>

---

## 🔐 Security

### Best Practices

⚠️ **Never:**
- Share your Discord tokens
- Commit tokens to version control
- Paste tokens in unsecured channels
- Use tokens on untrusted machines

✅ **Do:**
- Use `.env` files for local token storage
- Rotate tokens regularly
- Use dedicated/throwaway accounts
- Keep VEXE updated
- Review code before running
- Understand the ToS violations involved

### Database Security

- Tokens are stored in `storage.sqlite` (in plaintext)
- Add `storage.sqlite` to `.gitignore` ✅
- Restrict file permissions: `chmod 600 storage.sqlite`
- Back up your database regularly
- Never share database files

### Token Safety

Store tokens in a `.env` file (add to `.gitignore`):

```bash
# .env
DISCORD_TOKEN_1=your_token_here
DISCORD_TOKEN_2=another_token_here
```

Then load programmatically rather than passing on command line.

---

## 📝 Contributing

Contributions are welcome! Whether it's bug fixes, features, or documentation improvements.

### Getting Started

```bash
# Fork the repository
# Clone your fork
git clone https://github.com/YOUR_USERNAME/vexe.git

# Create a feature branch
git checkout -b feature/amazing-feature

# Make changes and commit
git add .
git commit -m "feat: Add amazing feature"

# Push to your fork
git push origin feature/amazing-feature

# Open a Pull Request
```

### Development Tips

- Keep code clean and well-commented
- Follow existing code style
- Test changes thoroughly before submitting
- Update README if adding features
- Reference any related issues

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

### ⭐ If you find VEXE useful, consider giving it a star!

[Report an Issue](https://github.com/z3i0/vexe/issues) • [View on GitHub](https://github.com/z3i0/vexe) • [Suggest a Feature](https://github.com/z3i0/vexe/discussions)

---

**Made with ❤️ for developers**

⚠️ *Remember: Use responsibly. Discord ToS violations can result in account termination.*

</div>
