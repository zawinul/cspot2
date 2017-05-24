var player = (function () {
	var base = null;
	var paused = false;
	var endOfSongCount = -1;
	function callPlayer(cmd) {
		var d = $.Deferred();
		getBaseDef.done(function (base) {
			$.getJSON(base + "?cmd=" + cmd)
				.done(function (data) {
					d.resolve(data);
				})
				.fail(function () {
					console.log('failed ' + cmd);
					d.reject();
				});
		});
		return d;
	}
	function playUri(uri) {
		callPlayer("play&url=" + escape(uri)).done(monitorTrigger);
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
		callPlayer("resume").done(monitorTrigger);
	}

	function seek(ms) {
		callPlayer("seek&ms=" + ms).done(monitorTrigger);
	}

	function setToken(token) {
		callPlayer("settoken&token=" + token).done(monitorTrigger);
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
		var isAndroid = (navigator.appVersion.toLowerCase().indexOf("android") >= 0);

		tryLocalhost();

		function tryLocalhost() {
			msg('trying localhost');
			testIp("127.0.0.1")
				.done(function () {
					msg('player on localhost')
				})
				.fail(() => {
					if (isAndroid)
						alert('non riesco a contattare il player');
					else
						getFromInternet();
				});
		}

		function getFromInternet() {
			$.get("http://www.andrenacci.com/getandset/get.php?name=spotifyip.txt")
				.done(function (ip) {
					msg('ip from ac: [' + ip + ']');
					ip = ip.trim();
					testIp(ip)
						.done(function () {
							msg("Found: " + ip);
						})
						.fail(askToUser);
				});
		}

		function askToUser() {
			var ip = localStorage.getItem('playerAddress') || "127.0.0.1";
			ip = prompt("player address", ip);
			msg("adrbase=" + base);
			testIp(ip);
		};

		function testIp(ip) {
			var d = $.Deferred();
			base = "http://" + ip + ":8080/";
			$.ajax({
				dataType: "json",
				url: base + "?cmd=ping",
				timeout: 2000
			}).done(function () {
				localStorage.setItem('playerAddress', ip);
				getBaseDef.resolve(base);
				saveIp(ip);
				d.resolve();
			}).fail(function () {
				d.reject();
			});
			return d;
		}
	}


	var statDef = null, monitorFun;
	var _status;
	function monitorTrigger() {
		if (monitorFun && !paused)
			monitorFun();
	}

	function saveIp(ip)  {
		$.post("http://www.andrenacci.com/getandset/set.php", {name:'spotifyip.txt', data:ip})
		.done(()=> msg('saveIp OK'))
		.fail(()=> msg('saveIP failed'));
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
		}
		monitorFun = f;
		function onStatusData(data) {
			var s = _status = JSON.parse(JSON.stringify(data));
			//console.log(s.endOfSongCount);
			delete s.input;
			if (paused)
				return;
			if (s.isPlaying && s.track) {
				s.time = now();
				s.songStartTime = s.time - s.positionMs;
				s.percPos = (s.positionMs / s.track.durationMs) * 100;
				console.log(s.percPos + ' %');
				s.remaining = s.track.durationMs - s.positionMs;
				positionDeferred.notify(s);
			}
			if (s.endOfSongCount > endOfSongCount) {
				endOfSongCount = s.endOfSongCount;
				endOfSongDeferred.notify();
			}
			statDef.notify(s);
		}
		setInterval(f, 1000);
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
			s.positionMs = now() - s.songStartTime;
			s.percPos = (s.positionMs / s.track.durationMs) * 100;
			s.remaining = s.track.durationMs - s.positionMs;
			console.log(s.percPos + ' %');
		}
		return s;
	}


	var _status = null;
	$(function () {
		spotlib.initialized.done(initGetBase);
	});

	return {
		playUri: playUri,
		// getAuth: getAuth,
		startStatusMonitor: startStatusMonitor,
		getStatus: getStatus,
		pollStatus: pollStatus,
		monitorTrigger: monitorTrigger,
		endOfSong: endOfSong,
		pause: pause,
		resume: resume,
		setToken: setToken,
		positionDeferred: positionDeferred,
		seek: seek,
		reinit:initGetBase
	};
})();