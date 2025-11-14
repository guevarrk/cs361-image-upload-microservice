**Image Upload Microservice**

Overview
The Image Upload Microservice is a standalone Node.js service designed to support external applications requiring image uploads, resizing, and optional auto-enhancement. It is adaptable to multiple CS361 projects, including inventory management systems, study trackers, budget trackers, and similar applications requiring image processing.
The service handles the following core responsibilities:
•	Accepting uploaded image files through a REST API.
•	Generating medium and thumbnail versions of each uploaded image.
•	Applying optional automatic enhancement (brightness, sharpness, saturation).
•	Storing metadata about uploaded images.
•	Limiting images to three per associated item or record.
•	Providing retrieval and deletion endpoints for client applications.
This microservice allows the main application to offload image processing tasks and maintain a cleaner architecture.

Key Features
•	Supports JPEG, PNG, and WebP file formats.
•	Accepts up to 3 images per itemId.
•	Optional normalization, sharpening, and color modulation.
•	Produces:
o	Original full-resolution image
o	Medium version (max 1200px)
o	Thumbnail version (max 320px)
•	JSON-based metadata storage (easily replaceable with a database).
•	Integrated test interface using EJS.
•	CORS-configurable for local or remote clients.


Project Structure
image-upload-microservice/
	server.js
	.env
	data/
		media.json
	storage/
		original/
		medium/
		thumb/
	views/
		test.ejs



Setup and Installation
1.	Install Node.js (v18 or higher recommended).
2.	Clone the repository.
3.	Run: npm install
4.	Create a .env file or use the provided .env.example.
5.	Start the microservice: node server.js
6.	Open the browser and navigate to: http://localhost:4001/test

API Endpoints
1. Service Health
GET /health
Returns a simple JSON response confirming that the service is running.
2. Upload Image
POST /media/upload
Form fields:
photo — Image file (required)
itemId — Associated record ID (required)
enhance — Boolean flag (true or false)
3. Retrieve Images for an Item
GET /media/by-item/:itemId
4. Retrieve a Single Image
GET /media/:id?variant=original|medium|thumb
5. Delete an Image
DELETE /media/:id

Integration Example
A main application can upload an image using Axios:
		const axios = require('axios');
		const FormData = require('form-data');
		const fs = require('fs');
	
	async function uploadPhoto(photoPath, itemId) {
	  const fd = new FormData();
	  fd.append('photo', fs.createReadStream(photoPath));
	  fd.append('itemId', itemId);
	  fd.append('enhance', 'true');
	
	  const res = await axios.post(
	    process.env.MEDIA_SERVICE_BASE + '/media/upload',
	    fd,
	    { headers: fd.getHeaders() }
	  );
	
	  	return res.data;
	}

Deployment Guide

Local Development
•	Run node server.js
•	Access the test interface at /test
•	Configure main app with:
•	MEDIA_SERVICE_BASE=http://localhost:4001

OSU ENGR Server (SSH Tunnel Required)
1.	SSH into ENGR:
2.	ssh your_onid@access.engr.oregonstate.edu
3.	Run the microservice
4.	Tunnel from your local machine:
5.	ssh your_onid@access.engr.oregonstate.edu -L 4001:localhost:4001

Render.com Deployment
•	Build command: npm install
•	Start command: node server.js
•	Set PORT environment variable
•	Use Render URL as MEDIA_SERVICE_BASE

Testing Tools
The integrated test.ejs page supports:
•	Manual image uploads
•	Listing media by itemId
•	Viewing thumbnails/medium/original
•	Deleting images
This enables quick validation without needing the main application.

