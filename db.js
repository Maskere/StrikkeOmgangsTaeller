const DB_NAME = "PDFStorage";
const DB_VERSION = 4;

export function openDatabase(){
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME,DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if(!db.objectStoreNames.contains("files")){
                db.createObjectStore("files");
            }

            if(!db.objectStoreNames.contains("counter")){
                db.createObjectStore("counter");
            }

            if(!db.objectStoreNames.contains("pageCount")){
                db.createObjectStore("pageCount");
            }

            if(!db.objectStoreNames.contains("notes")){
                db.createObjectStore("notes");
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}
