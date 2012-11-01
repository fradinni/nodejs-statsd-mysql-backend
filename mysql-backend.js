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

var STATSD_PACKETS_RECEIVED = "statsd.packets_received";
var STATSD_BAD_LINES = "statsd.bad_lines_seen";


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
 * Open MySQL connection
 *
 * @return boolean Indicates if connection succeed
 */
StatdMySQLBackend.prototype.openMySqlConnection = function() {
  var self = this;
  var canExecuteQuerries = true;

  // Create MySQL connection
  self.sqlConnection = _mysql.createConnection(this.config);
  self.sqlConnection.connect(function(error){
    canExecuteQuerries = false;
  });

  return canExecuteQuerries;
}


/**
 * Close MySQL connection
 *
 */
StatdMySQLBackend.prototype.closeMySqlConnection = function() {
  var self = this;
  self.sqlConnection.end(function(error) {
    if(error){
      console.log("There was an error while trying to close DB connection : " + util.inspect(error));
      //Let's make sure that socket is destroyed
      self.sqlConnection.destroy();
    }
  });

  return;
}




/**
 * Method executed when statsd flush received datas
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

  self.handleCounters(counters,time_stamp);
  
}



/**
 * Handle and process received counters 
 * 
 * @param _counters received counters
 * @param time_stamp flush time_stamp 
 */
StatdMySQLBackend.prototype.handleCounters = function(_counters, time_stamp) {
  
  var self = this;

  var packets_received = parseInt(_counters[STATSD_PACKETS_RECEIVED]);
  var bad_lines_seen = parseInt(_counters[STATSD_BAD_LINES]);

  if(packets_received > 0) {
    // Get userCounters for this flush
    var userCounters = self.getUserCounters(_counters);
    var querries = [];

    console.log("Preaparing querries...");

    // Iterate on each userCounter
    for(var userCounterName in userCounters) {
      var counterValue = userCounters[userCounterName];
      if(counterValue === 0) {
        continue;
      } else {
        querries.push("insert into `statistics` (`timestamp`,`name`,`value`) values(" + time_stamp + ",'" + escape(userCounterName) +"'," + counterValue + ") on duplicate key update value = value + " + counterValue + ", timestamp = " + time_stamp);
      }
    }

    var querriesCount = querries.length;
    console.log("Querries count : " + querriesCount );

    // If at least one querry can be executed
    if(querriesCount > 0) {

      // Open MySQL connection
      var canExecuteQuerries = self.openMySqlConnection();

      // If connection succeed
      if(canExecuteQuerries) {
        console.log("Executing " + querriesCount + " querries...");
        // Execute querries
        self.executeQuerries(querries);

        // Close MySQL connection
        self.closeMySqlConnection();
      }

    }

  } else {
    console.log("No user packets received.");
  }

  return;

}
  


StatdMySQLBackend.prototype.executeQuerries = function(sqlQuerries) {
  
  var self = this;

  for(var i = 0 ; i < sqlQuerries.length ; i++){
    console.log("Query " + i + " : " + sqlQuerries[i]);
    self.sqlConnection.query(sqlQuerries[i], function(err, rows) {
      if(!err) {
        console.log(" -> Query [SUCCESS]");
      }
      else {
        //TODO : add better error handling code
        console.log(" -> Query [ERROR]"); 
      }
    });  
  }

}



/**
 *
 *
 */
StatdMySQLBackend.prototype.getUserCounters = function(_counters) {
  var userCounters = {};
  for(var counterName in _counters) {
    var counterNameParts = counterName.split('.');
    if(counterNameParts[0] !== "statsd") {
      userCounters[counterName] = _counters[counterName];
    }
  }
  return userCounters;
}



/**
 *
 *
 */
StatdMySQLBackend.prototype.getStatsdCounters = function(_counters) {
  var statsdCounters = {};
  for(var counterName in _counters) {
    var counterNameParts = counterName.split('.');
    if(counterNameParts[0] === "statsd") {
      statsdCounters[counterName] = _counters[counterName];
    }
  }
  return statsdCounters;
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


