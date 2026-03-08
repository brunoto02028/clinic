#!/bin/bash
# Re-blur all existing body assessment photos with the updated blur script
for dir in /root/clinic-uploads/body-assessments/*/; do
  echo "=== Processing: $dir"
  for orig in "$dir"*-original.jpeg "$dir"*-original.jpg "$dir"*-original.png; do
    [ -f "$orig" ] || continue
    blurred="${orig/-original/}"
    echo "  Re-blurring: $orig -> $blurred"
    python3 /root/clinic/scripts/blur-faces.py "$orig" "$blurred" 2>&1
  done
done
echo "Done!"
