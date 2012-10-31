///////////////////////////////////////////////////////////////////////////////////
//  NodeJS Statsd MySQL Backend 1.0
// ------------------------------------------------------------------------------
//
// Authors: Nicolas FRADIN, Damien PACAUD
// Date: 31/10/2012
//
///////////////////////////////////////////////////////////////////////////////////

var _mysql = require('mysql');
	

/**
 * Backend Constructor
 *
 * @param startupTime
 * @param config
 * @param emmiter
 */
function StatdMySQLBackend(startupTime, config, emitter) {
	var self = this;

  this.config = config.mysql || {};

  
  // Verifying that the config file contains enough information for this backend to work	
  if(!this.config.host || !this.config.database || !this.config.user) {
    console.log("You need to specify at least host, port, database and user for this mysql backend");
    process.exit(-1);
  }

  // Default port for mysql is 3306, if unset in conf file, we set it here to default
  if(!this.config.port) {
    this.config.port = 3306;
  }

  // Attach events
	emitter.on('flush', self.onFlush );
	emitter.on('status', self.onStatus );


    /**
   *
   * @param time_stamp
   * @param metrics
   */
  StatdMySQLBackend.prototype.onFlush = function(time_stamp, metrics) {

    console.log("onFlush event Recieved");
    //var self = this;
    var connection = _mysql.createConnection(this.config);
    connection.query('SELECT 1', function(err, rows) {
      if(!err) {
        console.log("DB connected");
      }
      else {
        console.log("there was an error while trying to connect to DB, please check");
      }
    // connected! (unless `err` is set)
    });
  }


  /**
   *
   * @param error
   * @param backend_name
   * @param stat_name
   * @param stat_value
   */
  StatdMySQLBackend.prototype.onStatus = function(error, backend_name, stat_name, stat_value) {
    console.log("onStatus event Recieved");
  }

}






exports.init = function(startupTime, config, events) {
  var instance = new StatdMySQLBackend(startupTime, config, events);
  return true;
};





/*
 * Backend example : repeater.js
 *
 
var util = require('util'),
    dgram = require('dgram');

function RepeaterBackend(startupTime, config, emitter){
  var self = this;
  this.config = config.repeater || [];
  this.sock = dgram.createSocket('udp6');

  // attach
  emitter.on('packet', function(packet, rinfo) { self.process(packet, rinfo); });
};

RepeaterBackend.prototype.process = function(packet, rinfo) {
  var self = this;
  hosts = self.config;
  for(var i=0; i<hosts.length; i++) {
    self.sock.send(packet,0,packet.length,hosts[i].port,hosts[i].host,
                   function(err,bytes) {
      if (err) {
        console.log(err);
      }
    });
  }
};

exports.init = function(startupTime, config, events) {
  var instance = new RepeaterBackend(startupTime, config, events);
  return true;
};
*/