///////////////////////////////////////////////////////////////////////////////////
//  NodeJS Statsd MySQL Backend 1.0
// ------------------------------------------------------------------------------
//
// Authors: Nicolas FRADIN, Damien PACAUD
// Date: 31/10/2012
//
///////////////////////////////////////////////////////////////////////////////////

var _mysql = require('mysql'),
    util = require('util');


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
  emitter.on('flush', function(time_stamp, metrics) { self.onFlush(time_stamp, metrics); } );
  emitter.on('status', self.onStatus );
}


/**
 *
 * @param time_stamp
 * @param metrics
 */
StatdMySQLBackend.prototype.onFlush = function(time_stamp, metrics) {
  var self = this;

  var counters = metrics['counters'];
  var timers = metrics['timers'];  
  var gauges = metrics['gauges'];
  var sets = metrics['sets'];
  var pctThreshold = metrics['pctThreshold'];

  self.executeQuery("toto");
  
}


StatdMySQLBackend.prototype.handleCounters = function(_counters, time_stamp) {
  var queries = [];
  var value = 0;
  for(var counter in _counters) {
    value = counters[counter];
    if(value === 0) {
      continue;
    }
    else {
      queries.push("insert into statistics values(" + time_stamp + ",'" + counter +"'," + value + ") on duplicate key value = value + " + value + ", timestamp = " + time_stamp);
    }
  }
}


StatdMySQLBackend.prototype.executeQuery = function(sqlQuerries) {

  // Let's create a connection to the DB server
  var connection = _mysql.createConnection(this.config);
  
  connection.connect(function(err){
    if(err){
      console.log("There was an error while trying to connect to DB, please check");
    }
    else {
      for(var sql in sqlQuerries){
        connection.query(sql, function(err, rows) {
          if(!err) {
            console.log("Query succesfully executed");
          }
          else {
            //TODO : add better error handling code
            console.log("Error while executing sql query : " + sql); 
          }
        });  
      }
    }
  });
 
  connection.end(function(err) {
    if(err){
      console.log("There was an error while trying to close DB connection");
      //Let's make sure that socket is destroyed
      connection.destroy();
    }
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


