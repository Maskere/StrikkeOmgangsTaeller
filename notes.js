import { openDatabase } from "./db.js";

const {createApp } = Vue;

createApp({
    data(){
        return{
            allNotes:[],
            db:null,
        }
    },
    async created(){
        this.db = await openDatabase();

        const savedNotes = await this.getNotes();
        if(savedNotes){
            this.allNotes = savedNotes;
            console.log("Restores lastest notes");
        }
    },
    methods:{
        async getNotes(){
            return new Promise((resolve) => {
                if(!this.db){
                    reject("Database not initialized");
                    return;
                }

                const tx = this.db.transaction("notes","readonly");
                const store = tx.objectStore("notes");
                const request = store.getAll();

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
                });
        },
    }
}).mount("#app")
