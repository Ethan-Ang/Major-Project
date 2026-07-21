#!/usr/bin/env bash
# Full deploy for the client-feedback release (Phases 0/A/B/C/D).
# Backs up each live file, uploads, then verifies (live re-download == local repo).
# Covers the public bundle + admin pages + api endpoints + uploads/.htaccess.
#
# PREREQUISITE: run the 5 DB migrations in phpMyAdmin FIRST (see DEPLOY notes),
# otherwise the new admin pages + endpoints will error until the tables exist.
#
# NEVER touches: index.html, about.html, home.html, config.php (teammate/secrets).
# Run from the repo root:  bash deploy_all.sh
set -u
cd "$(dirname "$0")"

ENVF="frontend/ftp.env"; [ -f "$ENVF" ] || ENVF="ftp.env"
[ -f "$ENVF" ] || { echo "ftp.env not found"; exit 1; }
H=$(grep -a FTP_HOST "$ENVF" | sed 's/.*=//' | tr -d '\r\n[:space:]"')
U=$(grep -a FTP_USER "$ENVF" | sed 's/.*=//' | tr -d '\r\n[:space:]"')
P=$(grep -a FTP_PASS "$ENVF" | sed 's/.*=//' | tr -d '\r\n[:space:]"')
[ -n "$H$U$P" ] || { echo "could not read FTP creds"; exit 1; }

# Files to deploy (paths relative to frontend/ and to the live web root).
DEPLOY="
products.html product-detail.html compare.html enquiry.html contact.html
js/data.js js/core/app.js js/pages/products.js js/pages/product-detail.js js/pages/contact.js js/widgets/footer.js
admin/dashboard.html admin/products.html admin/enquiries.html admin/login.html
admin/filters.html admin/filters.js admin/settings.html admin/settings.js admin/downloads.html admin/downloads.js
admin/admin.js
api/products.php api/enquiries.php api/taxonomies.php api/settings.php api/downloads.php
api/document_request.php api/download_document.php api/product_documents.php api/delete_product_document.php
uploads/.htaccess
"

# Hard guard: never deploy teammate/secret files.
NEVER="index.html about.html home.html config.php"

TS=$(date +%Y-%m-%dT%H%M%S)
BK="ftp_backup/${TS}_predeploy_full"
echo "== Backing up live copies to $BK (new files will show 0 bytes) =="
for f in $DEPLOY; do
  case " $NEVER " in *" $(basename "$f") "*) echo "REFUSING $f"; exit 1;; esac
  mkdir -p "$BK/$(dirname "$f")"
  curl -s --max-time 60 "ftp://$H/$f" --user "$U:$P" -o "$BK/$f" 2>/dev/null
done

echo "== Uploading =="
fail=0
for f in $DEPLOY; do
  curl -s --max-time 90 --ftp-create-dirs -T "frontend/$f" "ftp://$H/$f" --user "$U:$P" >/dev/null 2>&1
  rc=$?; [ "$rc" = 0 ] && st=OK || { st=FAIL; fail=$((fail+1)); }
  printf "  %-42s %s\n" "$f" "$st"
done

echo "== Verifying (live re-download == local repo, ignoring line endings) =="
mism=0
for f in $DEPLOY; do
  tmp="$(mktemp)"
  curl -s --max-time 60 "ftp://$H/$f" --user "$U:$P" -o "$tmp" 2>/dev/null
  if diff -q <(tr -d '\r' < "$tmp") <(tr -d '\r' < "frontend/$f") >/dev/null 2>&1; then
    printf "  %-42s MATCH\n" "$f"
  else
    printf "  %-42s DIFFERS!\n" "$f"; mism=$((mism+1))
  fi
  rm -f "$tmp"
done

echo "== Done. upload_failures=$fail  verify_mismatches=$mism  backup=$BK =="
[ "$fail" = 0 ] && [ "$mism" = 0 ] && echo "SUCCESS: all files deployed and verified." || echo "REVIEW: some files need attention (check the backup to roll back)."
echo ""
echo "NOTE: if live already had an uploads/.htaccess, its original is in $BK/uploads/.htaccess — merge if it had rules you need to keep."
