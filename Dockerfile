FROM node:20-bullseye-slim

# Install system dependencies required for native hardware bindings
# - build-essential & python3: For node-gyp (serialport, bluetooth, etc.)
# - libusb-1.0-0 / rtl-sdr: For SDR adapters
# - ffmpeg / v4l-utils: For camera and video streaming
# - udev: For Linux device mapping
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    libusb-1.0-0 \
    libusb-1.0-0-dev \
    rtl-sdr \
    ffmpeg \
    v4l-utils \
    udev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root configurations
COPY package.json package-lock.json tsconfig.base.json ./

# Copy all platform packages
COPY packages/core ./packages/core
COPY packages/server ./packages/server
# Copy all hardware adapters
COPY adapters/adapter-mock ./adapters/adapter-mock
COPY adapters/adapter-usb-camera ./adapters/adapter-usb-camera
COPY adapters/adapter-rtl-sdr ./adapters/adapter-rtl-sdr

# Install dependencies (workspaces automatically link)
RUN npm install

# Build all TypeScript packages
RUN npm run build --workspaces --if-present

# Switch working directory to the server package where the startup script lives
WORKDIR /app/packages/server

# OAHL Node runs on 3000 by default
EXPOSE 3000

# Start the node daemon
CMD ["npm", "start"]
