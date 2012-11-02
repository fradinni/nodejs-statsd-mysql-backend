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

var DEBUG = false;

// Splice arguments
var arguments = process.argv.splice(2);

var nbUserKeys = parseInt(arguments[0]);
var nbPacketsPerUser = parseInt(arguments[1]);
var nbRequestsBeforeWait = parseInt(arguments[2]);
var waitTime = parseInt(arguments[3]);

if(!nbRequestsBeforeWait) nbRequestsBeforeWait = 10; // Default nbRequests before wait: 10;
if(!waitTime) waitTime = 5;	//Default wait time: 5 seconds

var randomUserKeys = [];
var keysPattern = "secretKey.${userKey}.monsite.home.clicks:${value}|${type}";

//
// ### function randomString (bits)
// #### @bits {integer} The number of bits for the random base64 string returned to contain
// randomString returns a pseude-random ASCII string which contains at least the specified number of bits of entropy
// the return value is a string of length ⌈bits/6⌉ of characters from the base64 alphabet
//
var randomString = function (bits) {
  var chars, rand, i, ret;
  
  chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'; 
  ret = '';
  
  // in v8, Math.random() yields 32 pseudo-random bits (in spidermonkey it gives 53)
  while (bits > 0) {
    // 32-bit integer
    rand = Math.floor(Math.random() * 0x100000000); 
    // base 64 means 6 bits per character, so we use the top 30 bits from rand to give 30/6=5 characters.
    for (i = 26; i > 0 && bits > 0; i -= 6, bits -= 6) {
      ret += chars[0x3F & rand >>> i];
    }
  }
  
  return ret;
};


/**
 * Generate a number between 1 and maxValue included
 */
var randomInt = function (maxValue) {
	return(Math.floor(Math.random() * maxValue) + 1);
}

/////////////////////////////////////////////////////////////////////////////
// Generate userKeys
for(var i=0; i<nbUserKeys; i++) {
	randomUserKeys.push(randomString( 16 * 8)); // Radom 16 characters userKey
}

/////////////////////////////////////////////////////////////////////////////
// Send packets to statsd for each userKeys randomly

// Open udp socket
var client = dgram.createSocket("udp4");

var send = function(host, port, message, index, closeSocket) {
	client.send(message, 0, message.length, port, host, function(err, bytes) {
		if(err) {
			client.close();
			process.stdout.write("\n");
			console.log("Error when sending packet n° " + index +" ! Exit...");
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


var statusMap = {};
var availableUserNames = randomUserKeys.slice();

if(DEBUG) console.log("Usernames = " + util.inspect(availableUserNames));
if(DEBUG) console.log("availableUserNames.length = " + availableUserNames.length);

console.log("Start sending...");
// Loop and send udp messages
var canSend = true;
var index = 0;

var sendPackets = function () {
	if(DEBUG) console.log("");
	if(DEBUG) console.log("== Loop: " + index);

	// Get  random userKey
	var maxValue = availableUserNames.length;
	var userKey = availableUserNames[randomInt(maxValue)-1];
	if(DEBUG) console.log(" = User Key: " + userKey);

	// Generate a random between 1 and 10 value for this userKey
	var value = randomInt(10);

	// Increment statusMap
	if(!statusMap[userKey]) { 
		statusMap[userKey] = 1; 
	}
	else { 
		if(statusMap[userKey] < nbPacketsPerUser) { statusMap[userKey] = statusMap[userKey]+1; }	
	}

	// Build packet message
	var str = keysPattern.replace('${userKey}', userKey);
	str = str.replace('${value}', value);
	str = str.replace('${type}', 'c');
	var message = new Buffer(str);
	if(DEBUG) console.log("  - packet: " + message);

	// Send packet to statsd for this userKey
	process.stdout.write(".");
	if(availableUserNames.length == 1 && statusMap[availableUserNames[0]] == (nbPacketsPerUser-1)) {
		send("localhost", 8125, message, index, true);
	} else {
		send("localhost", 8125, message, index, false);
	}


	// If all packet are were sent for this userKey remove it from availableUserKeys
	if(statusMap[userKey] == nbPacketsPerUser) {
		
		if(DEBUG) {
			process.stdout.write("\n");
			console.log("  - All packets sent to this userKey !")
		}

		// Find userKey pos in array
		var userKeyPos = -1;
		for(var keyIndex in availableUserNames) {
			if(availableUserNames[keyIndex] == userKey) {
				userKeyPos = keyIndex;
			}
		}

		if(DEBUG) console.log("  - Key pos: " + userKeyPos);

		// Remove userKey from array
		if(userKeyPos > -1) {
			if(availableUserNames.length == 1) {
				availableUserNames = [];
				process.stdout.write("\n");
				console.log("End loop.");
				console.log("-> Status map :\n" + util.inspect(statusMap));
			} else {
				availableUserNames.splice(userKeyPos, 1);
			}
		}
	}

	index ++;

	if(DEBUG) console.log(util.inspect(statusMap));
	if(DEBUG) console.log("");

	if(availableUserNames.length > 0 && index % nbRequestsBeforeWait == 0)  {
		console.log(" | " + nbRequestsBeforeWait + " packets sent.");
		process.stdout.write("\n");
		console.log("- waiting " + waitTime + " seconds -\n");
		setTimeout(function(){ sendPackets(); }, waitTime*1000);
	} else if(availableUserNames.length > 0) {
		sendPackets();
	}

	if(index == nbUserKeys*nbPacketsPerUser) {
		process.exit(0);
	}
}

if(availableUserNames.length > 0) {
	sendPackets();
	for(var i=0; i<5000000; ++i){}
}
