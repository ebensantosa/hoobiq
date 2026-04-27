/**
 * pm2 process file for Hoobiq.
 *
 * Two long-running processes:
 *   - hoobiq-api: NestJS server (port 4000, fork mode — Prisma + Socket.IO
 *     don't play perfectly with cluster mode without extra work)
 *   - hoobiq-web: Next.js standalone server (port 3000, cluster mode 2)
 *
 * Used by scripts/deploy.sh:
 *   pm2 startOrReload ecosystem.config.js --update-env
 */
module.exports = {
  apps: [
    {
      name: "hoobiq-api",
      cwd: "/var/www/hoobiq/apps/api",
      script: "dist/main.js",
      // env vars come from /var/www/hoobiq/apps/api/.env via dotenv loaded
      // inside the app at boot — not from pm2 ecosystem here. Keeps secrets
      // out of pm2's saved process list.
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      autorestart: true,
      out_file: "/var/log/hoobiq/api-out.log",
      error_file: "/var/log/hoobiq/api-err.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "hoobiq-web",
      cwd: "/var/www/hoobiq/apps/web",
      // Next standalone output ships its own server.js
      script: ".next/standalone/apps/web/server.js",
      instances: 2,
      exec_mode: "cluster",
      env: {
        // Next reads PORT from the environment.
        PORT: "3000",
        HOSTNAME: "127.0.0.1",
      },
      max_memory_restart: "512M",
      autorestart: true,
      out_file: "/var/log/hoobiq/web-out.log",
      error_file: "/var/log/hoobiq/web-err.log",
      merge_logs: true,
      time: true,
    },
  ],
};
