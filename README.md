nodejs-statsd-mysql-backend
===========================

MySQL backend for Statsd

Current version 0.1.0-alpha1

## Contributors
This statsd backend is developped by Nicolas FRADIN and Damien PACAUD.

## Install
Go into Statsd parent directory and execute :
```bash
git clone https://github.com/fradinni/nodejs-statsd-mysql-backend.git
```
You should have a new directory called 'nodejs-statsd-mysql-backend' just next to the Statsd directory.

## Configuration
Edit Statsd configuraton file and add mysql-backend configuration.

Example :
```js
{
  graphitePort: 2003
, graphiteHost: "localhost"
, port: 8125
, backends: [ "../nodejs-statsd-mysql-backend/mysql-backend.js" ] // Backend MySQL

  // MySQL Backend minimal configuration
, mysql: { 
	   host: "localhost", 
	   port: 3306, 
	   user: "root", 
	   password: "root", 
	   database: "statsd_db"
  }
}
```

Required parameters :

* `host`: MySQL instance host.
* `port`: MySQL instance port. 
* `user`: MySQL user.
* `password`: MySQL password.
* `database`: Default database where statsd table are stored.

Optional parameters :

* `tables`: List of tables names used (see 'Customize MySQL Bakend Database' section for more details).
* `engines`: List of MySQL Backend engines (see 'Customize MySQL Bakend Engines' section for more details).


## Introduction
This is node.js backend for statsd. It is written in JavaScript, does not require compiling, and is 100% MIT licensed.

It save statsd received values to a MySQL database.


## Data Structure for Counters
By default, counters values are stored into a 'counters_statistics' table. This table has a very simple structure with 3 columns :
* `timestamp`: The timestamp sent by statsd flush event.
* `name`: The counter name.
* `value`: The counter value.

The primary key of this table is composed by fields: `timestamp` and `name`. It means when a new value arrives for a counter, this value is added to the previous one and stored in database. With this mechanism, we can keep a log of counters values.


## Data Structure for Gauges

Not implemented yet.


## Data Structure for Timers

Not implemented yet.


## Data Structure for Sets

Not implemented yet.


## Customize MySQL Backend Database

If you want to change where statsd datas are stored just follow the guide :)

By default database tables are defined like that :
````js
{
	counters: ["counters_statistics"],
	gauges: ["gauges_statistics"],
	timers: ["timers_statistics"],
	sets: ["sets_statistics"]
}
```

If we want to duplicate statsd counters datas into a new table called 'duplicate_counters_stats', we have to add new table name to counters tables list.

Open stats config file and add tables configuration :
```
mysql: { 
   host: "localhost", 
   port: 3306, 
   user: "root", 
   password: "root", 
   database: "statsd_db"

   // Tables configuration
   tables: {
   		counters: ["counters_statistics", "duplicate_counters_stats"]
   }
}
```

Then place new table creation script into "nodejs-statsd-mysql-backend/tables" directory.
The file should be nammed "[table_name].sql", so create a file named 'duplicate_counters_stats.sql'.

Example of creation script 'duplicate_counters_stats.sql' :
```sql
-- Stadard DELIMITER is $$

-- Counters statistics table
CREATE  TABLE `statsd_db`.`duplicate_counters_stats` (
    `timestamp` BIGINT NOT NULL ,
    `name` VARCHAR(255) NOT NULL ,
    `value` INT(11) NOT NULL ,
PRIMARY KEY (`name`, `timestamp`) )$$

-- Procedure used to calculate values sum for the same userKey name
CREATE FUNCTION `duplicate_counters_get_max`(_name VARCHAR(255)) RETURNS INT(11)
READS SQL DATA
BEGIN 
      DECLARE r INT;
      SELECT  MAX(`value`)
      INTO    r
      FROM    `statsd_db`.`duplicate_counters_stats`
      WHERE   name = _name;
      
      RETURN IF(r IS NULL, 0, r);
END$$
```

The last step is the modification of the Counters Query Engine. We can also create a new Query Engine but we will see how to do that in the next section.

Open the file "nodejs-statsd-mysql-backend/engines/countersEngine.js".

We will focus on a specific line of this file :
```js
querries.push("insert into `counters_statistics` values ("+time_stamp+", '"+userCounterName+"', counters_get_max(name) + "+counterValue+");");
```

Just duplicate this line and change the table name :
```js
querries.push("insert into `counters_statistics` values ("+time_stamp+", '"+userCounterName+"', counters_get_max(name) + "+counterValue+");");
querries.push("insert into `duplicate_counters_stats` values ("+time_stamp+", '"+userCounterName+"', duplicate_counters_get_max(name) + "+counterValue+");");
```

Values will be inserted in two tables: 'counters_statistics' and 'duplicate_counters_stats'.

In this example, colums are the same in the two tables so, we just have to change the table name.

But you can customize this...


## Customize MySQL Backend Query Engines

If you want to add customized querry engines to MySQL Backend, it's very simple.

First, create a new engine in "nodejs-statsd-mysql-backend/engines" directory.
For example, copy the existing "countersEngine.js" and rename it into "customizedCountersEngine.js".

Make some modifications inside it...

Then, declare the new engine in MySQL Backend configuration.
Open statsd config file and add engines configuration:

```js
mysql: { 
   host: "localhost", 
   port: 3306, 
   user: "root", 
   password: "root", 
   database: "statsd_db"

   // Tables configuration
   tables: {
   		counters: ["counters_statistics", "duplicate_counters_stats"]
   }

   // Query Engines configuration
   engines: {
   		counters: ["engines/countersEngine.js", "engines/customizedCountersEngine.js"]
   }
}

```

Your querry engine will be triggered for each new Counter data.
