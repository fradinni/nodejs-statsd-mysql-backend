-- Stadard DELIMITER is $$

-- Counters statistics table
CREATE  TABLE `statsd_db`.`counters_statistics` (
    `timestamp` BIGINT NOT NULL ,
    `name` VARCHAR(255) NOT NULL ,
    `value` INT(11) NOT NULL ,
PRIMARY KEY (`timestamp`) )$$