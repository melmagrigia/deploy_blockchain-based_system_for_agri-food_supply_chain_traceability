# Use the official Nginx image to serve the built app
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 4000 to the outside world
EXPOSE 4000

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
