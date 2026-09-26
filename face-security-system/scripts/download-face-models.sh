#!/usr/bin/env bash
# Downloads the face-api.js model weights this project needs into public/models.
# Requires internet access. Run once before `npm run dev`.
set -e

DEST="public/models"
mkdir -p "$DEST"
BASE="https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master"

FILES=(
  "tiny_face_detector/tiny_face_detector_model-weights_manifest.json"
  "tiny_face_detector/tiny_face_detector_model-shard1"
  "face_landmark_68/face_landmark_68_model-weights_manifest.json"
  "face_landmark_68/face_landmark_68_model-shard1"
  "face_recognition/face_recognition_model-weights_manifest.json"
  "face_recognition/face_recognition_model-shard1"
  "face_recognition/face_recognition_model-shard2"
)

for f in "${FILES[@]}"; do
  fname=$(basename "$f")
  echo "Downloading $fname..."
  curl -sSL "$BASE/$f" -o "$DEST/$fname"
done

echo ""
echo "Done. Files in $DEST:"
ls -1 "$DEST"
echo ""
echo "If any file is 0 bytes or contains an HTML error page, the repo path may"
echo "have changed — open https://github.com/justadudewhohacks/face-api.js-models"
echo "and copy the matching raw URLs manually."
