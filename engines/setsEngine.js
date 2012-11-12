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
MySQLBackendGaugesEngine.prototype.buildQuerries = function(sets, time_stamp) {

	var querries = [];
	 // Iterate on each gauge
    for(var setName in sets) {
      var setCount = sets[setName].values().length;
      if(setCount === 0) {
        continue;
      } else {
          querries.push("insert into `sets_statistics` values (" + time_stamp + ",'" + setName + "'," + setCount + ");");  
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