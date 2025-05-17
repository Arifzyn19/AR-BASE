import baileys from "@whiskeysockets/baileys";
import { Client } from "../lib/serialize.js";
import storeSystem from './store.js'
import pino from "pino";
const {
  default: WAConnect,
  Browsers,
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion,
  useMultiFileAuthState,
} = baileys;

const createClient = async (options = {}) => {
  const logger = pino({
    timestamp: () => `,"time":"${new Date().toJSON()}"`,
  }).child({ class: "client" });
  logger.level = "fatal";

  const store = storeSystem.makeInMemoryStore({ logger });
  const { state, saveCreds } = await useMultiFileAuthState(options.session);
  const client = WAConnect({
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
    browser: Browsers.ubuntu("Chrome"),
    auth: state,
    ...options.connection,
  });
  store.bind(client.ev);
  await Client({ client, store });

  return { client, saveCreds, store };
};

async function getWAVersion() {
  try {
    const { version, isLatest } = await fetchLatestWaWebVersion();
    return { version, isLatest };
  } catch (err) {
    const { version, isLatest } = await fetchLatestBaileysVersion();
    return { version, isLatest };
  }
}

export { createClient };
export { getWAVersion };
export default {
  createClient,
  getWAVersion,
};
