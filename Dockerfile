# Use an official Node.js runtime as a parent image
FROM node:18-bullseye-slim

# Set the working directory in the container
WORKDIR /app

# Install necessary dependencies for Puppeteer (the headless browser)
RUN apt-get update && apt-get install -y \
    gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 \
    libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 \
    libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
    libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 \
    libxi6 libxrandr2 libxrender1 libxss1 libxtst6 \
    ca-certificates fonts-liberation libappindicator1 libnss3 \
    lsb-release xdg-utils wget --no-install-recommends

# Copy package.json and package-lock.json 
COPY package*.json ./ 
COPY .npmrc ./ 

# Install app dependencies with suppressed warnings 
RUN npm install --no-audit --no-fund --silent

# Copy app source
COPY . .

# Your app's dashboard binds to port 3000
EXPOSE 3000

# Define the command to run your app
CMD ["node", "final.js"]