#!/bin/bash

# Install required packages if not already installed
if ! command -v convert &> /dev/null; then
    echo "Installing ImageMagick..."
    brew install imagemagick
fi

# Create output directory if it doesn't exist
mkdir -p public/icons

# Generate PNG icons in various sizes
sizes=(72 96 128 144 152 192 384 512)

for size in "${sizes[@]}"; do
    # Generate regular icon
    convert -background none -size "${size}x${size}" public/icons/icon.svg "public/icons/icon-${size}x${size}.png"

    # Generate maskable icon (with padding for adaptive icons)
    convert -background none -size "${size}x${size}" -gravity center -extent "${size}x${size}" public/icons/icon.svg "public/icons/maskable-${size}x${size}.png"
done

echo "Icons generated successfully!"