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
        /**********************************************************************
         * Edit following line to custumize where statsd datas are inserted
         *
         * Parameters :
         *    - userCounterName: Counter name
         *    - counterValue: Counter value
         */
        querries.push("insert into `counters_statistics` select "+time_stamp+", '"+userCounterName+"' , if(max(value),max(value),0) + "+counterValue+"  from `counters_statistics`  where if(name = '"+userCounterName+"', 1,0) = 1 ;");

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