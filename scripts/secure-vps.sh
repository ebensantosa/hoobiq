#!/usr/bin/env bash
# ===========================================================================
# Hoobiq — SSH hardening
# Run AFTER you've confirmed SSH key login works.
# ===========================================================================
#   1. Disable root SSH password login (only key auth)
#   2. Disable challenge-response & pam password auth
#   3. Set safe SSH defaults (no X11 forwarding, etc.)
#
# WARNING: if your SSH key isn't working yet, this will lock you out.
# Test FIRST: from another terminal, `ssh root@VPS_IP` should succeed
# without password prompt.
# ===========================================================================
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "❌ Run as root: sudo bash secure-vps.sh"
  exit 1
fi

CFG=/etc/ssh/sshd_config
BACKUP="${CFG}.bak.$(date +%Y%m%d-%H%M%S)"

echo "▶ Backup current sshd_config → $BACKUP"
cp "$CFG" "$BACKUP"

# ----- Apply settings via override file (cleaner than sed-rewriting CFG) ---
OVERRIDE=/etc/ssh/sshd_config.d/99-hoobiq-hardening.conf
cat >"$OVERRIDE" <<'CFG'
# Hoobiq hardening — appended by scripts/secure-vps.sh
# This file overrides anything in /etc/ssh/sshd_config (alphabetical-last wins).

PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
KbdInteractiveAuthentication no
UsePAM yes
PermitRootLogin prohibit-password
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
MaxAuthTries 3
LoginGraceTime 30
CFG

# ----- Validate config before reload ---------------------------------------
echo "▶ Validating sshd config…"
if ! sshd -t -f "$CFG"; then
  echo "❌ sshd config invalid — restoring backup and aborting"
  cp "$BACKUP" "$CFG"
  rm -f "$OVERRIDE"
  exit 1
fi

# ----- Reload (NOT restart — restart kills our session) --------------------
systemctl reload ssh || systemctl reload sshd

echo
echo "==========================================================================="
echo "✅ SSH hardening applied"
echo "==========================================================================="
echo "Test from a NEW terminal before closing this one:"
echo "  ssh -i ~/.ssh/hoobiq_deploy root@\$(hostname -I | awk '{print \$1}')"
echo
echo "If you can't get back in, your old session is still alive — restore:"
echo "  cp $BACKUP $CFG && rm -f $OVERRIDE && systemctl reload ssh"
echo "==========================================================================="
