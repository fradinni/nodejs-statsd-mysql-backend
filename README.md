nodejs-statsd-mysql-backend
===========================

MySQL backend for [Statsd](https://github.com/etsy/statsd) by [Etsy](http://www.etsy.com/)

Current version 0.1.0-alpha1

## License ##
The node-js-mysql-backend library is licensed under the MIT license. Copyright (c) 2012-2013 Nicolas FRADIN - Damien PACAUD. All rights reserved.

## Contributors ##
This statsd backend is developped by [Nicolas FRADIN](http://www.nfradin.fr) and [Damien PACAUD](http://www.damien-pacaud.com).

## Install ##
Go into Statsd parent directory and execute :
```bash
git clone https://github.com/fradinni/nodejs-statsd-mysql-backend.git
```
You should have a new directory called 'nodejs-statsd-mysql-backend' just next to the Statsd directory.

It could be required to execute the next commands:
```
npm install mysql
npm install sequence
```

## Configuration
Edit Statsd configuraton file and add mysql-backend configuration.

Example :
```js
{
  port: 8125
, backends: [ "../nodejs-statsd-mysql-backend/mysql-backend.js" ] // Backend MySQL

  // MySQL Backend minimal configuration
, mysql: { 
	   host: "localhost", 
	   port: 3306, 
	   user: "user", 
	   password: "passwd", 
	   database: "dbName"
  }
}
```

Required parameters :

* `host`: MySQL instance host. 
* `user`: MySQL user.
* `password`: MySQL password.
* `database`: Default database where statsd table will be stored.

Optional parameters :

* `port`: MySQL instance port (defaults to 3306)
* `tables`: List of tables names used (see 'Customize MySQL Bakend Database' section for more details).
* `engines`: List of MySQL Backend engines (see 'Customize MySQL Bakend Engines' section for more details).


## Introduction
This is a MySQL backend for statsd. 

It is written in JavaScript, does not require compiling, and is 100% MIT licensed.

It saves received metrics to a MySQL database.


## Supported Metrics

This backend currently supports the following metrics :

* Counters
* Gauges
* Timers

## Counters ##

Counters are properties whose value increment or decrement. 

They consist of a Key-Value pair and are stored in database every flush interval if they were incremented or decremented.
This means that you have the counter's value history in your database and you can easily focus on the time window that you need (to show growth for instance).

They are never reset to zero, so if you want to start over, you need a new counter name.

### Counters Data Structure ###

By default, counters values are stored into a `counters_statistics` table.  

This table has a very simple structure with 3 columns :

* `timestamp`: The timestamp sent by statsd flush event.
* `name`: The counter's name.
* `value`: The counter's value.

The primary key is a composed of fields: `timestamp` and `name`. 

The counter's new value is calculated on insert for each flush event.

## Gauges ##

Gauges are properties whose value changes with time. 

They consist of a Key-Value pair and are stored in database every flush interval if their value changed.
This means that you have each gauge's value history in your database.

If a gauge value does not change during a flush interval, this backend will not store a new line in the database.
It is up to the frontend to display the fact that the value has not changed during any time period.

#### Gauges Data Structure ####

By default, gauges values are stored into a `gauges_statistics` table. 

This table has a very simple structure with 3 columns :

* `timestamp`: The timestamp sent by statsd flush event.
* `name`: The gauge's name.
* `value`: The gauge's value.

The primary key is a composed of fields: `timestamp` and `name`. 

A new line is inserted only if the gauge's new value differ from it's last inserted value.

If you send multiple values for the same gauge during a flush interval, statsd only keeps the last received value.

Exemple :

your flush interval is set to 10 seconds and you send :
```bash
myGauge:2|g
# Wait 1 second
myGauge:5|g
```
the value that will be stored for this flush interval for your gauge 'myGauge' will be : `5`

## Timers ##

Timers are properties that record a time duration for an event.

Each timer key has a list of values that were recieved during a flush interval.
This Backend does not compute the raw data received, it is up to the displaying frontend to do the calculation if needed.

Meaning that if the flush interval is set to 10 seconds and you send 5 different values for the same timer between two flushes,
you will have 5 database rows with the same (`key`,`timestamp`).

You will then be able to compute the Xth percentile for the treshold that you want, the stadard dev, the mean, min and max values from the raw data.

### Timers Data Structure ###

By default, timers values are stored into a `timers_statistics` table. 

This table has a very simple structure with 3 columns :

* `id` : Auto-incremeted primary key
* `timestamp`: The timestamp sent by statsd flush event.
* `name`: The timer's name.
* `value`: The timer's value.

## Not implemented yet ##

This is a list of statsd stuff that don't _yet_ work with this backend :

* sets


## Customizing MySQL Backend Database ##

If you want to change the table name or structure to suit your particular needs, just follow the guide :)

By default database tables are defined like that :
````js
{
	counters: ["counters_statistics"],
	gauges: ["gauges_statistics"],
	timers: ["timers_statistics"],
	sets: ["sets_statistics"]
}
```

If we want to duplicate statsd counters datas into a new table called 'duplicate_counters_stats', we have to add a new table name to counters tables list.

Open statsd config file, go to the mysql section and add tables configuration :
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

Then place a new SQL script creating this new table in the "nodejs-statsd-mysql-backend/tables" directory.
The file should be nammed "[table_name].sql", so create a file named 'duplicate_counters_stats.sql'.

Example SQL script 'duplicate_counters_stats.sql' :
```sql
-- Stadard DELIMITER is $$

-- Duplicate Counters statistics table
CREATE  TABLE `statsd_db`.`duplicate_counters_stats` (
    `timestamp` BIGINT NOT NULL ,
    `name` VARCHAR(255) NOT NULL ,
    `value` INT(11) NOT NULL ,
PRIMARY KEY (`name`, `timestamp`) )$$
```

The last step is the modification of the Counters Query Engine. 

We could create a new Query Engine but we will see how to do that in the next section.

Open the file "nodejs-statsd-mysql-backend/engines/countersEngine.js".

We will focus on a specific line of this file :
```js
querries.push("insert into `counters_statistics` select "+time_stamp+", '"+userCounterName+"' , if(max(value),max(value),0) + "+counterValue+"  from `counters_statistics`  where if(name = '"+userCounterName+"', 1,0) = 1 ;");
```

Just duplicate this line and change the table name :
```js
querries.push("insert into `counters_statistics` select "+time_stamp+", '"+userCounterName+"' , if(max(value),max(value),0) + "+counterValue+"  from `counters_statistics`  where if(name = '"+userCounterName+"', 1,0) = 1 ;");
querries.push("insert into `duplicate_counters_stats` select "+time_stamp+", '"+userCounterName+"' , if(max(value),max(value),0) + "+counterValue+"  from `duplicate_counters_stats`  where if(name = '"+userCounterName+"', 1,0) = 1 ;");
```

Your values will be inserted in the two tables: 'counters_statistics' and 'duplicate_counters_stats'.

In this example, colums are the same in the two tables so, we just have to change the table name.

But you can do anything with this...


## Customizing MySQL Backend Query Engines ##

If you want to add customized querry engines to MySQL Backend, it's pretty easy.

First, create a new engine in "nodejs-statsd-mysql-backend/engines" directory.
For example, copy the existing "countersEngine.js" and rename it into "customizedCountersEngine.js".

Modify the new "customizedCountersEngine.js" to suit your needs and declare your new engine in MySQL Backend configuration.

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

Your querry engine will be triggered on each flush for each new counter.
