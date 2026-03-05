# Secure OpenClaw VPS Setup on OVH (Debian 13, No AppArmor, No Docker)

**Goal**: Fresh, hardened Debian VPS with native OpenClaw (latest version), Tailscale access for secure remote UI. This guide removes AppArmor to avoid compatibility issues on Debian 13 (Trixie). Install Tailscale early for secure remote access to OpenClaw's web UI from anywhere. OpenClaw gateway listens only on localhost (127.0.0.1), with no public ports exposed—access via Tailscale serve. Docker will be added later for hosting websites and Postgres if needed.

**Time**: 1–2 hours  
**Access**: SSH only (port 2222, whitelisted IPs) \+ Tailscale \+ Telegram

**Notes**:

- Use Debian 13 (Trixie) for up-to-date packages.  
- OpenClaw is installed natively (global NPM/PNPM) for simplicity; CLI and gateway run on host.  
- No AppArmor: Purged for stability, as it caused permission errors. Security relies on UFW, Fail2Ban, least privilege.  
- Tailscale installed before OpenClaw for immediate UI access.  
- Install git before NPM to avoid errors.  
- Use non-root user for OpenClaw to fix permissions.  
- Env vars for keys (with xAI/Grok placeholders); config in `~/.openclaw/openclaw.json`.  
- Onboarding after install sets up daemon service.  
- Default model: OAuth ChatGPT (configure via OpenAI OAuth integration in OpenClaw docs/UI after setup).  
- Fallbacks: Claude API, Grok API (set in config or UI).  
- Brave Search API key configured for search integration (BRAVE\_SEARCH\_API\_KEY).  
- Skills safety: Use `openclaw skills install <name> --scan` to check for malicious code.  
- Fixes for common issues: Enable systemd linger for user services, use tokenized URL for first UI access, approve device pairings.  
- Later: Add Docker for isolated Postgres and website hosting.

## 1\. Wipe & Reinstall (OVH Panel)

1. Log into OVHcloud Manager (manager.ovh.com).  
2. Public Cloud \> Project \> Instances \> Your VPS \> ... \> Reinstall.  
3. Choose **Debian 13 (Trixie)** – minimal server image.  
4. Upload your SSH public key (`~/.ssh/id_rsa.pub` from local machine).  
5. Set a strong root password.  
6. Confirm reinstall – this wipes everything.  
7. Wait for ping/SSH to respond, then connect: `ssh root@your-vps-ip`.  
8. Immediate updates: `apt update && apt upgrade -y && apt autoremove -y`.  
9. Reboot: `reboot`.

## 2\. OS Hardening (No AppArmor)

### Create Non-Root User

adduser youruser

usermod \-aG sudo youruser

Log out, SSH back as `youruser@your-vps-ip -p 2222` (after SSH config below).

### SSH Config (Key-Only, Custom Port, Whitelists)

Edit `/etc/ssh/sshd_config` (use `sudo vi` or editor of choice):

Port 2222

PermitRootLogin no

PasswordAuthentication no

PubkeyAuthentication yes

Restart: `sudo systemctl restart sshd`.

### Firewall (UFW) with Whitelists

sudo apt install ufw \-y

sudo ufw allow from \<home-ip\> to any port 2222 proto tcp

sudo ufw allow from \<office-ip\> to any port 2222 proto tcp

sudo ufw allow 2222/tcp  \# Fallback

sudo ufw enable

### Fail2Ban for Brute-Force Protection

sudo apt install fail2ban \-y

sudo tee /etc/fail2ban/jail.local \<\<EOF

\[sshd\]

enabled \= true

port \= 2222

EOF

sudo systemctl restart fail2ban

### Disable IPv6 (Optional, If Unused)

sudo tee /etc/sysctl.d/99-disable-ipv6.conf \<\<EOF

net.ipv6.conf.all.disable\_ipv6 \= 1

net.ipv6.conf.default.disable\_ipv6 \= 1

net.ipv6.conf.lo.disable\_ipv6 \= 1

EOF

sudo sysctl \-p

