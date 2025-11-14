# Image Upload Microservice


## Description

The Image Upload Microservice is a standalone Node.js service designed to support external applications requiring image uploads, resizing, and optional auto-enhancement. It is adaptable to multiple CS361 projects, including inventory management systems, study trackers, budget trackers, and similar applications requiring image processing.
The service handles the following core responsibilities:

- Accepting uploaded image files through a REST API.

- Generating medium and thumbnail versions of each uploaded image.

- Applying optional automatic enhancement (brightness, sharpness, saturation).

- Storing metadata about uploaded images.

- Limiting images to three per associated item or record.

- Providing retrieval and deletion endpoints for client applications.

This microservice allows the main application to offload image processing tasks and maintain a cleaner architecture.



### Key Features

- Supports JPEG, PNG, and WebP file formats.

- Accepts up to 3 images per itemId.

- Optional normalization, sharpening, and color modulation.

- Produces:

    - Original full-resolution image
    - Medium version (max 1200px)
    
- Thumbnail version (max 320px)

    - JSON-based metadata storage (easily replaceable with a database).
    - Integrated test interface using EJS.
    - CORS-configurable for local or remote clients.



    
## Project Directory Structure


    image-upload-microservice/  
    ├── server.js # Main server logic  
    |  
    ├── package.json # Dependencies and scripts  
    |  
    ├── .env # Environment variables (not committed)  
    |  
    ├── data/  
    │    └── media.json # Image metadata storage  
    |  
    ├── storage/  
    │    ├── original/ # Full-resolution images  
    │    ├── medium/ # Resized 1200px images  
    │    └── thumb/ # Thumbnails (max 320px)  
    |  
    ├── views/  
    │    └── test.ejs # Integrated test page  
    |  
    └── README.md # Documentation




## Tech Stack

- Node.js (v18+)
- Express.js
- Multer (file uploads)
- Sharp (image processing)
- EJS (test interface)
- JSON file storage (`data/media.json`)


    
## Setup and Installation

1.	Install Node.js (v20 or higher recommended).
3.	Clone the repository.
4.	Run: npm install
5.	Create a .env file or use the provided .env.example.
6.	Start the microservice: node server.js
7.	Open the browser and navigate to: http://localhost:4001/test


### Configuration

| Variable           | Required | Default | Description                                   |
|--------------------|----------|---------|-----------------------------------------------|
| PORT               | No       | 4001    | Port the microservice listens on              |
| CORS_ORIGIN        | No       | *\**    | Allowed origin(s) for CORS                    |
| MEDIA_SERVICE_BASE | No       | —       | Used by client app to build request URLs      |


### API Endpoints

1. Service Health
GET /health
Returns a simple JSON response confirming that the service is running.
2. Upload Image    
#### POST /media/upload        

- Form-data fields:
  - `photo` (file, required) — JPEG/PNG image
  - `itemId` (string, required) — ID of associated item
  - `enhance` (boolean, optional) — `"true"` to apply auto enhancement

**Responses:**

- `201 Created` with JSON:
  ```json
  {
    "id": "uuid",
    "itemId": "123",
    "paths": {
      "original": "/media/file.jpg",
      "medium": "/media/file_medium.jpg",
      "thumb": "/media/file_thumb.jpg"
    }
  }

- 400 Bad Request if photo or itemId is missing
- 422 Unprocessable Entity if the item already has 3 images



4. Retrieve Images for an Item
GET /media/by-item/:itemId
5. Retrieve a Single Image
GET /media/:id?variant=original|medium|thumb
6. Delete an Image
DELETE /media/:id



    
## Usage

Integration Example

A main application can upload an image using Axios:

```bash
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
```

### Deployment Guide

Local Development

- Run node server.js

- Access the test interface at /test

- Configure main app with:

- MEDIA_SERVICE_BASE=http://localhost:4001



### Testing Tools

The integrated test.ejs page supports:

- Manual image uploads

- Listing media by itemId

- Viewing thumbnails/medium/original

- Deleting images

This enables quick validation without needing the main application.



    
## License


MIT License
Copyright (c) 2025 Kristian Guevarra and Fu Shing Kong (Sam) 

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights    
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell      
copies of the Software, and to permit persons to whom the Software is          
furnished to do so, subject to the following conditions:                        

The above copyright notice and this permission notice shall be included in all  
copies or substantial portions of the Software.                                 

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR      
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,        
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE     
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER          
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,   
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE  
SOFTWARE.

This project is license under the MIT License. You are free to use, modify, and distribute this software for any purpose, including commercial applications, as long as the original copyright notice is included.



    
## Authors

This project was developed collaboratively by the following CS361 students:
Kristian Guevarra and Fu Shing Kong (Sam)

