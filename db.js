const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

const dbPath = path.join(__dirname, 'storage.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false,
});

const Room = sequelize.define(
  'Room',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    voiceChannelId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: 'rooms',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        unique: true,
        fields: ['voiceChannelId'],
      },
    ],
  },
);

const Account = sequelize.define(
  'Account',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    label: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    defaultRoomId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Room,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
  },
  {
    tableName: 'accounts',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['defaultRoomId'],
      },
      {
        fields: ['userId'],
      },
    ],
  },
);

Account.belongsTo(Room, {
  as: 'defaultRoom',
  foreignKey: 'defaultRoomId',
  constraints: true,
});

Room.hasMany(Account, {
  as: 'accounts',
  foreignKey: 'defaultRoomId',
});

const Setting = sequelize.define(
  'Setting',
  {
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'settings',
    timestamps: true,
  },
);

async function cleanupDanglingBackupTables() {
  const queryInterface = sequelize.getQueryInterface();
  const tablesRaw = await queryInterface.showAllTables();
  const tables = Array.isArray(tablesRaw) ? tablesRaw : [];
  const backupTables = tables
    .map((table) => (typeof table === 'string' ? table : table.tableName || table.name || ''))
    .filter((name) => typeof name === 'string' && name.endsWith('_backup') && name.length > '_backup'.length);

  for (const tableName of backupTables) {
    try {
      await queryInterface.dropTable(tableName);
    } catch (error) {
      console.warn(`Warning: unable to drop leftover table ${tableName}: ${error.message || error}`);
    }
  }
}

let initPromise;

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      await sequelize.authenticate();
      await cleanupDanglingBackupTables();
      await sequelize.sync();
    })();
  }
  return initPromise;
}

function serializeAccount(accountInstance, { includeToken = true } = {}) {
  const account = accountInstance.get({ plain: true });
  const defaultRoom = account.defaultRoom || null;

  const result = {
    id: account.id,
    label: account.label || null,
    userId: account.userId || null,
    username: account.username || null,
    defaultRoomId: account.defaultRoomId ?? null,
    roomId: defaultRoom?.id ?? null,
    roomName: defaultRoom?.name ?? null,
    voiceChannelId: defaultRoom?.voiceChannelId ?? null,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };

  if (includeToken) {
    result.token = account.token;
  }

  return result;
}

function serializeRoom(roomInstance) {
  const room = roomInstance.get({ plain: true });
  return {
    id: room.id,
    name: room.name,
    voiceChannelId: room.voiceChannelId,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

async function resolveRoomId(roomId) {
  if (roomId === null || roomId === undefined) {
    return null;
  }
  const resolved = await Room.findByPk(roomId);
  if (!resolved) {
    throw new Error(`Room ${roomId} not found.`);
  }
  return resolved.id;
}

async function createAccount({ label, token, userId, username, defaultRoomId }) {
  if (!token) {
    throw new Error('Token is required to create an account.');
  }
  await ensureInitialized();

  const resolvedRoomId = await resolveRoomId(defaultRoomId);

  try {
    const account = await Account.create({
      label: label || null,
      token,
      userId: userId || null,
      username: username || null,
      defaultRoomId: resolvedRoomId,
    });
    return account.id;
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      const conflictField = error?.errors?.[0]?.path;
      if (conflictField === 'token') {
        throw new Error('An account with this token already exists.');
      }
      if (conflictField === 'userId') {
        throw new Error('An account with this user id already exists.');
      }
    }
    throw new Error(`Unable to create account: ${error.message || error}`);
  }
}

async function listAccounts() {
  await ensureInitialized();
  const accounts = await Account.findAll({
    order: [['id', 'ASC']],
    include: [
      {
        model: Room,
        as: 'defaultRoom',
        attributes: ['id', 'name', 'voiceChannelId'],
      },
    ],
  });
  return accounts.map((account) => serializeAccount(account));
}

async function getAccountsWithRooms() {
  await ensureInitialized();
  const accounts = await Account.findAll({
    order: [['id', 'ASC']],
    include: [
      {
        model: Room,
        as: 'defaultRoom',
        attributes: ['id', 'name', 'voiceChannelId'],
      },
    ],
  });
  return accounts.map((account) => serializeAccount(account));
}

async function updateAccount(id, { label, token, userId, username, defaultRoomId }) {
  await ensureInitialized();
  const account = await Account.findByPk(id);
  if (!account) {
    throw new Error(`Account ${id} not found.`);
  }

  const updates = {};
  if (label !== undefined) updates.label = label || null;
  if (token !== undefined) updates.token = token;
  if (userId !== undefined) updates.userId = userId || null;
  if (username !== undefined) updates.username = username || null;
  if (defaultRoomId !== undefined) {
    updates.defaultRoomId = await resolveRoomId(defaultRoomId);
  }

  if (!Object.keys(updates).length) {
    return false;
  }

  try {
    Object.assign(account, updates);
    await account.save();
    return true;
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      const conflictField = error?.errors?.[0]?.path;
      if (conflictField === 'token') {
        throw new Error('An account with this token already exists.');
      }
      if (conflictField === 'userId') {
        throw new Error('An account with this user id already exists.');
      }
    }
    throw new Error(`Unable to update account: ${error.message || error}`);
  }
}

async function assignAccountToRoom(accountId, roomId) {
  await ensureInitialized();
  const account = await Account.findByPk(accountId);
  if (!account) {
    throw new Error(`Account ${accountId} not found.`);
  }

  const resolvedRoomId = await resolveRoomId(roomId);
  account.defaultRoomId = resolvedRoomId;
  await account.save();
}

async function removeAccount(id) {
  await ensureInitialized();
  const removed = await Account.destroy({ where: { id } });
  return Boolean(removed);
}

async function createRoom({ name, voiceChannelId }) {
  if (!name || !voiceChannelId) {
    throw new Error('Both name and voiceChannelId are required to create a room.');
  }
  await ensureInitialized();

  try {
    const room = await Room.create({ name, voiceChannelId });
    return room.id;
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      const conflictField = error?.errors?.[0]?.path;
      if (conflictField === 'name') {
        throw new Error('A room with this name already exists.');
      }
      if (conflictField === 'voiceChannelId') {
        throw new Error('A room with this voice channel id already exists.');
      }
    }
    throw new Error(`Unable to create room: ${error.message || error}`);
  }
}

async function listRooms() {
  await ensureInitialized();
  const rooms = await Room.findAll({ order: [['id', 'ASC']] });
  return rooms.map(serializeRoom);
}

async function removeRoom(id) {
  await ensureInitialized();
  const transaction = await sequelize.transaction();
  try {
    await Account.update(
      { defaultRoomId: null },
      { where: { defaultRoomId: id }, transaction },
    );
    const removed = await Room.destroy({ where: { id }, transaction });
    await transaction.commit();
    return Boolean(removed);
  } catch (error) {
    await transaction.rollback();
    throw new Error(`Unable to remove room: ${error.message || error}`);
  }
}

async function createDatabase() {
  await ensureInitialized();
  return true;
}

async function getSetting(key) {
  await ensureInitialized();
  const setting = await Setting.findByPk(key);
  return setting ? setting.value : null;
}

async function setSetting(key, value) {
  await ensureInitialized();
  await Setting.upsert({ key, value });
  return true;
}

module.exports = {
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
  getSetting,
  setSetting,
};
