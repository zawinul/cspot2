var JSFtp = require("jsftp");
var fs = require('fs');
 
var ftp = new JSFtp({
  host: "ftp.andrenacci.com",
  port: 21 // defaults to 21 
});

/*ftp.list('/www.andrenacci.com/listing', function(err, res) {
  console.log(res);
  // Prints something like 
  // -rw-r--r--   1 sergi    staff           4 Jun 03 09:32 testfile1.txt 
  // -rw-r--r--   1 sergi    staff           4 Jun 03 09:31 testfile2.txt 
  // -rw-r--r--   1 sergi    staff           0 May 29 13:05 testfile3.txt 
  // ... 
});*/

var src1="C:/paolo/web/cspot2/platforms/android/build/outputs/apk/android-debug.apk";
var trg1="/www.andrenacci.com/listing/cspot2-debug.apk";

var src2="C:/Users/a135631/AndroidStudioProjects/SpotApp/app/build/outputs/apk/app-debug.apk";
var trg2="/www.andrenacci.com/listing/spotapp-debug.apk";
ftp.auth("1456585@aruba.it", "32ffc2b820", function(x){
	console.log(x);
	copia(src1, trg1).then((x)=>copia(src2, trg2), (x)=>copia(src2, trg2));
})

function copia(src, trg) {
	var doFulfill, doReject;

	var p = new Promise(function (fulfill, reject){
		doFulfill = (v)=>fulfill(v);
		doReject = (v)=>reject(v);
	}); 

	function onFile(err, data) {
		console.log('read '+src+' done');
		ftp.put(data, trg, onFTPDone);
	}

	function onFTPDone(hadError) {
		console.log('onFTPdone');
		if (!hadError) {
			console.log("File transferred successfully!");
			doFulfill(1);
		}
		else {
			console.log("Error: "+hadError);
			doReject(hadError);
		}
	}

	fs.readFile(src, onFile);
	return p;
}