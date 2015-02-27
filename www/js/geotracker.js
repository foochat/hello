var serverAddress = 'http://10.1.10.135';
var serverPort = 1234;
var mountpoint = "/stream";

var socket = new io.connect(serverAddress + ':' + serverPort + '/');

var track_id = '';      // Name/ID of the exercise
var watch_id = null;    // ID of the geolocation
//var tracking_data = []; // Array containing GPS position objects
var ID = null;
var myaudio = null;
var circle = null;
var playing = false;

socket.on('connect', function(){
	socket.emit('init', 1);
    
	socket.on('ID', function(data){
		ID = data;
	});

	socket.on('disconnect', function(){
        stopTracking();
        stopListening();
	});
});

function onLoad() {
    circle = new ProgressBar.Circle('#progress', {
        color: '#555',
        trailColor: '#eee',
        strokeWidth: 10,
        duration: 2500,
        easing: 'easeInOut'
    });
    animatePlayer(false);
}

//document.addEventListener("deviceready", function(){
//	if(navigator.connection.type == Connection.NONE){
//        
//	}
//});

function send(lat, lon){
	var arr = [ID, lat, lon];
	socket.emit('input', arr);
}

function startTracking(){
    
	// Start tracking the User
    watch_id = navigator.geolocation.watchPosition(
    
    	// Success
        function(position){
            send(position.coords.latitude, position.coords.longitude);
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
        var port = 8000 + 2*id;
        var url = serverAddress + ":" + port + mountpoint;
        if(myaudio == null)
        {
            reloadAudio(url);
        }
        else
        {
            if(myaudio.paused)
            {
                myaudio.load();
            }
            else
            {
                myaudio.pause();
                myaudio = null;
                animatePlayer(false);
            }
        }
    } catch (e) {
        alert('Audio error : ' + e);
        socket.emit('log', [ID, "Error in startListening: " + e]);
	}
}

$("#progress").live('click', function(){
    if(ID != null)
    {
        if(watch_id == null)
        {
            startTracking();
        }
        else
        {
            stopTracking();
        }
        startListening(ID);
    }
});

function reloadAudio(url) {
    myaudio = new Audio(url);
    myaudio.autoplay = true;
    myaudio.load();
    myaudio.addEventListener('play', function(){animatePlayer(true);});
    myaudio.addEventListener('canplay', function(){animatePlayer(false);});
    myaudio.addEventListener('stalled', function(){animatePlayer(false);});
    myaudio.addEventListener('pause', function(){animatePlayer(false);});
    myaudio.addEventListener('error', function(){animatePlayer(false);});
    myaudio.addEventListener('suspend', function(){animatePlayer(false);});
    myaudio.addEventListener('waiting', function(){animatePlayer(false);});
    myaudio.addEventListener('ended', function(){animatePlayer(false);});
}

function animatePlayer(state) {
    if(playing && !state) // stop anim
    {
        playing = false;
    }
    else if(!playing && state) // start anim
    {
        playing = true;
        animationLoop();
    }
}

function animationLoop() {
    setTimeout(function() {
        if(playing)
        {
            circle.animate(Math.random());
            animationLoop();
        }
        else
        {
            circle.animate(0);
        }
    }, 1000+(Math.random()*2000));
}

function stopTracking() {
    // Stop tracking the user
    navigator.geolocation.clearWatch(watch_id);

    // Save the tracking data
    //window.localStorage.setItem(track_id, JSON.stringify(tracking_data));

    // Reset watch_id and tracking_data 
    watch_id = null;
    //tracking_data = [];
}

function stopListening() {
    // Stop listening radio steam
    myaudio = null;

    animatePlayer(false);
}