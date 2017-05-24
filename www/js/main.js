
var started = $.Deferred();
var pauseDeferred = $.Deferred();
var resumeDeferred = $.Deferred();
//started.done(function() { alert('started');});

function now() {
	return (new Date()).getTime();
}
(function () {
	document.addEventListener('deviceready', onDeviceReady, false);
	document.addEventListener('pause', onPause, false);
	document.addEventListener('resume', onResume, false);

	var dr = $.Deferred();
	var jq = $.Deferred();
	dr.done(function () {
		jq.done(function () {
			spotlib.init(function () {
				started.resolve();
			});
		});
	});

	function onDeviceReady() {
		dr.resolve();
	}
	function onPause() {
		console.log("[PAUSE]");
		pauseDeferred.notify();
	}
	function onResume() {
		console.log("[RESUME]");
		resumeDeferred.notify();
	}

	$(function () {
		jq.resolve();
	});
})();
