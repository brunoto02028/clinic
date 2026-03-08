#!/usr/bin/env python3
"""
Face blur script for body assessment photos.
Uses OpenCV DNN SSD face detector for accurate face-only blurring.
Detects frontal AND side profile faces with high confidence.
Eliminates false positives by restricting detections to the head region.
Usage: python3 blur-faces.py <input_image_path> <output_image_path>
"""

import sys
import cv2
import numpy as np
import os

# Path to DNN model files (relative to this script)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROTOTXT = os.path.join(SCRIPT_DIR, "models", "deploy.prototxt")
CAFFEMODEL = os.path.join(SCRIPT_DIR, "models", "res10_300x300_ssd_iter_140000.caffemodel")

def blur_faces(input_path, output_path):
    img = cv2.imread(input_path)
    if img is None:
        print(f"ERROR: Could not read image: {input_path}", file=sys.stderr)
        sys.exit(1)

    h, w = img.shape[:2]
    faces_blurred = 0

    # Try DNN SSD face detector (much more accurate than Haar, handles profiles)
    if os.path.exists(PROTOTXT) and os.path.exists(CAFFEMODEL):
        net = cv2.dnn.readNetFromCaffe(PROTOTXT, CAFFEMODEL)

        # Create blob from image (300x300 is the model's expected input)
        blob = cv2.dnn.blobFromImage(
            cv2.resize(img, (300, 300)), 1.0, (300, 300),
            (104.0, 177.0, 123.0), swapRB=False, crop=False
        )
        net.setInput(blob)
        detections = net.forward()

        for i in range(detections.shape[2]):
            confidence = detections[0, 0, i, 2]

            # Only accept high-confidence face detections (>= 60%)
            if confidence < 0.60:
                continue

            # Get bounding box in pixel coordinates
            x1 = int(detections[0, 0, i, 3] * w)
            y1 = int(detections[0, 0, i, 4] * h)
            x2 = int(detections[0, 0, i, 5] * w)
            y2 = int(detections[0, 0, i, 6] * h)

            # RULE: face center must be in the top 35% of the image
            # Body assessment photos are standing full-body shots
            face_center_y = (y1 + y2) / 2
            if face_center_y > h * 0.35:
                continue

            # RULE: face should not be too large (max 30% of image area)
            # Prevents blurring large false positives
            face_area = (x2 - x1) * (y2 - y1)
            if face_area > (w * h * 0.30):
                continue

            # Expand region aggressively: cover everything from top of image
            # down to below chin (neck area). Full anonymity: hair, ears, neck.
            bw = x2 - x1
            bh = y2 - y1
            expand_side = 0.60  # 60% wider each side for hair/ears
            expand_bottom = 0.40  # 40% below face for neck/chin
            ex = int(max(0, x1 - bw * expand_side))
            ey = 0  # Always start from top of image to cover hair
            ew = int(min(w, x2 + bw * expand_side) - ex)
            eh = int(min(h, y2 + bh * expand_bottom) - ey)

            if ew <= 0 or eh <= 0:
                continue

            # Apply heavy Gaussian blur to face region only
            face_region = img[ey:ey+eh, ex:ex+ew]
            ksize = max(99, int(max(ew, eh) * 0.8))
            if ksize % 2 == 0:
                ksize += 1
            blurred_region = cv2.GaussianBlur(face_region, (ksize, ksize), 50)
            img[ey:ey+eh, ex:ex+ew] = blurred_region
            faces_blurred += 1
            print(f"  Face detected ({confidence:.0%}) at [{ex},{ey},{ew},{eh}]", file=sys.stderr)
    else:
        print(f"WARN: DNN model not found at {PROTOTXT}", file=sys.stderr)

    # Fallback: if no face detected, blur everything from top to ~22% height, wide center
    if faces_blurred == 0:
        # Cover hair + head + neck: top 22% of image, 40% width centered
        head_h = int(h * 0.22)
        head_w = int(w * 0.40)
        head_x = int((w - head_w) / 2)

        face_region = img[0:head_h, head_x:head_x+head_w]
        ksize = max(99, int(head_h * 0.8))
        if ksize % 2 == 0:
            ksize += 1
        blurred_region = cv2.GaussianBlur(face_region, (ksize, ksize), 50)
        img[0:head_h, head_x:head_x+head_w] = blurred_region
        faces_blurred = 1
        print(f"  Fallback: blurred top-center head region", file=sys.stderr)

    cv2.imwrite(output_path, img, [cv2.IMWRITE_JPEG_QUALITY, 95])
    print(f"OK:{faces_blurred}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 blur-faces.py <input> <output>", file=sys.stderr)
        sys.exit(1)
    blur_faces(sys.argv[1], sys.argv[2])
