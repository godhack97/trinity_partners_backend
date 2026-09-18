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
	}]
};
