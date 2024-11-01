const config = require("./configs/config");
const { delay, jidNormalizedUser } = require("@whiskeysockets/baileys");
const { createClient, getWAVersion } = require("./lib/client");
const { handleMessagesUpsert } = require("./events/messageHandler");
const fs = require("fs");

const groupEvents = require("./events/groupEvents");
const messageHandler = require("./events/messageHandler");
const connectionUpdate = require("./events/connectionUpdate");
const Database = require("./lib/database");

const pairingCode = config.pairingNumber;
const pathContacts = `./${config.session}/contacts.json`;
const pathMetadata = `./${config.session}/groupMetadata.json`;

async function WAStart() {
  process.on("uncaughtException", console.error);
  process.on("unhandledRejection", console.error);

  const { version, isLatest } = await getWAVersion();
  console.log(`Menggunakan WA v${version.join(".")}, isLatest: ${isLatest}`);

  const { client, saveCreds, store } = await createClient({
    session: config.session,
  });

  const database = new Database();
  const content = await database.read();

  if (content && Object.keys(content).length === 0) {
    global.db = {
      users: {},
      groups: {},
      ...(content || {}),
    };
    await database.write(global.db);
  } else {
    global.db = content;
  }

  if (pairingCode && !client.authState.creds.registered) {
    let phoneNumber = pairingCode.replace(/[^0-9]/g, "");

    await delay(3000);
    let code = await client.requestPairingCode(phoneNumber);
    code = code?.match(/.{1,4}/g)?.join("-") || code;
    console.log(`⚠︎ Kode WhatsApp kamu: ` + code);
  }

  connectionUpdate(client, WAStart);
  groupEvents(client, store);
  messageHandler(client, store);

  client.ev.on("creds.update", saveCreds);

  setInterval(async () => {
    if (store.groupMetadata)
      fs.writeFileSync(pathMetadata, JSON.stringify(store.groupMetadata));
    if (store.contacts)
      fs.writeFileSync(pathContacts, JSON.stringify(store.contacts));

    if (config.writeStore) store.writeToFile(`./${config.session}/store.json`);

    if (global.db) await database.write(global.db);
  }, 10 * 3000);
}

WAStart();
