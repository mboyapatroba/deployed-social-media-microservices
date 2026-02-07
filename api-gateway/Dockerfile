# Tells Docker to Start from an image that already has Node.js installed with alpine linux
FROM node:18-alpine

# Sets the working directory inside the container
WORKDIR /usr/src/app

#Docker instruction to copy files from your local machine (build context) into the image current working directory /usr/src/app
COPY package*.json ./

# installs only the exact production dependencies during image build, creating a smaller and more reliable Node.js container skip all the dev dependencies
RUN npm ci --only=production

# Copy everything from the current directory on your machine into the current directory inside the container.
COPY . .

EXPOSE 3000

CMD [ "node", "src/server.js" ]

# When this container starts, run my Node server, which listens on port 3000.


# By copying package.json before the rest of the code, Docker can cache dependency installation and avoid rerunning npm ci when only source code changes.