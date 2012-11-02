///////////////////////////////////////////////////////////////////////////////////
//  NodeJS Statsd MySQL Backend 0.1.0-alpha1
// ------------------------------------------------------------------------------
//
// Authors: Nicolas FRADIN, Damien PACAUD
// Date: 31/10/2012
//
///////////////////////////////////////////////////////////////////////////////////

var _mysql = require('mysql'),
    util = require('util'),
    fs = require('fs');

var STATSD_PACKETS_RECEIVED = "statsd.packets_received";
var STATSD_BAD_LINES = "statsd.bad_lines_seen";


/**
 * Backend Constructor
 *
 * Example config :
 *
  mysql: { 
   host: "localhost", 
   port: 3306, 
   user: "root", 
   password: "root", 
   database: "statsd_db",
   tables: ["statsd_users", "statsd_statistics"]
  }
 *
 * @param startupTime
 * @param config
 * @param emmiter
 */
function StatdMySQLBackend(startupTime, config, emitter) {
  var self = this;
  self.config = config.mysql || {};
  self.engines = {
    counters: [],
    gauges: [],
    timers: [],
    sets: []
  };

  // Verifying that the config file contains enough information for this backend to work  
  if(!this.config.host || !this.config.database || !this.config.user) {
    console.log("You need to specify at least host, port, database and user for this mysql backend");
    process.exit(-1);
  }

  // Default port for mysql is 3306, if unset in conf file, we set it here to default
  if(!this.config.port) {
    this.config.port = 3306;
  }

  // Set backend path
  for(var backend_index in config.backends) {
    var currentBackend = config.backends[backend_index];
    if(currentBackend.indexOf('mysql-backend.js') > -1) {
      self.config.backendPath = currentBackend.substring(0, currentBackend.lastIndexOf('/')+1);
    }
  }

  //Default tables
  if(!this.config.tables) {
    this.config.tables = {counters: ["counters_statistics"]};
  }

  // Default engines
  if(!self.config.engines) {
    self.config.engines = {
      counters: ["engines/countersEngine.js"],
      gauges: [],
      timers: [],
      sets: []
    };
  }
  

  // Check if tables exists
  self.checkDatabase();

  // Load backend engines
  self.loadEngines();

  // Attach events
  emitter.on('flush', function(time_stamp, metrics) { self.onFlush(time_stamp, metrics); } );
  emitter.on('status', self.onStatus );
}


/**
 * Load MySQL Backend Query Engines
 *
 */
StatdMySQLBackend.prototype.loadEngines = function() {
	var self = this;

  // Iterate on each engine type defined in configuration
  for(var engineType in self.config.engines) {
    var typeEngines = self.config.engines[engineType];

    // Load engines for current type
    for(var engineIndex in typeEngines) {
      // Get current engine path
      var enginePath = typeEngines[engineIndex];

      // Load current engine
      var currentEngine = require(self.config.backendPath + enginePath).init();
      if(currentEngine === undefined) {
        console.log("Unable to load engine '" + enginePath + "' ! Please check...");
        process.exit(-1);
      }
      // Add engine to MySQL Backend engines
      self.engines.counters.push(currentEngine);
    }
  }

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
 * Check if required tables are created. If not create them.
 *
 */
StatdMySQLBackend.prototype.checkDatabase = function() {
  var self = this;

  var isConnected = self.openMySqlConnection();
  if(!isConnected) {
    console.log("Unable to connect to MySQL database ! Please check...");
    process.exit(-1);
  }

  // Iterate on each stat type (counters, gauges, ...)
  var tables = self.config.tables
  for(var statType in tables) {

    // Get tables for current stat type
    var typeTables = tables[statType];

    // Iterate on each table for current stat type
    for(var table_index in typeTables) {
      var table_name = typeTables[table_index];
      console.log("Check if table exists : '" + table_name + "'");
      self.sqlConnection.query('show tables like "'+table_name+'";', function(err, results, fields) {
        if(err) {
          console.log("Unbale to execute query !");
          process.exit(-1);
        }

        // If table doesn't exists
        if(results.length > 0) {
          console.log("Table '" + table_name + "' was found !");
        } else {
          console.log("Table '" + table_name + "' was not found !");

          // Try to read SQL file for this table
          var sqlFilePath = self.config.backendPath + 'tables/' + table_name + '.sql';
          fs.readFile(sqlFilePath, 'utf8', function (err,data) {
            if (err) {
              console.log("Unable to read file: '" + sqlFilePath + "' ! Exit...");
              process.exit(-1);
            }

            // Split querries
            var querries = data.split("$$");

            // Execute each query
            for(var queryIndex in querries) {
              var query = querries[queryIndex];
              if(query.trim() == "") continue;
              self.sqlConnection.query(query, function(err, results, fields) {
                if(err) {
                  console.log("Unable to execute query: '" + query +"' for table '"+table_name+"' ! Exit...");
                  process.exit(-1);
                } 

              });
            }
            console.log("Table '" + table_name +"' was created with success.");
            
          });
        }
      });
    }

  }

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

  // Handle statsd counters
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

    // Open MySQL connection
    var canExecuteQuerries = self.openMySqlConnection();
    if(canExecuteQuerries) {

      //////////////////////////////////////////////////////////////////////
      // Call buildQuerries method on each counterEngine
      for(var countersEngineIndex in self.engines.counters) {
        console.log("countersEngineIndex = " + countersEngineIndex);
        var countersEngine = self.engines.counters[countersEngineIndex];

        // Add current engine querries to querries list
        var engineQuerries = countersEngine.buildQuerries(userCounters, time_stamp);
        querries = querries.concat(engineQuerries);

        // Insert data into database every 100 query
        if(querries.length >= 100) {
          // Execute querries
          self.executeQuerries(querries);
          querries = [];
        }

      }

      if(querries.length > 0) {
        // Execute querries
        self.executeQuerries(querries);
        querries = [];
      }
    }

    // Close MySQL Connection
    self.closeMySqlConnection();
    
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
