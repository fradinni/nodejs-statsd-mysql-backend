-- Stadard DELIMITER is $$

-- Counters statistics table
CREATE  TABLE `statsd_db`.`counters_statistics` (
    `timestamp` BIGINT NOT NULL ,
    `name` VARCHAR(255) NOT NULL ,
    `value` INT(11) NOT NULL ,
PRIMARY KEY (`name`, `timestamp`) )$$

-- Procedure used to calculate values sum for the same userKey name
CREATE FUNCTION `counters_get_max`(_name VARCHAR(255)) RETURNS INT(11)
READS SQL DATA
BEGIN 
      DECLARE r INT;
      SELECT  MAX(`value`)
      INTO    r
      FROM    `statsd_db`.`counters_statistics`
      WHERE   name = _name;
      
      RETURN IF(r IS NULL, 0, r);
END$$