#!/bin/bash
# Re-blur all photos for a body assessment using the new MediaPipe script
ASSESSMENT_DIR="/root/clinic-uploads/body-assessments/cmmdvl97j000xl6dsxq1jvhuw"
SCRIPT="/root/clinic/scripts/blur-faces.py"

for view in front back left right; do
  ORIGINAL=$(ls -t "$ASSESSMENT_DIR/${view}-"*"-original."* 2>/dev/null | head -1)
  if [ -z "$ORIGINAL" ]; then
    echo "SKIP: No original for $view"
    continue
  fi
  # Derive the blurred filename (remove -original)
  BLURRED=$(echo "$ORIGINAL" | sed 's/-original//')
  echo "Processing $view: $ORIGINAL -> $BLURRED"
  python3 "$SCRIPT" "$ORIGINAL" "$BLURRED"
done
echo "Done!"
