-- Stadard DELIMITER is $$

-- Timers statistics table
CREATE  TABLE `sets_statistics` (
	`timestamp` BIGINT NOT NULL ,
	`name` VARCHAR(255) NOT NULL ,
	`value` BIGINT NOT NULL ,
PRIMARY KEY (`timestamp`,`name`) )$$