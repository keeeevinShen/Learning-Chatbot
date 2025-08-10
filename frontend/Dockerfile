# Stage 1: Build the React application
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Optimize caching: install deps first
COPY package*.json ./
# Recompute deps for Linux container to avoid platform-specific lock issues
# Do NOT omit optional deps so rollup native binary gets installed for this platform
RUN rm -f package-lock.json && npm install

# Ensure Rollup native binary is present for linux/arm64 (Docker Desktop builder on Apple Silicon)
# Fall back to x64 if arm64 package doesn't apply (no-op on non-matching arch)
RUN npm install --no-save @rollup/rollup-linux-arm64-gnu || npm install --no-save @rollup/rollup-linux-x64-gnu || true

# Copy source and build
COPY . .
ARG VITE_SERVER_ADDRESS
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_SERVER_ADDRESS=$VITE_SERVER_ADDRESS
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV ROLLUP_SKIP_NATIVE=true
RUN npm run build

# Stage 2: Serve the built assets with a lightweight non-root runtime
FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Install a minimal static file server
RUN npm i -g serve@14

# Copy build artifacts only
COPY --from=build /app/dist /app/dist

# Use the pre-existing non-root user in node image
USER node

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
