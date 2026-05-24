const {createApp } = Vue;

createApp({
    components: {
        "vue-pdf-embed":VuePdfEmbed
    },
    data(){
        return{
            currentPDF:null,
            currentPage:1,
            totalPages:0,
            counter:0,
            db:null,
            wakeLock: null,
            showNewNote:false,
            newNoteText:"",
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

        const savedNotes = await this.getNotes();
        if(savedNotes){
            console.log("Restores lastest notes");
        }
    },
    async mounted(){
        document.addEventListener("visibilitychange", async () => {
            if(this.wakeLock !== null && document.visibilityState === "visible"){
                await this.requestWakeLock();
            }
        });
    },
    methods:{
        async initDB(){
            return new Promise((resolve) => {
                const request = indexedDB.open("PDFStorage", 4);

                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
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
                request.onsuccess = (e) => resolve(e.target.result);
            });
        },
        async saveFile(file){
            const tx = this.db.transaction("files", "readwrite");
            tx.objectStore("files").put(file,"lastUploadedPDF");
        },
        async saveCounter(value){
            const tx = this.db.transaction("counter", "readwrite");
            tx.objectStore("counter").put(value, "currentCounter");
        },
        async saveNote(note){
            const tx = this.db.transaction("notes","readwrite");
            tx.objectStore("notes").put(note,"newNote");
        },
        async getFile(){
            return new Promise((resolve) => {
                const tx = this.db.transaction("files","readonly");
                const request = tx.objectStore("files").get("lastUploadedPDF");
                request.onsuccess = () => resolve(request.result);
            });
        },
        async getCounter(){
            return new Promise((resolve) => {
                const tx = this.db.transaction("counter", "readonly");
                const request = tx.objectStore("counter").get("currentCounter");
                request.onsuccess = () => resolve(request.result || 0);
            });
        },
        async getNotes(){
            return new Promise((resolve) => {
                const tx = this.db.transaction("notes","readonly");
                const request = tx.objectStore("notes").get("latestNewNote");
                request.onsuccess = () => resolve(request.result);
                });
        },
        async getCurrentPage(){
            return new Promise((resolve) => {
                const tx = this.db.transaction("pageCount", "readonly");
                const request = tx.objectStore("pageCount").get("pdfLastPage");
                request.onsuccess = () => resolve(request.result || 1);
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

            if(!this.wakeLock){
                this.requestWakeLock();
            }
        },
        decreaseCounter(){
            this.counter--;
            this.saveCounter(this.counter);
        },
        resetCounter(){
            this.counter = 0;
            this.saveCounter(this.counter);
        },
        goToNotes(){
            window.location = "./notes.html";
        },
        addNewNote(){
            this.showNewNote = !this.showNewNote;
        },
        async saveNewNote(newNote){
            const tx = this.db.transaction("notes","readwrite");
            const request = tx.objectStore("notes").put(newNote,"latestNewNote");
            if(request){
                window.location.reload();
            }
        },
        handleScroll(event){
            const container = event.target;
            const scrollTop = container.scrollTop;
            const firstPage = container.querySelector("canvas, .vue-pdf-embed > div");

            if(firstPage){
                const pageHeight = firstPage.offsetHeight;

                const newPage = Math.floor(scrollTop / pageHeight) + 1;

                if(this.currentPage !== newPage){
                    this.currentPage = newPage;
                    this.saveLastPage(this.currentPage);
                }
            }
        },
        async saveLastPage(page){
            const tx = this.db.transaction("pageCount", "readwrite");
            tx.objectStore("pageCount").put(page, "pdfLastPage");
        },
        async onPdfRendered() {
            const savedPage = await this.getCurrentPage();
            this.currentPage = savedPage;

            // Use a unique name for the timer so we can stop it
            const scrollTimer = setInterval(() => {
                const container = this.$refs.pdfWindow;
                // Check for canvas OR the wrapper div to be sure it's visible
                const firstPage = container?.querySelector("canvas, .vue-pdf-embed > div");

                if (container && firstPage && firstPage.offsetHeight > 0) {
                    const pageHeight = firstPage.offsetHeight;
                    container.scrollTop = (this.currentPage - 1) * pageHeight;

                    console.log("Success! Scrolled to page:", this.currentPage);

                    // STOP the timer so the user can scroll freely now
                    clearInterval(scrollTimer);
                }
            }, 100);
        },
        async requestWakeLock(){
            try{
                if("wakeLock" in navigator){
                    this.wakeLock = await navigator.wakeLock.request("screen");
                    console.log("Screen Wake Lock is Active");

                    this.wakeLock.addEventListener("release", () =>{
                        console.log("Screen Wake Lock was released");
                        this.wakeLock = null;
                    });
                }
            }
            catch(err){
                console.error("${err.name}, ${err.message}");
            }
        },
        releaseWakeLock(){
            if(this.wakeLock){
                this.wakeLock.release();
                this.wakeLock = null;
            }
        },
    }
}).mount("#app")
