#!/usr/bin/env bash
# ReBond public-pages deploy — backup, upload, verify.
# Deploys ONLY your 6 public pages + the shared bundle they load.
# NEVER touches: index.html, about.html, admin/*, api/*, config.php.
# Run from the repo root:  bash deploy_rebond_public.sh
set -u
cd "$(dirname "$0")"

ENVF="frontend/ftp.env"; [ -f "$ENVF" ] || ENVF="ftp.env"
if [ ! -f "$ENVF" ]; then echo "ftp.env not found"; exit 1; fi
H=$(grep -a FTP_HOST "$ENVF" | sed 's/.*=//' | tr -d '\r\n[:space:]"')
U=$(grep -a FTP_USER "$ENVF" | sed 's/.*=//' | tr -d '\r\n[:space:]"')
P=$(grep -a FTP_PASS "$ENVF" | sed 's/.*=//' | tr -d '\r\n[:space:]"')

# 21 files: 6 public HTML + shared bundle that differs from live.
# (js/vendor/swup.umd.js is identical to live -> not listed.)
# home.js + index.html are intentionally NOT here: the home page is the
# teammate's live page, and index.html is already hard-guarded in NEVER below.
DEPLOY="
products.html product-detail.html compare.html enquiry.html contact.html 404.html
css/products.css css/dropdown-ui.css
js/widgets/navbar.js js/widgets/footer.js js/widgets/compare.js js/widgets/custom-select.js js/widgets/page-transitions.js js/widgets/chatbot.js
js/core/app.js js/data.js
js/pages/products.js js/pages/product-detail.js js/pages/enquiry.js js/pages/compare-page.js js/pages/contact.js
"
# Hard guard: refuse to ever touch teammate / protected files.
NEVER="index.html about.html admin api config.php"

TS=$(date +%Y-%m-%dT%H%M%S)
BK="ftp_backup/${TS}_predeploy"
echo "== Backing up live copies to $BK =="
for f in $DEPLOY; do
  case " $NEVER " in *" $f "*) echo "REFUSING $f"; exit 1;; esac
  mkdir -p "$BK/$(dirname "$f")"
  curl -s --max-time 60 "ftp://$H/$f" --user "$U:$P" -o "$BK/$f"
done

echo "== Uploading =="
fail=0
for f in $DEPLOY; do
  curl -s --max-time 90 -T "frontend/$f" "ftp://$H/$f" --user "$U:$P" >/dev/null 2>&1
  rc=$?; [ "$rc" = 0 ] && st=OK || { st=FAIL; fail=$((fail+1)); }
  printf "  %-32s %s\n" "$f" "$st"
done

echo "== Verifying (live re-download == local repo) =="
mism=0
for f in $DEPLOY; do
  tmp="$(mktemp)"
  curl -s --max-time 60 "ftp://$H/$f" --user "$U:$P" -o "$tmp"
  if diff -q <(tr -d '\r' < "$tmp") <(tr -d '\r' < "frontend/$f") >/dev/null 2>&1; then
    printf "  %-32s MATCH\n" "$f"
  else
    printf "  %-32s DIFFERS!\n" "$f"; mism=$((mism+1))
  fi
  rm -f "$tmp"
done

echo "== Done. upload_failures=$fail  verify_mismatches=$mism  backup=$BK =="
echo "Rollback if needed:  for f in $DEPLOY; do curl -s -T \"$BK/\$f\" \"ftp://$H/\$f\" --user \"\$U:\$P\"; done"
[ "$fail" = 0 ] && [ "$mism" = 0 ] && echo "SUCCESS: all files deployed and verified." || echo "REVIEW: some files need attention."
