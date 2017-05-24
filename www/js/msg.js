(function(){

	function msg(html, css) {
		var m = $('<div/>').addClass('msg-item').appendTo(container()).html(html).css({
			padding:"2px 3px",
			margin:2,
			fontFamily:'arial',
			fontSize:15,
			width:'100%',
			border:'2px dashed #505050',
			backgroundColor: "rgba(255,255,220,1)"
		});
		
		if (css)
			m.css(css);
			
		m.click(function() { 
			$('.msg-item').remove();
		});
		
		function chiudi(){
			m.animate({height:0, padding:0}, 500, null, cancella);
		}
		function cancella() {
			m.remove();
		}
		setTimeout(chiudi,5000);
	}
	window.msg = msg;
	
	function container() {
		
		var c = $('#_msg_container_');
		if (c.length>0)
			return c;
			
		c = $('<div/>').attr('id','_msg_container_').appendTo('body').css({
			position:'absolute',
			zIndex:1000,
			top:5,
			right:5,
			//backgroundColor: "rgba(128,128,128,.25)",
			padding:0,
			overflow:'hidden',
			maxWidth:400
		});
		return c;
	}

	$(container);
})();

