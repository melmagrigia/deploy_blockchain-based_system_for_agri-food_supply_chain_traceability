# Use the official Node.js image as a base
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Compile TypeScript code to JavaScript
RUN npm run build

# Copy .env file to the Docker container
COPY .env .env

# Expose port 3000 to the outside world
EXPOSE 3000

# Command to run the application
CMD ["node", "server.js"]
