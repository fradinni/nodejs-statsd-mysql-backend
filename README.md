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

	*host:	MySQL instance host
	*port:	MySQL instance port
	*user:	MySQL user
	*password: MySQL password
	*database:	Default database where statsd table are stored

Optional parameters :

	*tables:		List of tables names used (ex: ["stats", "users"])
	*engines:	List of MySQL Backend engines (see 'MySQL Bakend Engines' chapter for more details)


## Introduction