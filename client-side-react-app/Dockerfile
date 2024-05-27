# Use the official Node.js image as a base
FROM node:18 AS build

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React app for production
RUN npm run build

# Use the official Nginx image to serve the built app
FROM nginx:alpine

# Copy the built app from the previous stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the script to generate runtime configuration
COPY generate-config.sh /usr/share/nginx/html/

# Make the script executable
RUN chmod +x /usr/share/nginx/html/generate-config.sh

# Expose port 4000 to the outside world
EXPOSE 4000

# Start Nginx server with the configuration script
CMD ["/bin/sh", "-c", "/usr/share/nginx/html/generate-config.sh && nginx -g 'daemon off;'"]
