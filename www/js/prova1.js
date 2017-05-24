
var prova1;

(function () {



	var _tracks = null, div;
	var playlistId, songUri;
	var full;
	var currSong;
	var mainPlaylist;

	//$(function() {
	//    $('.prova1').click(initialize);
	//});

	var d = $.Deferred();

	function initializeLists() {

		var playlists = Rx.Observable
			.fromPromise(spotlib.getPlaylists())
			.flatMap(x => x.items)
			.doOnNext(function (x) { if (x.name == '__/A\\__') mainPlaylist = x; })
			.filter(x => (full || x.name == '__/A\\__'));

		if (full)
			playlists = chosePlaylists(playlists);

		playlists.flatMap(
			(x) => spotlib.getPlaylistTracksRx(x),
			(a, b) => ({ pl: a, song: b })
		)
			.toArray()
			.subscribe(function (tracks) {
				_tracks = tracks;
				d.resolve();
			});

		return d;
	}

	function obsDebug(obs, prefix) {
		var cnt = 0;
		obs.doOnNext((x) => console.log('deb_' + prefix + ': next ' + (cnt++)));
		obs.doOnCompleted((x) => console.log('deb_' + prefix + ': completed'));
		return obs;
	}

	function chosePlaylists(observable) {
		var k = $('<div/>').appendTo('body').addClass('select-playlist-div');
		observable.subscribe(function (pl) {
			var d = $('<div/>').data('pl', pl).appendTo(k).text(pl.name).addClass('item').click(function () {
				$(this).toggleClass('selected');
			});
			var x = (localStorage && localStorage.cspot2playlists)
				? JSON.parse(localStorage.cspot2playlists) : null;
			if (!x || x.indexOf(pl.name) >= 0)
				d.addClass('selected');
		});
		var button = $(
			`<div class="button" 
				style="width: 80%;text-align: center;margin-left: 5%;"
			>OK</div>`).appendTo(k);

		return Rx.Observable.create(function (observer) {
			console.log(' subscribe observer')
			button.click(onClick);

			function onClick() {
				var arr = [];
				$('.select-playlist-div .item.selected').each(function (idx, node) {
					observer.onNext($(node).data('pl'));
					arr.push($(node).data('pl').name);
				});
				k.remove();
				observer.onCompleted();
				if (full)
					localStorage.cspot2playlists = JSON.stringify(arr);
			};
		});
	}

	function initializePage() {
		var d = $.Deferred();
		$('<link>').appendTo('head').attr({ type: 'text/css', rel: 'stylesheet', href: 'css/prova1.css' });
		div = $('<div/>').addClass('prova1-container');
		$('.prova1').hide();
		div.load('prova1.html', {}, onLoad);
		function onLoad() {
			setTimeout(function () {
				//$('.b-next').click(nextSong);
				$('.info-container').click(nextSong);
				$('.b-delete').click(deleteThisSong);
				$('.b-add').click(addThisSong);
				$('.b-pause').click(pause);
				$('.b-resume').click(resume);
				$('.play-progress', div).click(playProgressClick);
				$('.b-resume').hide();
				onResize();
				$(window).resize(onResize);
				player.positionDeferred.progress(onPositionTimer);
			}, 200);
			div.appendTo('.main-container');
			d.resolve();

		}
		return d;
	}

	function onResize() {
		$('.play-progress').css({ top: $(window).height() - 30 });
	}
	var lastPosition;
	function onPositionTimer(s) {
		lastPosition = window.lastPosition = s;
		if (lastPosition && lastPosition.isPlaying && lastPosition.track) {
			// var t = now()-lastPosition.songStartTime;
			// var len = lastPosition.track.durationMs;
			var w = $('.play-progress').width() * lastPosition.percPos / 100;
			$('.play-progress .barra').animate({ width: w }, 100);
		}
	}

	function pause() {
		$('.b-resume').show();
		$('.b-pause').hide();
		player.pause();
	}

	pauseDeferred.progress(pause);

	function resume() {
		$('.b-resume').hide();
		$('.b-pause').show();
		player.resume();
	}

	resumeDeferred.progress(resume);

	function playProgressClick(evt) {
		console.log(evt);
		var x = evt.offsetX;
		if (lastPosition && lastPosition.isPlaying && lastPosition.track) {
			x = x * lastPosition.track.durationMs / $('.play-progress').width();
			x = Math.floor(x);
			player.seek(x);
			player.monitorTrigger();
		}

	}

	function deleteThisSong() {
		//alert('delete\n'+playlistId+'\n'+songUri);
		spotlib.deleteFromPlaylist(currSong.pl.id, currSong.song.uri)
			.done(function (result) {
				console.log({ result: result });
				msg('OK');
				//alert(JSON.stringify(result, null, 2));
			})
			.always(nextSong);
	}

	function addThisSong() {
		//alert('delete\n'+playlistId+'\n'+songUri);
		spotlib.addToPlaylist(mainPlaylist.id, currSong.song.uri)
			.done(function (result) {
				console.log({ result: result });
				msg('OK');
				//alert(JSON.stringify(result, null, 2));
			})
	}

	function initialize(_full) {
		full = _full;
		$('.app').fadeOut(1000);
		initializePage().done(function () {
			div.load('prova1.html', function () {
				initializeLists().done(function () {
					window.plugins.insomnia.keepAwake();

					player.endOfSong().progress(function () {
						console.log("--END OF SONG");
						nextSong();
					});
					nextSong();
				});
			});
		})
	}


	function nextSong() {

		var tr = _tracks[Math.floor(_tracks.length * Math.random())];
		currSong = tr;
		songUri = tr.song.uri;
		$(".titolo", div).text(tr.song.name);
		$(".artist", div).text(tr.song.artists[0].name);
		$(".album", div).text("from: " + tr.song.album.name);
		$(".playlist", div).text("playlist: " + tr.pl.name);
		//$(".cover", div).attr("src", tr.track.album.images[0].url);
		$('body').css({ backgroundImage: 'url("' + tr.song.album.images[0].url + '")' });
		player.playUri(tr.song.uri);
	};

	prova1 = initialize;

})();

$(function () {
	//var main = $('.main-commander');
	//var b1=$('<div><a href="#">prova1</a></div>').appendTo(main).click(function(){ prova1(false);});
	//var b2=$('<div><a href="#">prova2</a></div>').appendTo(main).click(function(){ prova1(true);});

	started.done(() => prova1(true));
})

