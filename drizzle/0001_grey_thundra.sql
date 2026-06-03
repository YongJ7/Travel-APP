CREATE TABLE `expense_splits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expenseId` int NOT NULL,
	`memberId` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	CONSTRAINT `expense_splits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`memberId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`category` varchar(50) NOT NULL DEFAULT '기타',
	`expenseDate` date NOT NULL,
	`placeName` varchar(200),
	`note` text,
	`splitType` enum('equal','custom') NOT NULL DEFAULT 'equal',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `places` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`address` text,
	`lat` decimal(10,7),
	`lng` decimal(10,7),
	`category` varchar(50) DEFAULT '관광',
	`visitDate` date,
	`visitOrder` int DEFAULT 0,
	`status` enum('planned','visited') NOT NULL DEFAULT 'planned',
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `places_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `preparation_costs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`memberId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`category` varchar(50) NOT NULL DEFAULT '기타',
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `preparation_costs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trip_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`userId` int,
	`nickname` varchar(100) NOT NULL,
	`color` varchar(20) DEFAULT '#6366f1',
	`isGuest` boolean NOT NULL DEFAULT false,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`destination` varchar(200),
	`emoji` varchar(10) DEFAULT '✈️',
	`startDate` date,
	`endDate` date,
	`currency` varchar(10) NOT NULL DEFAULT 'KRW',
	`budget` decimal(15,2),
	`inviteCode` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trips_id` PRIMARY KEY(`id`),
	CONSTRAINT `trips_inviteCode_unique` UNIQUE(`inviteCode`)
);
