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
      /**********************************************************************
      * Edit following line to customize where statsd datas are inserted
      *
      * Parameters :
      *    - gaugeName: Gauge name
      *    - gaugeValue: Gauge value
      */
      // This SQL request checks if the last value for this particular gauge is the same as gaugeValue.
      // If it is the same, we do nothing.
      // If it is different, we insert a new line.
      // If gaugeName does not exist in the table, we insert a new line
      // The -678 value, is totally arbitrary, I just assumed that there was never gonna be a gauge with a -678 value. You can change it to any value not used by your gauges ;)
      querries.push("insert into `gauges_statistics` select "+time_stamp+", '"+gaugeName+"', "+gaugeValue+" from dual where (select if(max(value),max(value),-678) from `gauges_statistics` where name = '"+gaugeName+"') = -678 OR (select value from `gauges_statistics` where name = '"+gaugeName+"' order by timestamp desc limit 0,1) <> "+gaugeValue+";")
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