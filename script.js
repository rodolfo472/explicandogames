const iframe = document.getElementById("browser")
const urlBar = document.getElementById("url")
const home = document.getElementById("home")

function openSite(site){

iframe.style.display="block"
home.style.display="none"

iframe.src = site
urlBar.value = site

}

urlBar.addEventListener("keydown",function(e){

if(e.key==="Enter"){

let value = urlBar.value

if(!value.startsWith("http")){
value="https://www.google.com/search?q="+value
}

openSite(value)

}

})

document.getElementById("reload").onclick=()=>{

iframe.src=iframe.src

}

document.getElementById("back").onclick=()=>{

iframe.contentWindow.history.back()

}

document.getElementById("forward").onclick=()=>{

iframe.contentWindow.history.forward()

}

document.getElementById("favorite").onclick=()=>{

alert("Site adicionado aos favoritos ⭐")

}

document.getElementById("settings").onclick=()=>{

alert("Configurações do WebBrother")

}

document.getElementById("searchHome").addEventListener("keydown",function(e){

if(e.key==="Enter"){

openSite("https://www.google.com/search?q="+this.value)

}

})
