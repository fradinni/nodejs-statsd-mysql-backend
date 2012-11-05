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
    fs = require('fs'),
    sequence = require('sequence').create();

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
    this.config.tables = {counters: ["counters_statistics"], gauges: ["gauges_statistics"]};
  }

  // Default engines
  if(!self.config.engines) {
    self.config.engines = {
      counters: ["engines/countersEngine.js"],
      gauges: ["engines/gaugesEngine.js"],
      timers: [],
      sets: []
    };
  }
  
  // Synchronous sequence
  sequence.then(function( next ) {

    // Check if tables exists
    self.checkDatabase(function(err) {
      if(err) {
        console.log('Database check failed ! Exit...');
        process.exit(-1);
      } else {
        console.log('Database is valid.');
        next();
      }
    });

  }).then(function( next ) {
    process.stdout.write('Loading MySQL backend engines...');
    // Load backend engines
    self.loadEngines(function(err) {
      if(err) {
        process.stdout.write("[FAILED]\n");
        console.log(err);
      }
      process.stdout.write("[OK]\n");
      next();
    });

  }).then(function( next ) {
    // Attach events
    emitter.on('flush', function(time_stamp, metrics) { self.onFlush(time_stamp, metrics); } );
    emitter.on('status', self.onStatus );

    console.log("Statsd MySQL backend is loaded.");
  });
 
}


/**
 * Load MySQL Backend Query Engines
 *
 */
StatdMySQLBackend.prototype.loadEngines = function(callback) {
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
        callback("Unable to load engine '" + enginePath + "' ! Please check...");
      }
      // Add engine to MySQL Backend engines
      self.engines[engineType].push(currentEngine);
    }
  }

  callback();
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
StatdMySQLBackend.prototype.checkDatabase = function(callback) {
  var self = this;

  console.log("Checking database...");

  var isConnected = self.openMySqlConnection();
  if(!isConnected) {
    console.log("Unable to connect to MySQL database ! Please check...");
    process.exit(-1);
  }

  var tables = self.config.tables

  // Count stats types
  var typesCount = 0;
  for(var statType in tables) { typesCount++; }

  // Iterate on each stat type (counters, gauges, ...)
  var statTypeIndex = 0;
  for(var statType in tables) {

    // Get tables for current stat type
    var typeTables = tables[statType];

    // Count tables for current type
    var tablesCount = 0;
    for(var table_index in typeTables) { tablesCount++; }

    // Check if tables exists for current type
    self.checkIfTablesExists(statTypeIndex, typeTables, tablesCount, 0, function(type_index, err) {
      if(err) {
        callback(err);
      }

      // If all types were parsed, call the callback method
      if(type_index == typesCount-1) {
        callback();
      }
    });

    statTypeIndex++;
  }
}



/**
 * Check if a table exists in database. If not, create it.
 */
StatdMySQLBackend.prototype.checkIfTablesExists = function(type_index, tables_names, size, startIndex, callback) {
  var self = this;
  
  self.sqlConnection.query('show tables like "'+tables_names[startIndex]+'";', function(err, results, fields) {
    if(err) {
      callback(err);
    }

    // If table wasn't found
    if(results.length == 0) {

      console.log("Table '" + tables_names[startIndex] + "' was not found !");

      // Create table
      self.createTable(tables_names[startIndex], function(err) {
        if(err) {
          callback(type_index, err);
        }

        if(startIndex == size - 1) {
          // If all tables were created for this type, call the callback method
          callback(type_index);
        } 
        else {
          // Else iterate on the next table to create
          self.checkIfTablesExists(type_index, tables_names, size, startIndex+1, callback);
        }
      });

    } 

    // If table was found in database
    else {
      console.log("Table '" + tables_names[startIndex] + "' was found.");

      if(startIndex == size-1){
        // If all tables were created for this type, call the callback method
        callback(type_index);
      } 
      else {
        // Else iterate on the next table to create
        self.checkIfTablesExists(type_index, tables_names, size, startIndex+1, callback)
      }
    }

  });

}



/**
 * Create a table from corresponding sql script file
 */
StatdMySQLBackend.prototype.createTable = function(table_name, callback) {
  var self = this;

  // Try to read SQL file for this table
  var sqlFilePath = self.config.backendPath + 'tables/' + table_name + '.sql';
  fs.readFile(sqlFilePath, 'utf8', function (err,data) {
    if (err) {
      console.log("Unable to read file: '" + sqlFilePath + "' !");
      callback(err);
    }

    // Split querries
    var querries = data.split("$$");

    // Prepare querries
    var queuedQuerries = "";
    for(var queryIndex in querries) {
      var query = querries[queryIndex];
      if(query.trim() == "") continue;
      queuedQuerries += query;

      if(queuedQuerries[queuedQuerries.length-1] !== ";") {
        queuedQuerries += ";";
      }
    }

    // Execute querries
    self.sqlConnection.query(queuedQuerries, function(err, results, fields) {
      if(err) {
        console.log("Unable to execute query: '" + query +"' for table '"+table_name+"' !");
        callback(err);
      } 
      console.log("Table '" + table_name +"' was created with success.");
      callback();
    });
    
  });
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

  // Handle statsd gauges
  self.handleGauges(gauges,time_stamp);
  
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
    var userCountersSize = 0;
    for(var userCounterName in userCounters) { userCountersSize++; }
   
    if(userCountersSize > 0) {
      console.log("Counters received !");

      var querries = [];

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
    }
  }

}



/**
 * Handle and process received counters 
 * 
 * @param _counters received counters
 * @param time_stamp flush time_stamp 
 */
StatdMySQLBackend.prototype.handleGauges = function(_gauges, time_stamp) {
  var self = this;
  
  var gaugesSize = 0
  for(var g in _gauges) { gaugesSize++; }

  // If gauges received
  if(gaugesSize > 0) {
    console.log("Gauges received !");
    console.log("Gauges = " + util.inspect(_gauges));
    var querries = [];

    // Open MySQL connection
    var canExecuteQuerries = self.openMySqlConnection();
    if(canExecuteQuerries) {
      console.log("ok");
        //////////////////////////////////////////////////////////////////////
        // Call buildQuerries method on each counterEngine
        for(var gaugesEngineIndex in self.engines.gauges) {
          console.log("gaugesEngineIndex = " + gaugesEngineIndex);
          var gaugesEngine = self.engines.gauges[gaugesEngineIndex];

          // Add current engine querries to querries list
          var engineQuerries = gaugesEngine.buildQuerries(_gauges, time_stamp);
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
    } else {
      console.log("Unable to open db connection !");
    }

    // Close MySQL Connection
    self.closeMySqlConnection();
  }
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
