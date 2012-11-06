-- Stadard DELIMITER is $$

-- Counters statistics table
CREATE  TABLE `timers_statistics` (
    `timestamp` BIGINT NOT NULL ,
    `name` VARCHAR(255) NOT NULL ,
    `value` INT(11) NOT NULL ,
PRIMARY KEY (`timestamp`,`name`) )$$
