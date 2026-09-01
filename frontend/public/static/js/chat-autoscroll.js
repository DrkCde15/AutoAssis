(function () {
        function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
        function openMechanics() {
          var modal = document.getElementById('mechanicsModal');
          var list = document.getElementById('mechanicsList');
          var sub = document.getElementById('mechanicsSub');
          list.innerHTML = 'Obtendo localização...';
          modal.classList.add('open');
          if (!navigator.geolocation) { sub.textContent = 'Geolocalização não suportada neste navegador.'; list.innerHTML=''; return; }
          navigator.geolocation.getCurrentPosition(function (pos) {
            var lat = pos.coords.latitude, lng = pos.coords.longitude;
            sub.textContent = 'Buscando oficinas próximas...';
            fetch('/api/mechanics/search?lat=' + lat + '&lng=' + lng + '&limit=15')
              .then(function(r){ return r.json(); })
              .then(function(data){
                if (!data.mechanics || !data.mechanics.length) { list.innerHTML = '<p class="modp-aviso">Nenhuma oficina encontrada por perto.</p>'; return; }
                list.innerHTML = data.mechanics.map(function(m){
                  var dist = m.distance_km != null ? m.distance_km + ' km' : '';
                  var tel = m.telefone ? '<a href="tel:' + esc(m.telefone) + '" class="btn-action" style="font-size:.75rem;">Ligar</a>' : '';
                  var esp = (m.especialidades && m.especialidades.length) ? m.especialidades.slice(0,3).join(', ') : '';
                  return '<div class="mech-item"><div class="mech-head"><strong>' + esc(m.nome||'Oficina') + '</strong><span class="mech-dist">' + esc(dist) + '</span></div>'
                    + '<div class="mech-meta">' + esc([m.cidade,m.estado].filter(Boolean).join(' - ')) + '</div>'
                    + (esp ? '<div class="mech-esp">' + esc(esp) + '</div>' : '')
                    + (tel ? '<div class="mech-actions">' + tel + '</div>' : '') + '</div>';
                }).join('');
              })
              .catch(function(){ list.innerHTML = '<p class="modp-aviso">Erro ao buscar oficinas.</p>'; });
          }, function () {
            sub.textContent = 'Permita a localização para buscar oficinas próximas.';
            list.innerHTML = '';
          }, { enableHighAccuracy: false, timeout: 8000 });
        }
        var fab = document.getElementById('conciergeFab');
        if (fab) fab.addEventListener('click', openMechanics);
        var closeBtn = document.getElementById('mechanicsClose');
        if (closeBtn) closeBtn.addEventListener('click', function(){ document.getElementById('mechanicsModal').classList.remove('open'); });
        var mmodal = document.getElementById('mechanicsModal');
        if (mmodal) mmodal.addEventListener('click', function(e){ if (e.target.id === 'mechanicsModal') mmodal.classList.remove('open'); });
      })();