sudo sed \-i 's/GRUB\_CMDLINE\_LINUX\_DEFAULT="/\&ipv6.disable=1 /' /etc/default/grub

sudo update-grub

sudo reboot

### Auto-Updates and Purge AppArmor

sudo apt install unattended-upgrades \-y

sudo dpkg-reconfigure unattended-upgrades  \# Enable security updates

sudo apt purge apparmor apparmor-profiles apparmor-utils apparmor-profiles-extra \-y  \# Remove AppArmor

sudo apt autoremove \-y

sudo reboot  \# Unload kernel module

### Additional Tools (Lynis for Audits, Logwatch, Git)

sudo apt install lynis logwatch git \-y  \# Git needed for npm/clone if customizing

sudo lynis audit system  \# Run audit, fix high-priority warnings

## 3\. Install Tailscale (For Secure Remote Access)

Install Tailscale early to access OpenClaw UI securely from anywhere via serve.

curl \-fsSL https://tailscale.com/install.sh | sh

sudo tailscale up  \# Login with Google/GitHub/etc. (free personal plan)

tailscale status  \# Verify connected

## 4\. Dependencies

\# Node.js (for OpenClaw)

curl \-fsSL https://deb.nodesource.com/setup\_22.x | sudo \-E bash \-

sudo apt install \-y nodejs

sudo npm install \-g pnpm openclaw@latest  \# Latest OpenClaw CLI and global install

## 5\. OpenClaw Setup (Native, Localhost Only)

Run as non-root user (`youruser`). No dedicated user needed for native install.

### Clone Repo (Optional, for Customization)

git clone https://github.com/openclaw/openclaw.git \~/openclaw

cd \~/openclaw

pnpm install && pnpm build  \# If customizing; global install is sufficient otherwise

### Set Environment Variables

For API keys and search, set as env vars (add to `~/.bashrc` for persistence: `vi ~/.bashrc`, add exports, then `source ~/.bashrc`):

export OPENAI\_OAUTH\_CLIENT\_ID=your-openai-oauth-client-id  \# For ChatGPT OAuth (default model; setup via OpenAI dashboard)

export OPENAI\_OAUTH\_CLIENT\_SECRET=your-openai-oauth-secret

export OPENAI\_OAUTH\_SCOPE=openai  \# Or appropriate scopes

export CLAUDE\_AI\_SESSION\_KEY=sk-ant-api03-XXXX  \# Claude fallback

export XAI\_API\_KEY=xai-XXXX  \# Grok fallback

export XAI\_BASE\_URL=https://api.x.ai/v1

export TELEGRAM\_BOT\_TOKEN=your-bot-token

export OPENCLAW\_GATEWAY\_PASSWORD=your-strong-password  \# For UI auth

export OPENCLAW\_GATEWAY\_TOKEN=your-gateway-token  \# Alternative token auth

export BRAVE\_SEARCH\_API\_KEY=your-brave-api-key  \# For Brave search integration (obtain from brave.com/search/api)

Create or edit `~/.openclaw/openclaw.json` for config (use `vi ~/.openclaw/openclaw.json`):

{

  "gateway": {

    "host": "127.0.0.1",

    "port": 18789,

    "auth": {

      "mode": "password"

    },

    "tailscale": {

      "mode": "off"  \# We'll handle externally

    }

  },

  "agent": {

    "model": "openai/gpt-4o"  \# Default: OAuth ChatGPT (configure OAuth in OpenClaw UI/onboard)

  },

  "fallbacks": \[  \# Fallback models (configure in UI if not supported in JSON; order: Claude, Grok)

    "anthropic/claude-opus-4-6",

    "grok/grok-4-1-fast"

  \],

  "search": {

    "brave": {

      "apiKey": "your-brave-api-key"  \# Brave Search config (overrides env if needed)

    }

  },

  "channels": {

    "telegram": {

      "botToken": "your-bot-token",

      "dmPolicy": "pairing",

      "allowFrom": \["your-telegram-username"\]

    }

  }

}

### Enable Persistent User Services (For Systemd Daemon)

To fix "systemd user services unavailable" in doctor:

