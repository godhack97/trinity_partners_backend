module.exports = {
	apps: [{
		name: "Trinity: backend",
		cwd: __dirname,
		script: "dist/src/main.js",
		instances: 1,
		exec_mode: "fork",
		autorestart: true,
		watch: false,
		max_memory_restart: "1G",
		env: {
			NODE_ENV: "prod",
			PORT: "9131",
			NODE_TLS_REJECT_UNAUTHORIZED: "1"
		}
	}, {
		name: "Trinity: backup scheduler",
		cwd: __dirname,
		script: "scripts/backup-scheduler.js",
		instances: 1,
		exec_mode: "fork",
		autorestart: true,
		watch: false,
		max_memory_restart: "256M",
		env: {
			NODE_ENV: "prod",
			BACKUP_DIR: "/var/backups/trinity",
			BACKUP_HOUR_LOCAL: "2",
			BACKUP_MINUTE_LOCAL: "15",
			NODE_TLS_REJECT_UNAUTHORIZED: "1"
		}
	}]
};
