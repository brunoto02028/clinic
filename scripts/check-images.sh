#!/bin/bash
for f in front-1772740156493.jpeg back-1772740161837.jpeg left-1772740169141.jpeg right-1772740173135.jpeg; do
  echo -n "$f: "
  curl -sI "https://bpr.rehab/uploads/body-assessments/cmmdvl97j000xl6dsxq1jvhuw/$f" 2>&1 | head -1
done
