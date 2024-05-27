#!/bin/sh
cat <<EOF > /usr/share/nginx/html/config/runtime-config.json
{
  "REACT_APP_API_URL": "${REACT_APP_API_URL}"
}
EOF
