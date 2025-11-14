Image Upload Microservice


Overview

The Image Upload Microservice is a standalone Node.js service used to support external applications that require image uploads, resizing, and optional auto-enhancement. It is designed to integrate with CS361 main projects such as inventory systems, expense trackers, or study logging tools.

This microservice handles the following responsibilities:

Accepting image uploads through a REST API

Generating medium and thumbnail versions of each image

Applying optional enhancement (brightness, sharpness, saturation)

Storing basic metadata such as width, height, file size, and timestamp

Restricting each item or record to a maximum of three images

Returning accessible URLs for each stored version

This service modularizes image processing, reducing the workload of the main application.

Key Features

Upload up to three photos per itemId

Optional auto-enhancement during upload

Supports JPEG, PNG, and WebP formats

Generates three persistent image versions:

Original resolution

Medium (up to 1200px)

Thumbnail (up to 320px)

JSON-based metadata storage

Retrieval and deletion API endpoints

Integrated EJS-based testing interface

CORS support for external applications

Project Structure
image-upload-microservice/
│
├── server.js                # Core server logic
├── .env                     # Optional environment configuration
├── data/
│   └── media.json           # Metadata storage
├── storage/
│   ├── original/            # Original images
│   ├── medium/              # Medium-sized images
│   └── thumb/               # Thumbnails
└── views/
    └── test.ejs             # Integrated test interface

Setup and Installation
Requirements

Node.js v18 or higher

npm package manager

Steps

Clone the repository

Install dependencies:

npm install


(Optional) Create a .env file:

PORT=4001
CORS_ORIGIN=http://localhost:3000


Start the server:

node server.js


Open the test interface in your browser:

http://localhost:4001/test

API Endpoints
1. Health Check

GET /health
Returns a JSON status message to confirm that the service is running.

2. Upload Image

POST /media/upload

Form fields:

photo — Required file input

itemId — Required text value

enhance — Optional (true or false)

Returns:

Image metadata

URLs for original, medium, and thumbnail versions

3. List Media by Item

GET /media/by-item/:itemId
Returns a list of all images associated with the given itemId.

4. Retrieve an Image

GET /media/:id?variant=original|medium|thumb
Returns the selected version of the image.

5. Delete Image

DELETE /media/:id
Deletes all versions of the specified image and removes its metadata entry.

Integration Example

A main application can upload images using Axios:

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function uploadPhoto(photoPath, itemId) {
  const fd = new FormData();
  fd.append("photo", fs.createReadStream(photoPath));
  fd.append("itemId", itemId);
  fd.append("enhance", "true");

  const res = await axios.post(
    process.env.MEDIA_SERVICE_BASE + "/media/upload",
    fd,
    { headers: fd.getHeaders() }
  );

  return res.data;
}

Deployment Guide
Local Development

Run node server.js

Access the interface at: http://localhost:4001/test

Configure your main application:

MEDIA_SERVICE_BASE=http://localhost:4001

OSU ENGR Server (SSH Tunnel)

SSH into the ENGR environment

Start the service using Node

On your local machine, run:

ssh your_onid@access.engr.oregonstate.edu -L 4001:localhost:4001


Access using your local browser

Render.com Deployment

Build command: npm install

Start command: node server.js

Set the PORT environment variable

Use the Render URL as your MEDIA_SERVICE_BASE

Testing

Use the integrated test page at /test to:

Upload images

View thumbnails and medium versions

List all images associated with an item

Delete images

This page allows fully validating microservice functionality before integrating with a main application.

Conclusion

The Image Upload Microservice serves as a flexible, reusable backend component for applications requiring image processing. By handling uploads, resizing, enhancement, and metadata management, it simplifies the responsibilities of the main application and supports clean CS361 microservice architecture.