sudo loginctl enable-linger youruser  \# Replace with your username

Log out and back in (or reboot). Then add to `~/.bashrc` (vi \~/.bashrc, source \~/.bashrc):

export XDG\_RUNTIME\_DIR="/run/user/$(id \-u)"

export DBUS\_SESSION\_BUS\_ADDRESS="unix:path=${XDG\_RUNTIME\_DIR}/bus"

### Install and Onboard

openclaw onboard \--install-daemon  \# Sets up systemd user service for gateway; configure OAuth during prompts if needed

openclaw doctor \--fix  \# Check config and apply fixes

### Run Gateway (Handled by Daemon)

The daemon starts the gateway automatically on login. Manual start for testing (integrated Tailscale):

openclaw gateway \--port 18789 \--verbose \--bind loopback \--tailscale serve

Check status: `systemctl --user status openclaw-gateway.service`

To integrate Tailscale in daemon: Edit `~/.config/systemd/user/openclaw-gateway.service` (add `--bind loopback --tailscale serve` to ExecStart), then:

systemctl \--user daemon-reload

systemctl \--user restart openclaw-gateway.service

### Telegram/Email/Git Isolation

- Telegram: Configured in JSON. Approve pairings: `openclaw pairing list telegram` and `openclaw pairing approve telegram <code>`.  
- Email: Set up GCP as per OpenClaw docs (install `sudo apt install google-cloud-sdk -y`).  
- Git: Use allowlists in config for safe commands.

### Device Pairing Approval (For UI/Remote Access)

For "pairing required" errors:

openclaw devices list  \# List pending requests

openclaw devices approve \<ID\>  \# Approve browser/device ID

Retry UI access.

If persistent: Temporarily add to `~/.openclaw/openclaw.json`:

"gateway": {

  "controlUi": {

    "dangerouslyDisableDeviceAuth": true

  }

}

Restart daemon and re-enable after setup.

## 6\. Access OpenClaw UI (Laptop/Phone)

- Install Tailscale client on devices, login with same account.  
- Make the UI accessible via Tailscale (integrated in gateway or separate persistent service).  
- For first access, get tokenized URL:  
    
  openclaw dashboard \--no-open  \# Copy ?token= or \#token= part  
    
- Access: `https://your-vps.tailnet.ts.net/?token=your-token-here` (HTTPS, no port; clear browser cache/localStorage first).  
- After connection, reload without token—it should persist.  
- For persistent serve (if not integrated): See notes below.

## 7\. Monitoring & Backups

- Logs: `sudo logwatch --detail Low --mailto your@email --service all --range yesterday`.  
- OpenClaw Updates: Add to crontab (`crontab -e`):  
    
  0 3 \* \* \* openclaw update && systemctl \--user restart openclaw-gateway.service  
    
- Backups: OVH panel snapshots (weekly). Configs: `rsync -avz ~/.openclaw /backup/dir`.  
- Vulnerability Scans: `sudo lynis audit system` (weekly cron).

## Quick Checklist

- [ ] SSH whitelists/Fail2Ban working  
- [ ] Tailscale connected (`tailscale status`)  
- [ ] OpenClaw gateway running (`systemctl --user status openclaw-gateway.service`)  
- [ ] OpenClaw gateway up, Telegram paired (`openclaw doctor`)  
- [ ] UI accessible via Tailscale (localhost bind only, tokenized first access)

Done\! If issues (e.g., OpenClaw updates: `openclaw update`), ask. Later, add Docker for Postgres and website hosting (revisit original guide sections 4-5, 8). Archive this MD file locally.

**Persistent Tailscale Serve Note** (If Not Integrated in Gateway): Create `/etc/systemd/system/tailscale-serve.service`:

\[Unit\]

Description=Tailscale Serve for OpenClaw UI

After=network.target tailscaled.service

\[Service\]

ExecStart=/usr/bin/tailscale serve \--https=443 http://127.0.0.1:18789

Restart=always

User=root

\[Install\]

WantedBy=multi-user.target

Enable: `sudo systemctl enable --now tailscale-serve.service`.  
