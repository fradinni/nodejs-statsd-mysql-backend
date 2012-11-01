DROP SCHEMA IF EXISTS `statsd_db`;
CREATE SCHEMA `statsd_db` DEFAULT CHARACTER SET utf8 ;
CREATE  TABLE `statsd_db`.`statistics` (
    `timestamp` BIGINT NOT NULL ,
    `name` VARCHAR(255) NOT NULL ,
    `value` VARCHAR(45) NOT NULL ,
PRIMARY KEY (`timestamp`, `name`) );