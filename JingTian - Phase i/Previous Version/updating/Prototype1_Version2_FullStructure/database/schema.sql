-- EVA SQUARE database schema (SQLite) -- generated from backend/app/models.py via SQLAlchemy.
-- Regenerate after changing models.py: see database/README.md

CREATE TABLE users (
	id INTEGER NOT NULL, 
	full_name VARCHAR(200) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	created_at DATETIME, 
	PRIMARY KEY (id)
);

CREATE TABLE action_plan_items (
	id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	rec_code VARCHAR(80) NOT NULL, 
	done BOOLEAN, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_user_reccode UNIQUE (user_id, rec_code), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE consent_records (
	id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	required_json TEXT, 
	optional_json TEXT, 
	accepted_terms_version VARCHAR(50), 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (user_id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE reports (
	id VARCHAR(40) NOT NULL, 
	user_id INTEGER NOT NULL, 
	file_name VARCHAR(255), 
	lab VARCHAR(255), 
	report_date VARCHAR(20), 
	status VARCHAR(20), 
	profile_json TEXT, 
	labs_raw_json TEXT, 
	labs_verified_json TEXT, 
	lab_confidence_json TEXT, 
	original_text TEXT, 
	trend_history_json TEXT, 
	uploaded_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE sessions (
	token VARCHAR(64) NOT NULL, 
	user_id INTEGER NOT NULL, 
	created_at DATETIME, 
	expires_at DATETIME NOT NULL, 
	PRIMARY KEY (token), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE settings (
	id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	units VARCHAR(20), 
	notifications BOOLEAN, 
	theme VARCHAR(20), 
	PRIMARY KEY (id), 
	UNIQUE (user_id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE analysis_results (
	id INTEGER NOT NULL, 
	report_id VARCHAR(40) NOT NULL, 
	result_json TEXT, 
	computed_at DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (report_id), 
	FOREIGN KEY(report_id) REFERENCES reports (id)
);

CREATE TABLE questionnaire_answers (
	id INTEGER NOT NULL, 
	report_id VARCHAR(40) NOT NULL, 
	answers_json TEXT, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (report_id), 
	FOREIGN KEY(report_id) REFERENCES reports (id)
);

