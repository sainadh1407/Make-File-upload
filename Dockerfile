# Node.js as the base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /src/

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the port the app runs on
EXPOSE 4000

#Start the application
CMD ["npm", "--trace-warnings", "start"]
