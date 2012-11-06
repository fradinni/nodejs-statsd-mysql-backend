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
        //querries.push("insert into `gauges_statistics` values ("+time_stamp+", '"+gaugeName+"', "+gaugeValue+");");
        querries.push("insert into `gauges_statistics` select "+time_stamp+", '"+gaugeName+"', "+gaugeValue+" from dual where (select if(max(value),max(value),-678) from `gauges_statistics` where name = '"+gaugeName+"') = -678 OR (select value from `gauges_statistics` where name = '"+gaugeName+"' order by timestamp desc limit 0,1) <> "+gaugeValue+";")

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