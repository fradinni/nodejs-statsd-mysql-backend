////////////////////////////////////////////////////
//
// Usage : 	node run_tests "command" [nb packets to send]
//
// Example : 	node run_tests "gorets:10|c" 100
//
//
var dgram = require('dgram');

// Splice arguments
var arguments = process.argv.splice(2);

var message = new Buffer(arguments[0]);
var count = parseInt(arguments[1]);

// Open udp socket
var client = dgram.createSocket("udp4");

var send = function(host, port, message, index, closeSocket) {
	client.send(message, 0, message.length, port, host, function(err, bytes) {
		if(err) {
			client.close();
			console.log("Error when sending packet n° " + index +" ! Exit...");
			process.exit(-1);
		}
		if(closeSocket) {
			console.log('Done.');
			client.close();
		}
	});
}

// Loop and send udp messages
for(var i=0; i < count; i++) {
	send("localhost", 8125, message, i, i == count-1);
}

