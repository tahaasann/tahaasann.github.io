let name = document.querySelector("#name");
        let veri = document.querySelector("#veri");
        let buton = document.querySelector("#ekle");
        buton.addEventListener("click",function(){
        
            name.innerHTML = veri.value;
            if(veri.value = "Taha S. ASAN")
            {
                alert("Hoşgeldin Taha Bey");
            }
})
