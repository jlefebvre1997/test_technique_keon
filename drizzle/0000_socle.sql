CREATE TABLE `equipement` (
	`id` integer PRIMARY KEY NOT NULL,
	`site_id` integer NOT NULL,
	`code` text NOT NULL,
	`libelle` text NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `equipement_code_par_site` ON `equipement` (`site_id`,`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `equipement_id_site` ON `equipement` (`id`,`site_id`);--> statement-breakpoint
CREATE TABLE `intervention` (
	`id` integer PRIMARY KEY NOT NULL,
	`site_id` integer NOT NULL,
	`equipement_id` integer NOT NULL,
	`technicien_id` integer NOT NULL,
	`date_debut` text NOT NULL,
	`duree_minutes` integer,
	`description` text NOT NULL,
	`statut` text DEFAULT 'OUVERTE' NOT NULL,
	`cree_le` text NOT NULL,
	`modifie_le` text NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`technicien_id`) REFERENCES `utilisateur`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`equipement_id`,`site_id`) REFERENCES `equipement`(`id`,`site_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "intervention_duree_positive" CHECK(duree_minutes IS NULL OR duree_minutes > 0),
	CONSTRAINT "intervention_description_non_vide" CHECK(length(trim(description)) > 0),
	CONSTRAINT "intervention_statut" CHECK(statut IN ('OUVERTE', 'EN_COURS', 'CLOSE')),
	CONSTRAINT "intervention_close_avec_duree" CHECK(statut <> 'CLOSE' OR duree_minutes IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX `idx_intervention_site_date` ON `intervention` (`site_id`,`date_debut`);--> statement-breakpoint
CREATE INDEX `idx_intervention_site_statut` ON `intervention` (`site_id`,`statut`);--> statement-breakpoint
CREATE TABLE `rattachement_site` (
	`utilisateur_id` integer NOT NULL,
	`site_id` integer NOT NULL,
	PRIMARY KEY(`utilisateur_id`, `site_id`),
	FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateur`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `site` (
	`id` integer PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`nom` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_code_unique` ON `site` (`code`);--> statement-breakpoint
CREATE TABLE `utilisateur` (
	`id` integer PRIMARY KEY NOT NULL,
	`matricule` text NOT NULL,
	`nom` text NOT NULL,
	`prenom` text NOT NULL,
	`role` text NOT NULL,
	CONSTRAINT "utilisateur_role" CHECK(role IN ('TECHNICIEN', 'RESPONSABLE_EXPLOITATION'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `utilisateur_matricule_unique` ON `utilisateur` (`matricule`);