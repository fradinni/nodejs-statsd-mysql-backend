/**
 *
 *
 */
function MySQLBackendCountersEngine() {
	var self = this;
}


/**
 *
 *
 */
MySQLBackendCountersEngine.prototype.buildQuerries = function(userCounters, time_stamp) {

	var querries = [];
	// Iterate on each userCounter
    for(var userCounterName in userCounters) {
      var counterValue = userCounters[userCounterName];
      if(counterValue === 0) {
        continue;
      } else {
        querries.push("insert into `statistics` (`timestamp`,`name`,`value`) values(" + time_stamp + ",'" + escape(userCounterName) +"'," + counterValue + ") on duplicate key update value = value + " + counterValue + ", timestamp = " + time_stamp);
      }
    }

    return querries;
}


/**
 *
 *
 */
exports.init = function() {
	var instance = new MySQLBackendCountersEngine();
  return instance;
};