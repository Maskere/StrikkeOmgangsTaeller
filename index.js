const {createApp } = Vue;

createApp({
    components: {
        "vue-pdf-embed":VuePdfEmbed
    },
    data(){
        return{
            currentPDF:null,
            counter:0,
            db:null,
        }
    },
    async created(){
        this.db = await this.initDB();

        const savedFile = await this.getFile();
        if(savedFile){
            this.currentPDF = URL.createObjectURL(savedFile);
            console.log("Restored PDF from database");
        }

        const savedCounter = await this.getCounter();
        if(savedCounter){
            this.counter = savedCounter;
            console.log("Restored counter from database");
        }
    },
    methods:{
        initDB(){
            return new Promise((resolve) => {
                const request = indexedDB.open("PDFStorage", 2);

                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if(!db.objectStoreNames.contains("files")){
                        db.createObjectStore("files");
                    }

                    if(!db.objectStoreNames.contains("counter")){
                        db.createObjectStore("counter");
                    }
                };
                request.onsuccess = (e) => resolve(e.target.result);
            });
        },
        async saveFile(file){
            const tx = this.db.transaction("files", "readwrite");
            tx.objectStore("files").put(file,"lastUploadedPDF");
        },
        async saveCounter(value){
            const tx = this.db.transaction("counter", "readwrite");
            tx.objectStore("counter").put(value, "pageCount");
        },
        getFile(){
            return new Promise((resolve) => {
                const tx = this.db.transaction("files","readonly");
                const request = tx.objectStore("files").get("lastUploadedPDF");
                request.onsuccess = () => resolve(request.result);
            });
        },
        async getCounter(){
            return new Promise((resolve) => {
                const tx = this.db.transaction("counter", "readonly");
                const request = tx.objectStore("counter").get("pageCount");
                request.onsuccess = () => resolve(request.result || 0);
            });
        },
        async getPDF(event){
            const file = event.target.files;
            if(!file) return;

            if(file[0].type === "application/pdf"){
                if(this.currentPDF) URL.revokeObjectURL(this.currentPDF);

                this.currentPDF = URL.createObjectURL(file[0]);
                await this.saveFile(file[0]);
            }
        },
        async removeCurrentPDF(){
            if(window.confirm("Remove current PDF?")){
                const tx = this.db.transaction("files","readwrite");
                tx.objectStore("files").delete("lastUploadedPDF");
                this.currentPDF = null;
            }
        },
        incrementCounter(){
            this.counter++;
            this.saveCounter(this.counter);
        },
        decreaseCounter(){
            this.counter--;
            this.saveCounter(this.counter);
        }
    }
}).mount("#app")
