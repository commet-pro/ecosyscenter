/* Sessão de usuário por cookie; credencial técnica legada só na memória. */
let resolveCenterSession;
const centerSessionReady=new Promise(resolve=>{resolveCenterSession=resolve;});
window.CenterAccess = {
  credential: '',
  user:null,
  ready:centerSessionReady,
  initialize(user){this.user=user;resolveCenterSession(user);document.dispatchEvent(new CustomEvent('center:session',{detail:user}));},
  async track(action,module,count=1){return this.request('events',{method:'POST',body:JSON.stringify({action,module,count})});},
  async request(path, options = {}) {
    const response = await fetch('/api/' + path, {...options,credentials:'same-origin',headers:{'Content-Type':'application/json',...(this.credential?{Authorization:'Bearer '+this.credential}:{})}});
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
