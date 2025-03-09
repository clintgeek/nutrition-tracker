#!/bin/bash

# Scripts to keep (important ones)
KEEP_SCRIPTS=(
  "deploy-full-ui.sh"           # Main deployment script
  "test_batch_processing.sh"    # Important test script
  "update_init_script.sh"       # Latest database initialization script
)

# Remove all .sh files except the ones we want to keep
for script in *.sh; do
  # Skip the current script
  if [ "$script" = "cleanup.sh" ]; then
    continue
  fi

  # Check if the script is in the keep list
  keep=false
  for keep_script in "${KEEP_SCRIPTS[@]}"; do
    if [ "$script" = "$keep_script" ]; then
      keep=true
      break
    fi
  done

  # Remove the script if it's not in the keep list
  if [ "$keep" = false ]; then
    echo "Removing $script"
    rm "$script"
  else
    echo "Keeping $script"
  fi
done

echo "Cleanup completed!"