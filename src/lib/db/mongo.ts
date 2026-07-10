import { MongoClient, type Db } from "mongodb";

const DB_NAME = "chess_opening_trainer";

// Next.js dev server hot-reloads modules on every save, which would create
// a fresh MongoClient (and connection pool) each time without this cache.
// Stashing the client promise on `globalThis` survives module reloads.
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGO_DB_URI;
  if (!uri) {
    throw new Error("MONGO_DB_URI environment variable is not set");
  }
  return new MongoClient(uri).connect();
}

// Production only needs a plain module-scoped cache: the module is loaded
// once per process. Development also stashes it on globalThis so the cache
// survives Next.js's module hot-reloading.
let clientPromise: Promise<MongoClient> | undefined;

function getClientPromise(): Promise<MongoClient> {
  const isDev = process.env.NODE_ENV === "development";
  const cached = isDev ? globalThis._mongoClientPromise : clientPromise;
  if (cached) return cached;

  const promise = createClientPromise().catch((error: unknown) => {
    // A transient failure (e.g. a dropped TLS handshake) shouldn't poison
    // every future request forever. Clear the cache so the next call
    // starts a fresh connection attempt instead of re-awaiting this same
    // rejected promise indefinitely.
    if (isDev) {
      globalThis._mongoClientPromise = undefined;
    } else {
      clientPromise = undefined;
    }
    throw error;
  });

  if (isDev) {
    globalThis._mongoClientPromise = promise;
  } else {
    clientPromise = promise;
  }
  return promise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(DB_NAME);
}
