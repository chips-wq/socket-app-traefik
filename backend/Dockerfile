# Stage 1: Build dependencies
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Stage 2: Run the application
FROM node:20-alpine AS runner

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy application code from builder
COPY --from=builder /app/. .

# Expose the port the app runs on
EXPOSE 5000

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV REDIS_URL=redis://redis:6379
ENV FRONTEND_URL=http://localhost

# Command to run the application
CMD ["node", "main.js"]
