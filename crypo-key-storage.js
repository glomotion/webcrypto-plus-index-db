async function encryptDataSaveKey() {
  var data = await makeRandomData();
  console.log("generated data", data);
  var keys = await makeEncryptionKeys();
  var encrypted = await encrypt(data, keys);
  callOnStore((store) => {
    store.put({ id: 1, keys: keys, encrypted: encrypted });
  });
}

async function encryptCustomTextDataSaveKey(text) {
  var keys = await makeEncryptionKeys();
  var encoder = new TextEncoder();
  const encoded = encoder.encode(text);
  var encrypted = await encrypt(encoded, keys);
  callOnStore((store) => {
    store.put({ id: 1, keys: keys, encrypted: encrypted });
  });
}

function loadKeyDecryptData() {
  return new Promise((res) => {
    callOnStore((store) => {
      var getData = store.get(1);
      getData.onsuccess = async () => {
        var keys = getData.result.keys;
        var encrypted = getData.result.encrypted;
        var data = await decrypt(encrypted, keys);
        console.log("decrypted data:", data);
        res(data);
      };
    });
  });
}

function loadKeyDecryptTextData() {
  return new Promise((res) => {
    callOnStore((store) => {
      var getData = store.get(1);
      getData.onsuccess = async () => {
        var keys = getData.result.keys;
        var encrypted = getData.result.encrypted;
        var data = await decryptText(encrypted, keys);
        console.log("decrypted data:", data);
        res(data);
      };
    });
  });
}

function callOnStore(fn_) {
  // This works on all devices/browsers, and uses IndexedDBShim as a final fallback
  var indexedDB =
    window.indexedDB ||
    window.mozIndexedDB ||
    window.webkitIndexedDB ||
    window.msIndexedDB ||
    window.shimIndexedDB;

  // Open (or create) the database
  var open = indexedDB.open("MyDatabase", 1);

  // Create the schema
  open.onupgradeneeded = () => {
    var db = open.result;
    db.createObjectStore("MyObjectStore", { keyPath: "id" });
  };

  open.onsuccess = function () {
    // Start a new transaction
    var db = open.result;
    var tx = db.transaction("MyObjectStore", "readwrite");
    var store = tx.objectStore("MyObjectStore");

    fn_(store);

    // Close the db when the transaction is done
    tx.oncomplete = function () {
      db.close();
    };
  };
}

// @TODO: not sure what this is or why its needed.... ?
// async function encryptDecrypt() {
//   var data = await makeData();
//   console.log("generated data", data);
//   var keys = await makeKeys();
//   var encrypted = await encrypt(data, keys);
//   console.log("encrypted", encrypted);
//   var finalData = await decrypt(encrypted, keys);
//   console.log("decrypted data", finalData);
// }

function makeRandomData() {
  return window.crypto.getRandomValues(new Uint8Array(16));
}

function makeEncryptionKeys() {
  return window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048, // can be 1024, 2048, or 4096
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: { name: "SHA-256" }, // can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
    },
    // false, // whether the key is extractable (i.e. can be used in exportKey)
    true,
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

async function decrypt(data, keys) {
  return new Uint8Array(
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
