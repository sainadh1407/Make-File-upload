# Make-File-Upload
Upload 'n' number of files using Node, RabbitMQ and Docker and upload into AWS S3 bucket


# Run below commands
# Stop all running containers
docker stop $(docker ps -q)

# Remove all containers
docker rm $(docker ps -a -q)

# Remove all images
docker rmi -f $(docker images -q)

# To define and orchestrate multi-container Docker applications using a YAML file called docker-compose.yml
docker-compose up --build

# RabbitMQ 
http://localhost:15672 with valid credentails

# Build the Docker image 
docker build -t node-s3-rabbitmq-app .

# To run the Docker image on port 3000
docker run -p 3000:3000 --env-file .env node-s3-rabbitmq-app

# Open Postman and Run this command
http://localhost:4000/upload

Select Body -> form-data -> key as files -> select File type from dropdown
