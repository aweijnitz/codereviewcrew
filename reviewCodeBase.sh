#!/bin/bash

# Check if the file path argument is provided
if [ -z "$1" ]; then
  echo "Error: Missing file path to code base."
  echo "Usage: $0 <folder path> [report-file.md]"
  exit 1
fi


# Check if the build directory and main.js file exist
if [ ! -d "build" ] || [ ! -f "build/src/main.js" ]; then
  echo "Build directory or main.js not found. Running build process..."
  npm run build
fi

# Run the node command with the third argument
LOG_LEVEL=info node build/src/main.js "$1" "$2"
