# Use Node.js LTS version as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV REDIS_URL=redis://redis:6379
ENV FRONTEND_URL=http://localhost

# Command to run the application
CMD ["node", "main.js"]