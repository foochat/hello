var serverIp = '193.190.210.15';
//var serverIp = '10.1.10.135';
var serverPort = 45678;

var clientStartingPort = 8000;
var portStep = 2;
var mountpoint = '/stream';

var socket = new io.connect('http://' + serverIp + ':' + serverPort + '/');

var watch_id = null;
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
        ID = null;
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
	var port = clientStartingPort;
        var url = 'http://' + serverIp + ':' + port + mountpoint + id;
        if(myaudio == null)
        {
            reloadAudio(url);
        }
        else
        {
            myaudio.pause();
            myaudio = null;
        }
    } catch (e) {
        socket.emit('log', [ID, "Error in startListening: " + e]);
	}
}

function stopTracking() {
    // Stop tracking the user
    navigator.geolocation.clearWatch(watch_id);

    // Reset watch_id
    watch_id = null;
}

function stopListening() {
    // Stop listening radio steam
    myaudio = null;

    animatePlayer(false);
}

function reloadAudio(url) {
    myaudio = new Audio(url);
    myaudio.autoplay = true;
    myaudio.load();
    myaudio.addEventListener('play', function(){animatePlayer(true);});
    myaudio.addEventListener('pause', function(){animatePlayer(false);});
    myaudio.addEventListener('ended', function(){animatePlayer(false);});
}

function animatePlayer(state) {
    if(playing && !state) // stop anim
    {
        playing = false;
        $('#state').attr('class', 'fade-out');
    }
    else if(!playing && state) // start anim
    {
        playing = true;
        $('#state').attr('class', 'fade-in');
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
