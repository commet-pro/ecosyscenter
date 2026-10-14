/* Credencial individual somente na memória da aba. */
window.CenterAccess = {
  credential: '',
  async request(path, options = {}) {
    const response = await fetch('/api/' + path, {...options, headers:{'Content-Type':'application/json',Authorization:'Bearer '+this.credential}});
    let data;
    try { data = await response.json(); } catch { throw Error('Este módulo precisa do servidor Center. A hospedagem estática não oferece a API.'); }
    if (!response.ok) throw Error(data.error || 'Não foi possível concluir.');
    return data;
  },
  locate() {
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation) return reject(Error('Localização indisponível. Use HTTPS e um navegador compatível.'));
      navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy}),()=>reject(Error('Permita a localização para registrar a emissão.')),{enableHighAccuracy:true,timeout:15000,maximumAge:0});
    });
  }
};
