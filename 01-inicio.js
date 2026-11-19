window.__started = false;
setTimeout(function () {
  if (window.__started) return;
  var a = document.getElementById('app');
  var local = location.protocol === 'file:' || location.protocol === 'content:';
  a.className = 'w-full h-full flex flex-col items-center justify-center bg-brand text-white relative p-6 text-center';
  a.innerHTML = '<div style="font-size:56px">⚠️</div><h1 style="font-size:26px;font-weight:900;margin:10px 0">No se pudo cargar el juego</h1>' +
    '<p style="max-width:440px;opacity:.9;margin-bottom:16px;line-height:1.5">' +
    (local ? 'Estás abriendo el archivo directamente desde tu equipo. Los navegadores bloquean bases de datos locales así. <b>Sube el archivo a un servidor web</b> o ábrelo desde un entorno compatible.'
           : 'Revisa tu conexión a internet y asegúrate de que el navegador esté actualizado.') +
    '</p><button onclick="location.reload()" style="background:#fff;color:#46178f;font-weight:900;padding:12px 28px;border-radius:12px;box-shadow:0 6px 0 rgba(0,0,0,.2)">Reintentar</button>';
}, 10000);
