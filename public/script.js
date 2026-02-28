const cursor = document.getElementById('cursor');
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

if(isMobile){
  cursor.style.display = 'block';
  document.addEventListener('touchmove', e => {
    const touch = e.touches[0];
    cursor.style.left = touch.pageX - 16 + 'px';
    cursor.style.top = touch.pageY - 16 + 'px';
  });
}

function setCursor(name){
  if(!isMobile){
    document.body.style.cursor = `url('cursors/${name}'), auto`;
    const links = document.querySelectorAll('a, button');
    links.forEach(el => el.style.cursor = `url('cursors/${name}'), pointer`);
  } else {
    cursor.style.backgroundImage = `url('cursors/${name}')`;
  }
}
