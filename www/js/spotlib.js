var spotlib = {
	profile: null,
	playlists: null,
	playlist: {},
	initialized: $.Deferred()
};

(function () {

	var cs_count = 0;

	function callSpotify(url, data, opts) {
		var count = cs_count++;
		var d = $.Deferred();
		var opt = {
			method: 'get',
			dataType: 'text',
			jsonp: false,
			cache: false,
			//traditional:true,
			//contentType :'text/plain',
			//crossDomain:false,
			headers: {
				'Authorization': 'Bearer ' + spotlib.access_token
			},
			success: function (x) {
				console.log({ callSpotify: x });
				try {
					x = JSON.parse(x);
				} catch (e) { }
				d.resolve(x);

				//msg("cs "+count+" DONE");
			},
			error: function (jqXHR, textStatus, errorThrown) {
				msg("cs " + count + " " + errorThrown);
			}
		};
		if (data)
			opt.data = data;
		if (opts)
			$.extend(opt, opts);
		$.ajax(url, opt);
		return d;
	}

	function deleteFromPlaylistDEBUG(playlistId, songUri) {
		debugger;
		var d = $.Deferred();
		var countUrl = "https://api.spotify.com/v1/users/"+ spotlib.profile.id + "/playlists/"+playlistId;
		callSpotify(countUrl).done((x)=> {
			alert(x.tracks.total);
			var url = "https://api.spotify.com/v1/users/" + spotlib.profile.id + "/playlists/" + playlistId + "/tracks";

			var opts = {
				method: 'delete'
			};
			var data = JSON.stringify({
				tracks: [	{ uri: songUri }]
			});

			var d2 = callSpotify(url, data, opts);
			d2.done((y)=>{
				callSpotify(countUrl).done((x)=> {
					alert(x.tracks.total);			
					d.resolve(y);			
				});	
			})
		})
		return d;
	}

	function deleteFromPlaylist(playlistId, songUri) {

		
		
		//return deleteFromPlaylistDEBUG(playlistId, songUri);



		var url = "https://api.spotify.com/v1/users/" + spotlib.profile.id + "/playlists/" + playlistId + "/tracks";

		var opts = {
			method: 'delete'
		};
		var data = JSON.stringify({
			tracks: [
				{ uri: songUri }
			]
		});

		var d = callSpotify(url, data, opts);
		return d;
	}

	function addToPlaylist(playlistId, songUri) {
		var url = "https://api.spotify.com/v1/users/" + spotlib.profile.id + "/playlists/" + playlistId + "/tracks";
		url += "?uris=" + escape(songUri);

		var opts = {
			method: 'post'
		};
		//   var data = { 
		//       uris: songUri
		//   };
		var data = null;

		var d = callSpotify(url, data, opts);
		return d;
	}


	function getProfile() {
		console.log('getProfile');
		return callSpotify("https://api.spotify.com/v1/me").done(function (x) {
			spotlib.profile = x;
		});
	}

	function getPlaylists() {
		console.log('getPlaylists');
		return callSpotify("https://api.spotify.com/v1/me/playlists", { limit: 50 }).done(function (x) {
			spotlib.playlists = x;
		});
	}

	function getFeaturedPlaylists() {
		var opt = {
			limit: 50,
			//timestamp:'2015-12-28T12:05:00',
			country: 'IT'
		};
		var u = 'https://api.spotify.com/v1/browse/featured-playlists';
		var d = callSpotify(u, opt);
		d.done(function (x) {
			spotlib.featuredPlaylists = x.playlists;
		});
		return d;
	}

	function getGenres() {
		var opt = {
			limit: 100
		};
		var u = 'https://api.spotify.com/v1/recommendations/available-genre-seeds';
		var d = callSpotify(u, opt);
		d.done(function (x) {
			spotlib.genres = x.genres;
		});
		return d;

	}


	function getRecommendations() {
		var opt = {
			limit: 100
		};
		var u = 'https://api.spotify.com/v1/recommendations/recommendations';
		var d = callSpotify(u, opt);
		d.done(function (x) {
			spotlib.recommendations = x.genres;
		});
		return d;

	}

	function getTopArtists() {

		var u = 'https://api.spotify.com/v1/me/top/artists?limit=100';
		var d = callSpotify(u);
		d.done(function (x) {
			spotlib.topArtists = x.items;
		});
		return d;
	}

	function getTopTracks() {

		var u = 'https://api.spotify.com/v1/me/top/tracks?limit=100';
		var d = callSpotify(u);
		d.done(function (x) {
			spotlib.topTracks = x.items;
		});
		return d;
	}

	function getCategories() {
		var opt = {
			limit: 50,
			country: 'IT',
			locale: 'it_IT'
		};
		var u = 'https://api.spotify.com/v1/browse/categories';
		var d = callSpotify(u, opt);
		d.done(function (x) {
			spotlib.categories = x.categories;
		});
		return d;
	}

	function getPlaylistTracksRx(plist) {
		console.log('getPlaylistTracksRx ' + plist.name);
		console.log(plist);
		var limit = 100;

		var k = [], c = 0;

		while (true) {
			console.log(c);
			k.push([c, limit]);
			c += limit;
			if (c > plist.tracks.total)
				break;
		}

		return Rx.Observable
			.from(k)
			.flatMap(function (a) {
				var u = plist.href + "/tracks?offset=" + a[0] + "&limit=" + a[1];
				console.log(u);
				return Rx.Observable.fromPromise(callSpotify(u));
			})
			//    .doOnNext(function(x) { console.log({x2:x}); })
			.flatMap(x => x.items)
			.map(x => x.track)
		//    .doOnNext(function(x) { console.log({x3:x}); })

	}


	function getPlaylistTracks(plist) {
		console.log('getPlaylistTracks ' + plist.name);
		var limit = 100;
		var offsetbase = 0;
		var offset = offsetbase;
		var ret = $.Deferred();

		function f() {
			console.log('get offset=' + offset);
			var u = plist.href;
			u += "/tracks?offset=" + offset + "&limit=" + limit;
			callSpotify(u).done(onData);
		}

		function onData(x) {


			if (offset === 0)
				plist.tracks = x;
			else
				for (var i = 0; i < x.items.length; i++)
					plist.tracks.items.push(x.items[i]);
			//console.log("act="+plist.tracks.items.length+" of "+x.total);
			offset = plist.tracks.items.length;
			if (offset < x.total)
				f();
			else
				ret.resolve(plist);
		}
		f();
		return ret;
	}

	function getPlaylistById(id, full) {
		console.log('getPlaylistById ' + id);
		var found = null;
		for (var i = 0; i < spotlib.playlists.items.length; i++) {
			if (spotlib.playlists.items[i].id == id)
				found = spotlib.playlists.items[i];
		}
		var ret = $.Deferred();
		var u = found.href;
		callSpotify(u).done(function (x) {
			spotlib.playlist[id] = x;
			if (full)
				getPlaylistTracks(x).done(function () { ret.resolve(x); })
			else
				ret.resolve(x);
		});
		return ret;
	}

	function getPlaylistByName(name, full) {
		console.log('getPlaylistByName ' + name);
		for (var i = 0; i < spotlib.playlists.items.length; i++) {
			if (spotlib.playlists.items[i].name == name)
				return getPlaylistById(spotlib.playlists.items[i].id, full);
		}
		return null;
	}

	function setPlaylistTracks(pl, arr) {
		console.log({ a: 'setPlaylistTracks', pl: pl, arr: arr });
		var offset = 0;
		var ret = $.Deferred();
		function f() {
			console.log('setPlaylistTracks f: offset=' + offset);
			if (offset >= arr.length) {
				ret.resolve();
				return;
			}
			var arr1 = [];
			var m = (offset == 0) ? 'put' : 'post';
			for (var i = 0; i < 50; i++ , offset++)
				if (offset < arr.length)
					arr1.push(arr[offset]);
			console.log('setPlaylistTracks f: len=' + arr1.length);
			var u = "https://api.spotify.com/v1/users/" + spotlib.profile.id + "/playlists/" + pl.id + "/tracks";
			console.log('url=' + u);
			var j = JSON.stringify({ uris: arr1 });
			var d = callSpotify(u, j, { method: m, contentType: 'application/json' });
			d.done(f);
		}
		f();
		return ret;
	}


	function sequence(funarray) {
		var ret = $.Deferred();
		console.log('sequence ' + funarray.length);
		var i = 0;
		function f(x) {
			if (i >= funarray.length) {
				console.log('end of sequence');
				ret.resolve();
				return;
			}
			$.when(funarray[i++]()).done(f);
		}
		f();
		return ret;
	}

	function init(callback) {

		//player.getAuth().done(onToken);
		authorize(onToken);
		function onToken(token) {

			console.log('init');
			player.setToken(token);
			spotlib.access_token = token;

			sequence([getProfile /*, getPlaylists, getCategories, getFeaturedPlaylists*/]).done(function () {
				msg('spotlib initialized');
				spotlib.initialized.resolve();
				if (callback)
					callback();
			});
		};
	}

	function sample() {
		var da = getPlaylistByName('temp', true);
		var db = getPlaylistByName('temp2', false);
		$.when(da, db).done(onData);

		function onData(a, b) {
			console.log({ a: a, b: b });
			var arr = [];
			for (var i = 0; i < a.tracks.items.length; i++)
				arr.push(a.tracks.items[i].track.uri);
			console.log({ arr: arr });

			for (var i = 0; i < 3000; i++) { //scramble
				var i1 = Math.floor(Math.random() * arr.length);
				var i2 = Math.floor(Math.random() * arr.length);
				var t1 = arr[i1];
				var t2 = arr[i2];
				arr[i1] = t2;
				arr[i2] = t1;
			}
			console.log('sorted');
			setPlaylistTracks(b, arr);
		}
	}

	function authorize(callback) {
		var u = 'http://www.andrenacci.com/spotify/start3.html?nodelay=1';
		var ref;
		window.isAndroid = (navigator.appVersion.toLowerCase().indexOf("android") >= 0);
		msg('isAndroid=' + window.isAndroid);

		if (window.isAndroid) {
			ref = cordova.InAppBrowser.open(u, '_blank'/*, 'location=yes'*/);
			setTimeout(fAndroid, 100);
		}
		else {
			ref = $('<iframe/>').attr('src', u).attr('id', 'sauth-iframe').appendTo('body').css({ position: 'absolute', left: 0, top: 0, zIndex: 19999 });
			window.addEventListener("message", receiveIframeMessage, false);
		}

		function receiveIframeMessage(event) {
			//alert('message arrived');
			console.log({ message: event });
			var prefix = "spotify_access_token=";
			if (typeof (event.data) == 'string') {
				//alert("imsg data\n\n"+event.data);
				if (event.data.indexOf(prefix) == 0) {
					window.removeEventListener("message", receiveIframeMessage);
					var x = event.data.substring(prefix.length);
					//alert("token="+x);
					//window.spotifyAuth = x;
					ref.remove();
					if (callback)
						callback(x);
				}
			}
		}

		function fAndroid() {
			function scriptCallback(x) {
				x = x[0];
				var p = x.indexOf('access_token=');
				if (p < 0) {
					setTimeout(fAndroid, 1000);
					return;
				}

				x = x.substring(p + 13);
				p = x.indexOf('&');
				if (p >= 0)
					x = x.substring(0, p);
				msg("token=" + x);
				window.spotifyAuth = x;
				ref.close();
				if (callback)
					callback(x);
			}
			ref.executeScript({ code: 'location.href' }, scriptCallback);
		}
	}

	$.extend(spotlib, {
		init: init,
		getProfile: getProfile,
		deleteFromPlaylist: deleteFromPlaylist,
		addToPlaylist: addToPlaylist,
		getPlaylists: getPlaylists,
		getFeaturedPlaylists: getFeaturedPlaylists,
		getCategories: getCategories,
		getPlaylistTracks: getPlaylistTracks,
		getPlaylistById: getPlaylistById,
		getPlaylistByName: getPlaylistByName,
		setPlaylistTracks: setPlaylistTracks,
		getGenres: getGenres,
		getTopArtists: getTopArtists,
		getTopTracks: getTopTracks,

		getPlaylistTracksRx: getPlaylistTracksRx
	});






})();
