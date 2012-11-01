nodejs-statsd-mysql-backend
===========================

MySQL backend for Statsd

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

* `tables`: List of tables names used (ex: ["stats", "users"]).
* `engines`: List of MySQL Backend engines (see 'MySQL Bakend Engines' chapter for more details).


## Introduction
This is node.js backend for statsd. It is written in JavaScript, does not require compiling, and is 100% MIT licensed.

It save statsd received values to a MySQL database.

## Data Structure for statsd counters
By default, values are stored into a 'counters_statistics' table. This table has a very simple structure with 3 columns :
* `timestamp`: The timestamp sent by statsd flush event
* `name`: The counter name
* `value`: The counter value
The primary key of this table is composed by fields: timestamp and name. It means when a new value arrives for a counter, this value is added to the previous one and stored in database. With this mechanism, we can keep a log of counters values.

