/**
 * Automatically free the development port before `next dev` starts.
 *
 * On Windows, terminating a dev server session (Ctrl+C, closing terminal, or
 * IDE reloads) often leaves orphaned child Node processes listening on port 7007.
 * When `npm run dev` is executed again, Next.js crashes with `EADDRINUSE`.
 *
 * This script runs in `predev` to identify and terminate any stale process
 * holding port 7007 so `next dev` always starts cleanly without manual intervention.
 */
import { execSync } from 'child_process';

const PORT = process.env.PORT || 7007;

function freePort(port) {
  if (process.platform === 'win32') {
    try {
      // Use PowerShell Get-NetTCPConnection to find and terminate processes holding the port
      const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { if ($_ -ne ${process.pid} -and $_ -ne 0) { Write-Output $_; Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }"`;
      const output = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (output) {
        const pids = output.split(/\r?\n/).filter(Boolean);
        console.log(`[predev] Terminated stale process(es) holding port ${port}: ${pids.join(', ')}`);
        return;
      }
    } catch {
      // Fallback to netstat + taskkill if powershell command errors
    }

    try {
      const output = execSync('netstat -ano -p tcp', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const lines = output.split('\n');
      const pids = new Set();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.toUpperCase().startsWith('TCP')) continue;

        const parts = trimmed.split(/\s+/);
        const localAddr = parts[1] || '';
        const state = (parts[3] || '').toUpperCase();
        const pid = parts[4];

        const isTargetPort = localAddr.endsWith(`:${port}`);
        if (isTargetPort && state.includes('LISTEN') && pid && pid !== '0' && pid !== String(process.pid)) {
          pids.add(pid);
        }
      }

      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`[predev] Terminated stale process (PID ${pid}) holding port ${port}.`);
        } catch {}
      }
    } catch {}
  } else {
    try {
      const output = execSync(`lsof -t -i :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      const pids = output.split(/\s+/).filter(Boolean);
      for (const pid of pids) {
        if (pid && pid !== String(process.pid)) {
          try {
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
            console.log(`[predev] Terminated stale process (PID ${pid}) holding port ${port}.`);
          } catch {}
        }
      }
    } catch {}
  }
}

freePort(PORT);
