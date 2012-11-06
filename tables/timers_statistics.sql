-- Stadard DELIMITER is $$

-- Counters statistics table
CREATE  TABLE `timers_statistics` (
	`id` BIGINT NOT NULL AUTO_INCREMENT ,
	`timestamp` BIGINT NOT NULL ,
	`name` VARCHAR(255) NOT NULL ,
	`value` BIGINT NOT NULL ,
PRIMARY KEY (`id`) )$$