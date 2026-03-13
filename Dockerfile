FROM node:18-alpine

WORKDIR /app

# Copy root package.json and workspace configuration
COPY package.json tsconfig.base.json ./
# Copy core package
COPY packages/core ./packages/core
# Copy adapters
COPY packages/adapter-mock ./packages/adapter-mock
COPY packages/adapter-usb-camera ./packages/adapter-usb-camera
COPY packages/adapter-rtl-sdr ./packages/adapter-rtl-sdr
# Copy server
COPY packages/server ./packages/server

# Install dependencies and build all workspaces
# Note: npm workspaces require the root directory to run npm install
RUN npm install
RUN npm run build --workspaces

WORKDIR /app/packages/server
EXPOSE 3000

CMD ["npm", "start"]
