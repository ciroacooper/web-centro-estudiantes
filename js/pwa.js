if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(function (reg) {
      reg.update();
    })
    .catch(function () {});
}
