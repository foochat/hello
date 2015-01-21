function gps_distance(lat1, lon1, lat2, lon2)
{
	// http://www.movable-type.co.uk/scripts/latlong.html
    var R = 6371; // km
    var dLat = (lat2-lat1) * (Math.PI / 180);
    var dLon = (lon2-lon1) * (Math.PI / 180);
    var lat1 = lat1 * (Math.PI / 180);
    var lat2 = lat2 * (Math.PI / 180);

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c;
    
    return d;
}

var track_id = '';      // Name/ID of the exercise
var watch_id = null;    // ID of the geolocation
var tracking_data = []; // Array containing GPS position objects
var lastKnownPos = null;
var liveMap = null;
var marker = null;

// The watch id references the current `watchAcceleration`
var watchID = null;
var socket = new io.connect('http://10.1.10.205:1234/');
var ID;
var transmit = false;
var myaudio = null;

socket.on('connect', function(){
	socket.emit('init', 1);

	socket.on('ID', function(data){
		ID = data;
		alert('Your ID is : ' + data);
	});

	socket.on('message', function(message){
		alert(message);
	});

	socket.on('disconnect', function(){
		//
	});
});

document.addEventListener("deviceready", function(){
	if(navigator.connection.type == Connection.NONE){
		$("#home_network_button").text('No Internet Access')
								 .attr("data-icon", "delete")
								 .button('refresh');
	}
	
	startWatch();
	alert("Start Watch Running");
});

// Start watching the acceleration
function startWatch() {

	// Update acceleration every 3 seconds
	var options = { frequency: 3000 };
	watchID = navigator.accelerometer.watchAcceleration(onSuccess, onError, options);
}

// Stop watching the acceleration
function stopWatch() {
	if (watchID) {
		navigator.accelerometer.clearWatch(watchID);
		watchID = null;
	}
}

// onSuccess: Get a snapshot of the current acceleration
function onSuccess(acceleration) {
	//if(transmit){
		send(acceleration.x, acceleration.y, acceleration.z);
	//}
}
// onError: Failed to get the acceleration
function onError() {
	alert('onError!');
}

function send(x, y, z){
	var arr = [ID, x, y, z];
	socket.emit('input', arr);
}

$("#startTracking_start").live('click', function(){
    
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
			
//			jQuery.ajax({
//				type: "POST", 
//				url:  serviceURL+"locationUpdate.php", 
//				data: 'x='+position.coords.longitude+'&y='+position.coords.latitude,
//				cache: false
//			});
			
            tracking_data.push(position);
			$("#startTracking_info").html('Your last recorded position is :' + '<br />' + 'Latitude: ' + position.coords.latitude + '<br />' + 'Longitude: ' + position.coords.longitude + '<br />' + '<hr />');
        
		
		},
        
        // Error
        function(error){
            console.log(error);
        },
        
        // Settings
        { frequency: 3000, enableHighAccuracy: true });
    
    // Tidy up the UI
    track_id = $("#track_id").val();
    
    $("#track_id").hide();
    
    $("#startTracking_status").html("Tracking workout: <strong>" + track_id + "</strong>");
});


$("#startTracking_stop").live('click', function(){
	
	// Stop tracking the user
	navigator.geolocation.clearWatch(watch_id);
	
	// Save the tracking data
	window.localStorage.setItem(track_id, JSON.stringify(tracking_data));

	// Reset watch_id and tracking_data 
	watch_id = null;
	tracking_data = [];

	// Tidy up the UI
	$("#track_id").val("").show();
	
	$("#startTracking_status").html("Stopped tracking workout: <strong>" + track_id + "</strong>");

});

$("#home_clearstorage_button").live('click', function(){
	window.localStorage.clear();
});

// When the user views the history page
$('#history').live('pageshow', function () {
	
	// Count the number of entries in localStorage and display this information to the user
	tracks_recorded = window.localStorage.length;
	$("#tracks_recorded").html("<strong>" + tracks_recorded + "</strong> workout(s) recorded");
	
	// Empty the list of recorded tracks
	$("#history_tracklist").empty();
	
	// Iterate over all of the recorded tracks, populating the list
	for(i=0; i<tracks_recorded; i++){
		$("#history_tracklist").append("<li><a href='#track_info' data-ajax='false'>" + window.localStorage.key(i) + "</a></li>");
	}
	
	// Tell jQueryMobile to refresh the list
	$("#history_tracklist").listview('refresh');

});

// When the user clicks a link to view track info, set/change the track_id attribute on the track_info page.
$("#history_tracklist li a").live('click', function(){

	$("#track_info").attr("track_id", $(this).text());
	
});


// When the user views the Track Info page
$('#track_info').live('pageshow', function(){

	// Find the track_id of the workout they are viewing
	var key = $(this).attr("track_id");
	
	// Update the Track Info page header to the track_id
	$("#track_info div[data-role=header] h1").text(key);
	
	// Get all the GPS data for the specific workout
	var data = window.localStorage.getItem(key);
	
	// Turn the stringified GPS data back into a JS object
	data = JSON.parse(data);

	// Calculate the total distance travelled
	total_km = 0;

	for(i = 0; i < data.length; i++){
	    
	    if(i == (data.length - 1)){
	        break;
	    }
	    
	    total_km += gps_distance(data[i].coords.latitude, data[i].coords.longitude, data[i+1].coords.latitude, data[i+1].coords.longitude);
	}
	
	total_km_rounded = total_km.toFixed(2);
	
	// Calculate the total time taken for the track
	start_time = new Date(data[0].timestamp).getTime();
	end_time = new Date(data[data.length-1].timestamp).getTime();

	total_time_ms = end_time - start_time;
	total_time_s = total_time_ms / 1000;
	
	final_time_m = Math.floor(total_time_s / 60);
	final_time_s = total_time_s - (final_time_m * 60);

	// Display total distance and time
	$("#track_info_info").html('Travelled <strong>' + total_km_rounded + '</strong> km in <strong>' + final_time_m + 'm</strong> and <strong>' + final_time_s + 's</strong>');
	
	// Set the initial Lat and Long of the Google Map
	var myLatLng = new google.maps.LatLng(data[0].coords.latitude, data[0].coords.longitude);

	// Google Map options
	var myOptions = {
      zoom: 15,
      center: myLatLng,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    // Create the Google Map, set options
    var map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);

    var trackCoords = [];
    
    // Add each GPS entry to an array
    for(i=0; i<data.length; i++){
    	trackCoords.push(new google.maps.LatLng(data[i].coords.latitude, data[i].coords.longitude));
    }
    
    // Plot the GPS entries as a line on the Google Map
    var trackPath = new google.maps.Polyline({
      path: trackCoords,
      strokeColor: "#FF0000",
      strokeOpacity: 1.0,
      strokeWeight: 2
    });

    // Apply the line to the map
    trackPath.setMap(map);
   
		
});

$("#home_radio_button").live('click', function(){
	try {
		if(myaudio == null)
		{
			//myaudio = new Audio('http://streaming.rtbf.be:8000/2128xrtbf');
			myaudio = new Audio('http://10.1.10.205:8000/stream.ogg.m3u');
			myaudio.id = 'playerAudio';
			myaudio.play();
		} 
		else
		{
			if(myaudio.paused)
			{
				myaudio.play();
				$(this).text('Listening to Classic 21')
						.button('refresh');
			}
			else
			{
				myaudio.pause();
				$(this).text('Listen to Classic 21')
						.button('refresh');
			}
		}
	} catch (e) {
		alert('no audio support!');
	}
});