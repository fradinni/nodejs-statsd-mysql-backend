////////////////////////////////////////////////////
//
// Usage : 	node run_tests.js [nb user keys] [nb packets to send per user] [nb Requests Before Wait] [wait time in seconds]
//
// Example : 	node run_tests.js 5 50 20 10 
// It will generate 5 userKeys and will send 50 packet for each userKey. 
// The process will wait 10 secons every 20 requests
//
//
var dgram = require('dgram'),
	util = require('util');

var DEBUG = true;




/////////////////////////////////////////////////////////////////////////////
// Send packets to statsd for each userKeys randomly

// Open udp socket
var client = dgram.createSocket("udp4");

var send = function(host, port, message, closeSocket) {
	client.send(message, 0, message.length, port, host, function(err, bytes) {
		if(err) {
			client.close();
			process.stdout.write("\n");
			console.log("Error when sending packet ! Exit...");
			process.exit(-1);
		}
		if(closeSocket) {
			process.stdout.write("\n");
			console.log('Done sending packets.');
			client.close();
		}
		//console.log("Packet sent: " + message);
	});
}

console.log("Start sending...");


var message = new Buffer("test_timer:256|ms");
if(DEBUG) console.log("  - packet: " + message);

// Send packet to statsd for this userKey
process.stdout.write(".");

send("localhost", 8125, message, true);
	

