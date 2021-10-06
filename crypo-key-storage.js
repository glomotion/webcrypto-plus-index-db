async function encryptCustomTextDataSaveKey(text) {
  const keys = await makeEncryptionKeys();
  const encoder = new TextEncoder();
  const encoded = encoder.encode(text);
  const encrypted = await encrypt(encoded, keys);
  callOnStore((store) =>
    store.put({ id: 1, keys: keys, encrypted: encrypted })
  );
}

function loadKeyDecryptTextData() {
  return new Promise((res, rej) => {
    callOnStore((store) => {
      const getData = store.get(1);
      getData.onsuccess = async () => {
        if (!getData.result) return rej(Error("Oh Snap! No data here!"));
        const { keys } = getData.result;
        const { encrypted } = getData.result;
        console.log("encrypted data:", encrypted);
        const data = await decryptText(encrypted, keys);
        console.log("decrypted data:", data);
        return res(data);
      };
    });
  });
}

function callOnStore(callbackFunction) {
  // This works on all devices/browsers, and uses IndexedDBShim as a final fallback
  const indexedDB =
    window.indexedDB ||
    window.mozIndexedDB ||
    window.webkitIndexedDB ||
    window.msIndexedDB ||
    window.shimIndexedDB;

  // Open (or create) the database
  const open = indexedDB.open("ImxLinkDB", 1);

  // Create the schema
  open.onupgradeneeded = () => {
    const db = open.result;
    db.createObjectStore("ImxLinkDB__store", { keyPath: "id" });
  };

  open.onsuccess = () => {
    // Start a new transaction
    const db = open.result;
    const tx = db.transaction("ImxLinkDB__store", "readwrite");
    const store = tx.objectStore("ImxLinkDB__store");

    callbackFunction(store);

    // Close the db when the transaction is done
    tx.oncomplete = () => db.close();
  };
}

function makeEncryptionKeys() {
  return window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048, // can be 1024, 2048, or 4096
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: { name: "SHA-256" }, // can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
    },
    false, // whether the key is extractable (i.e. can be used in exportKey)
    ["encrypt", "decrypt"] // must be ["encrypt", "decrypt"] or ["wrapKey", "unwrapKey"]
  );
}

function encrypt(data, keys) {
  return window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
      // label: Uint8Array([...]) // optional
    },
    keys.publicKey, // from generateKey or importKey above
    data // ArrayBuffer of data you want to encrypt
  );
}

async function decryptText(data, keys) {
  const decoder = new TextDecoder();
  return decoder.decode(
    await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
        // label: Uint8Array([...]) // optional
      },
      keys.privateKey, // from generateKey or importKey above
      data // ArrayBuffer of the data
    )
  );
}
