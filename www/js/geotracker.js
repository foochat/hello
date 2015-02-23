var track_id = '';      // Name/ID of the exercise
var watch_id = null;    // ID of the geolocation
//var tracking_data = []; // Array containing GPS position objects
var lastKnownPos = null;
var liveMap = null;
var marker = null;

var audioAddress = 'http://10.1.10.135';
var serverAddress = 'http://10.1.10.135:1234/';

var socket = new io.connect(serverAddress);
var ID = null;
var myaudio = null;
var lastUpdate = null;

socket.on('connect', function(){
	socket.emit('init', 1);

	socket.on('ID', function(data){
		ID = data;
        $("#startTracking_status").html("Welcome to <em>Voix des Anges</em> <strong>Client " + ID + "</strong> !");
        startTracking();
	});
    
    socket.on('updated', function(id){
        if(lastUpdate == null)
        {
            startListening(id);
            lastUpdate = 1;
            socket.emit('log', [ID, "listening started"]);
        }
	});

	socket.on('disconnect', function(){
        
        // Stop listening radio steam
        myaudio = null;
        
        // Stop tracking the user
        navigator.geolocation.clearWatch(watch_id);

        // Save the tracking data
        //window.localStorage.setItem(track_id, JSON.stringify(tracking_data));

        // Reset watch_id and tracking_data 
        watch_id = null;
        //tracking_data = [];
        
        lastUpdate = null;
	});
});

document.addEventListener("deviceready", function(){
	if(navigator.connection.type == Connection.NONE){
        $("#startTracking_status").html("No Internet Access available !");
	}
});

function send(x, y, z){
	var arr = [ID, x, y, z];
	socket.emit('input', arr);
}

function startTracking(){
    
	// Start tracking the User
    watch_id = navigator.geolocation.watchPosition(
    
    	// Success
        function(position){
			if(lastKnownPos == null) // create map & marker
			{
				var myLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
				lastKnownPos = position;

				// Google Map options
				var myOptions = {
					disableDefaultUI: true,
					zoom: 15,
					center: myLatLng,
					mapTypeId: google.maps.MapTypeId.ROADMAP
				};

				// Create the Google Map, set options
				liveMap = new google.maps.Map(document.getElementById("livemap_canvas"), myOptions);
				marker = new google.maps.Marker({
					position: myLatLng,
					map: liveMap,
					title: "Current Position"
				});
			}
			else //update map
			{
				var myLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
				lastKnownPos = position;
				
				liveMap.panTo(myLatLng);
				
				marker.setPosition(myLatLng);
				send(position.coords.latitude, position.coords.longitude, position.coords.altitude);
			}
			
            //tracking_data.push(position);
			$("#startTracking_info").html('Your last recorded position is :' + '<br />' + 'Latitude: ' + position.coords.latitude + '<br />' + 'Longitude: ' + position.coords.longitude + '<br />' + '<hr />');
        
		
		},
        
        // Error
        function(error){
            console.log(error);
            socket.emit('log',[ID, error]);
        },
        
        // Settings
        { frequency: 1000, enableHighAccuracy: true });
}

function startListening(id) {
    try {
        if(myaudio != null)
        {
            myaudio.pause();
            myaudio = null;
        }
        var port = 8000 + 2*id;
        var url = audioAddress + ":" + port + "/stream";
        myaudio = new Audio(url);
        myaudio.autoplay = true;
        myaudio.addEventListener("canplay", function() {
            //myaudio.play();
            $("#radio_status").html('Playing' + '<br />');
            var logAudio = ' ';
            for (property in myaudio) {
              logAudio += property + ':' + myaudio[property]+'\n';
            }
            socket.emit('log', [ID, "Audio: " + logAudio ]);
        });
        setTimeout(function() {
            myaudio.play();
        }, 5000);
    } catch (e) {
        alert('Audio error : ' + e);
        socket.emit('log', [ID, "Error in startListening: " + e]);
	}
}

$("#home_radio_button").live('click', function(){
    startListening(ID);
});

//$("#home_login_button").live('click', hello('facebook').login(loginHandler));
//
//function loginHandler(auth){
//    hello(auth.network).api('me').then( function(json){
//        alert("You are signed in to Facebook as " + json.name);
//    }, function( e ){
//        alert("Signin error: " + e.error.message );
//    });
//}