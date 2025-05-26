CREATE TABLE `all_records` (
  `User_id` int NOT NULL AUTO_INCREMENT,
  `Amount` int NOT NULL,
  `Name` varchar(30) NOT NULL,
  `Father_name` varchar(30) NOT NULL,
  `Location` varchar(30) NOT NULL,
  `Date` date NOT NULL,
  `type` varchar(12) DEFAULT NULL,
  `weight` text,
  `deposit` int DEFAULT NULL,
  `deposit_date` date DEFAULT NULL,
  PRIMARY KEY (`User_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9328 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `daily_assessment` (
  `date` date NOT NULL,
  `total_cash` double DEFAULT NULL,
  `added_cash` double DEFAULT NULL,
  `removed_cash` double DEFAULT NULL,
  `left_cash` double DEFAULT NULL,
  `deposit_debit` double DEFAULT NULL,
  PRIMARY KEY (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `deposits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `deposit_amount` int NOT NULL,
  `deposit_date` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `deposits_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `all_records` (`User_id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `fingerprint_table` (
  `user_id` int DEFAULT NULL,
  `fingerprint_data` blob,
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `fingerprint_table_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `all_records` (`User_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `removed_records` (
  `User_id` int NOT NULL,
  `Amount` int NOT NULL,
  `Name` varchar(30) NOT NULL,
  `Father_name` varchar(30) NOT NULL,
  `Location` varchar(30) NOT NULL,
  `Date` date NOT NULL,
  `Removed_date` date DEFAULT (curdate()),
  `Type` varchar(10) NOT NULL,
  `Weight` float(8,3) DEFAULT NULL,
  `Interest` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
