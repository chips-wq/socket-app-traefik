# Stage 1: Build the React application
FROM node:20-alpine as builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build arguments that will be used as environment variables during the build
ARG REACT_APP_API_URL
ARG REACT_APP_SOCKET_PATH
ARG NODE_ENV

# Set environment variables for the build
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SOCKET_PATH=$REACT_APP_SOCKET_PATH
ENV NODE_ENV=$NODE_ENV

# Print environment variables for debugging
RUN echo "REACT_APP_API_URL is: $REACT_APP_API_URL" && \
    echo "REACT_APP_SOCKET_PATH is: $REACT_APP_SOCKET_PATH" && \
    echo "NODE_ENV is: $NODE_ENV"

# Build the application
RUN npm run build

# Stage 2: Serve the built application with Nginx
FROM nginx:alpine

# Copy the build output from the previous stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
