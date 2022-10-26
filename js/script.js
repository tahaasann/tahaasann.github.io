let name = document.querySelector("#name");
        let veri = document.querySelector("#veri");
        let buton = document.querySelector("#ekle");
        buton.addEventListener("click",function(){
        
            name.innerHTML = veri.value;
            
            
})

const url = req.url;

    if(url === '/'){
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write('<h2>INDEX SAYFASINA HOSGELDINIZ</h2>');
    }
    else if(url === '/hakkimda'){
        res.writeHead(200, {'Content-Type':'text/html'});
        res.write('<h2>HAKKIMDA SAYFASINA HOSGELDINIZ</h2>');
    }
    else if(url === '/iletisim'){
        res.writeHead(200, {'Content-Type':'text/html'});
        res.write('<h2>ILETISIM SAYFASINA HOSGELDINIZ</h2>');
    }
    else{
        res.writeHead(404, {'Content-Type':'text/html'});
        res.write('<h2>404 NOT FOUND</h2>');
    }
    res.end();

});
