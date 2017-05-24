var player = (function(){
    var base = null;
    var paused = false;
    var endOfSongCount = -1;
    function callPlayer(cmd) {
        var d = $.Deferred();
        getBaseDef.done(function(base){
            $.getJSON(base+"?cmd="+cmd)
                .done(function(data){
                    d.resolve(data);
                })
                .fail(function(){
                    console.log('failed '+cmd);
                    d.reject();
                });
        });
        return d;
    }
    function playUri(uri) {
        callPlayer("play&url="+escape(uri)).done(monitorTrigger);
        getStatus();
    } 
    
    function pause() {
        console.log("called: pause");
        paused = true;
        callPlayer("pause").done(monitorTrigger);
    } 
    
    function resume() {
        console.log("called: resume");
        paused = false;
        callPlayer("resume").done(monitorTrigger);;
    } 
    
    function seek(ms) {
        callPlayer("seek&ms="+ms).done(monitorTrigger);
    } 
    
    function setToken(token) {
        callPlayer("settoken&token="+token).done(monitorTrigger);
    } 
    
//    function getBase() {
//        if (!base) {
//            var adr = localStorage.getItem('playerAddress') || "127.0.0.1";
//            adr = prompt("player address", adr);
//            localStorage.setItem('playerAddress', adr);
//            base = "http://"+adr+":8080/";
//            console.log("adrbase="+base);
//        }  
//        return base;
//    }

	var getBaseDef = $.Deferred();
   //getBaseDef.done(function(b) { alert('base='+b);});
	function initGetBase() {
        //alert('initGetBase');
        tryLocalhost();
        
        function tryLocalhost() {
            msg('trying localhost');
            testIp("127.0.0.1")
                .done(function(){
                    msg('player on localhost')
                })
                .fail(getFromInternet)
        }
        
        function getFromInternet() {
            $.get("http://www.andrenacci.com/getandset/get.php?name=spotifyip.txt")
                .done(function(ip)  { 
                    msg('ip from ac: ['+ip+']');
                    ip = ip.trim();
                    testIp(ip)
                        .done(function() { 
                            msg("Found: "+ip);
                        })
                        .fail(askToUser);
                })
                .fail(function(){ 
                });
        }
        
//        getFromInternet().fail(function(){
//            var ip = localStorage.getItem('playerAddress') || "127.0.0.1";
//            msg("testLocal "+ip);
//            testIp(ip)
//                .done(function() { 
//                    console.log('done from saved addr');
//                })
//                .fail(askToUser);
//        });
        
        function askToUser() {
            var ip = localStorage.getItem('playerAddress') || "127.0.0.1";
            ip = prompt("player address", ip);
            msg("adrbase="+base);
            testIp(ip);
        };
        
        function testIp(ip) {
            // per ora mi fido
            var d = $.Deferred();
            base = "http://"+ip+":8080/"; 
            $.ajax({
                dataType: "json",
                url: base+"?cmd=ping",
                timeout:3000
            })
            .done(function(){
                localStorage.setItem('playerAddress', ip);
                getBaseDef.resolve(base);
                d.resolve();                    
            })
            .fail(function(){
                d.reject();
            });
            return d;
        }        
	 }
    

    var statDef=null;
    var _status;
    var trig = function() {};
    function monitorTrigger() {
        if (trig)
            trig();
    }
    function startStatusMonitor() {
        if (statDef)
            return;
        statDef = $.Deferred();
        var status = {};
        var tm = null;
        
        function f() {
            if (!paused)
                callPlayer("getStatus").done(onStatusData);
            if (tm)
                clearTimeout(tm);
            trig(500);
        }
        
        trig = function(delta) {
            if (!delta)
                delta = 0;
            if (tm)
                clearTimeout(tm);
            //console.log('next time: '+delta);
            tm = setTimeout(f, delta);
        };
        
        function onStatusData(data) {
            var s = _status = JSON.parse(JSON.stringify(data));
            delete s.input;
            var k = 0;
            if (paused)
                return;
            if (s.isPlaying && s.track) {
                s.time = (new Date()).getTime();
                s.songStartTime = now()-s.positionMs;
                s.percPos = (s.positionMs/s.track.durationMs)*100;
                console.log(s.percPos+' %');
                s.remaining = s.track.durationMs-s.positionMs;
                positionDeferred.notify(s);
                k = s.remaining/2;
                if (k>10000)
                    k = 10000;
                if (k<100)
                    k = 100;
            }
            if (s.endOfSongCount>endOfSongCount) {
                endOfSongCount = s.endOfSongCount;
                endOfSongDeferred.notify();
            }
//            if (!s.isPlaying && s.track) {
//                if (!_endOfSong) {
//                    _endOfSong = true;
//                    console.log('++endOfSong '+paused);
//                    endOfSongDeferred.notify();
//                }
//           }
//            else
//                _endOfSong = false;
            statDef.notify(s);
            if(k)
                trig(k);
        }
        
        f();
    }

    var endOfSongDeferred = $.Deferred();
    var positionDeferred = $.Deferred();
    var _endOfSong = false;

    function endOfSong() {
        startStatusMonitor();
        return endOfSongDeferred;
    }

    function getStatus() {
        startStatusMonitor();
        return statDef;
    }
    
    function pollStatus() {
        startStatusMonitor();
        var s = _status;
        if (s.isPlaying && s.track) {
            s.positionMs = now()-s.songStartTime;
            s.percPos = (s.positionMs/s.track.durationMs)*100;
            s.remaining = s.track.durationMs-s.positionMs;
            console.log(s.percPos+' %');
        }

        return s;
    }
    
//    function getAuth() {
//        var k = $.Deferred();
//        callPlayer("getauth")
//            .done(function (data) { 
//                k.resolve(data.token); 
//            })
//            .fail(function() {
//                alert('error on get auth');
//            });
//
//        return k;
//    }
    
    var _status = null;
    $(function(){
        spotlib.initialized.done(initGetBase);
    });

    return {
        playUri: playUri,
        // getAuth: getAuth,
        getStatus: getStatus,
        pollStatus: pollStatus,
        monitorTrigger: monitorTrigger,
        endOfSong: endOfSong,
        pause:pause,
        resume:resume,
        setToken: setToken,
        position: positionDeferred,
        seek:seek
    };
})();