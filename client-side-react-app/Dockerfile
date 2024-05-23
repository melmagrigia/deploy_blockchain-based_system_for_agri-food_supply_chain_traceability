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

# Copy .env file to the Docker container
COPY .env .env

# Build the React app for production
RUN npm run build

# Use the official Nginx image to serve the built app
FROM nginx:alpine

# Copy the built app from the previous stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 4000 to the outside world
EXPOSE 4000

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
