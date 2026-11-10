/* Zona Bridge list plugin 0.3 for Lampa. TV address 192.168.1.10:8765.
   Displays only streams supplied by your OWN local Zona resolver (not included).
   Adds a distinct "Zona" button and does not override the previous Zona plugin.
*/
(function () {
 'use strict';
 if (window.zonaBridgePluginV03Loaded) return;
 window.zonaBridgePluginV03Loaded = true;
 var BASE='http://192.168.1.10:8765';
 var BUTTON='view--zona-launcher-v02';
 function notify(s){ try {Lampa.Noty.show(s)} catch(e){console.log('[Zona Bridge] '+s)} }
 function currentController(){try{return Lampa.Controller.enabled().name}catch(e){return 'content'}}
 function movieId(m){var id=m.kinopoisk_id||m.kp_id||m.kpId||m.kinopoiskId||'';return /^[0-9]{1,15}$/.test(String(id))?String(id):''}
 function movieTitle(m){return m.title||m.name||m.original_title||m.original_name||'Фильм'}
 function request(url,cb){
   $.ajax({url:url,type:'GET',dataType:'json',timeout:105000,success:function(data){cb(null,data)},error:function(xhr,status){
     var err=(xhr.responseJSON&&xhr.responseJSON.error)||('Нет ответа от Zona Bridge: '+status);
     cb(new Error(err));
   }});
 }
 function streamMenu(movie,row){
   var quality=Array.isArray(row.streamquality)?row.streamquality:[];
   var items=quality.map(function(v,i){return {title:v.quality||('Вариант '+(i+1)),url:v.url,act:'play'}})
   if(!items.length && (row.url||row.stream))items.push({title:row.name||'Воспроизвести',url:row.url||row.stream,act:'play'});
   if(!items.length){notify('Нет воспроизводимых потоков');return}
   var previous=currentController();
   Lampa.Select.show({title:(row.name||movieTitle(movie))+' — качество',items:items,
      onBack:function(){Lampa.Controller.toggle(previous)},
      onSelect:function(choice){
        Lampa.Controller.toggle(previous);
        try {var obj={url:choice.url,title:movieTitle(movie)+' — '+(row.name||'Zona')+' — '+choice.title};
        Lampa.Player.play(obj);Lampa.Player.playlist([obj]);}
        catch(e){notify('Не удалось запустить плеер: '+(e.message||e))}
      }
   });
 }
 function showLinks(movie,items,title){
   var previous=currentController();
   Lampa.Select.show({title:title,items:items.map(function(row){return {title:row.name||row.title||'Источник',row:row}}),
     onBack:function(){Lampa.Controller.toggle(previous)},
     onSelect:function(chosen){
       Lampa.Controller.toggle(previous);
       var row=chosen.row;
       if(row.method==='link') {
          var extra={}; if(typeof row.id==='number'&&row.url&&row.url.indexOf('&s=')!==-1)extra.s=row.id;
          if(typeof row.s==='number')extra.s=row.s;
          if(typeof row.e==='number')extra.e=row.e;
          fetchSources(movie,extra);
       } else streamMenu(movie,row);
     }
   });
 }
 function fetchSources(movie,extra){
   notify('Проверяю связь с Zona Bridge…');
   request(BASE+'/health',function(err,health){
     if(err){notify('Zona Bridge недоступен: проверь ПК 192.168.1.10 и порт 8765');return}
     if(!health.zona_resolver_reachable){
       notify('Zona Bridge работает, но источник файлов Zona ещё не запущен на ПК (порт 18118).');return
     }
     var id=movieId(movie);
     if(!id){notify('Не найден Kinopoisk ID. Нужен Kinopoisk ID фильма; TMDB ID не подходит.');return}
     var params={kinopoisk_id:id,title:movieTitle(movie),original_title:movie.original_title||movie.original_name||''};
     Object.keys(extra||{}).forEach(function(k){params[k]=extra[k]});
     request(BASE+'/api/streams?'+$.param(params),function(err,data){
       if(err){notify(err.message);return}
       if(!data||!data.ok||!Array.isArray(data.data)||!data.data.length){notify((data&&data.error)||'Список потоков пуст');return}
       showLinks(movie,data.data,'Zona — '+movieTitle(movie));
     });
   });
 }
 function addButton(e){
  if(!e||!e.object||!e.object.activity||typeof e.object.activity.render!=='function')return;
  var root=e.object.activity.render(); if(!root||!root.find||root.find('.'+BUTTON).length)return;
  var box=root.find('.full-start-new__buttons, .full-start__buttons').eq(0);if(!box.length)return;
  var movie=e.data&&e.data.movie?e.data.movie:{};
  var button=$('<div class="full-start__button selector '+BUTTON+'"><svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg><span>Zona</span></div>');
  button.on('hover:enter',function(){fetchSources(movie,{})});
  box.append(button);
 }
 function start(){ if(!window.Lampa||!Lampa.Listener||!Lampa.Listener.follow)return;
    Lampa.Listener.follow('full',function(e){if(e&&e.type==='complite')addButton(e)});
    notify('Zona Bridge: кнопка Zona подключена к ПК');
 }
 if(window.appready)start();else if(window.Lampa&&Lampa.Listener)Lampa.Listener.follow('app',function(e){if(e.type==='ready')start()});
}());
