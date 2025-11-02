FROM node:20.11.0

WORKDIR /workspace

# Install exact versions from package.json
COPY package.json ./
RUN npm install

# Copy source code
COPY . .

# Install Playwright browsers (cached layer)
RUN npx playwright install --with-deps chromium

# Output directory mounted as volume
RUN mkdir -p /output
