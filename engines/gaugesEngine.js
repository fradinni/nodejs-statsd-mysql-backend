/**
 *
 *
 */
function MySQLBackendGaugesEngine() {
	var self = this;
}


/**
 *
 *
 */
MySQLBackendGaugesEngine.prototype.buildQuerries = function(gauges, time_stamp) {

	var querries = [];
	 // Iterate on each gauge
    for(var gaugeName in gauges) {
      var gaugeValue = gauges[gaugeName];
      if(gaugeValue === 0) {
        continue;
      } else {
        /**********************************************************************
         * Edit following line to custumize where statsd datas are inserted
         *
         * Parameters :
         *    - userCounterName: Counter name
         *    - counterValue: Counter value
         */
        querries.push("insert into `gauges_statistics` values ("+time_stamp+", '"+gaugeName+"', "+gaugeValue+") on duplicate key update value = " + gaugeValue + ", timestamp = " + time_stamp);
      }
    }

    return querries;
}


/**
 *
 *
 */
exports.init = function() {
	var instance = new MySQLBackendGaugesEngine();
  return instance;
};