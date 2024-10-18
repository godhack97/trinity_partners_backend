module.exports = {
	apps: [{
		name: "Trinity: backend",
		script: "node_modules/.bin/nest",
		args: "start",
		port: 9131,
		instances: 1,
		autorestart: true,
		watch: false,
		max_memory_restart: "1G",
		env: {
			"NODE_ENV": "prod"
		},
	}]
};
