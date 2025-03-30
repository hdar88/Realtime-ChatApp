<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->
<a id="readme-top"></a>
<!--
*** Thanks for checking out the Best-README-Template. If you have a suggestion
*** that would make this better, please fork the repo and create a pull request
*** or simply open an issue with the tag "enhancement".
*** Don't forget to give the project a star!
*** Thanks again! Now go create something AMAZING! :D
-->



<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->

<!-- PROJECT LOGO -->

![Logo](https://github.com/user-attachments/assets/eea1f396-2fcb-4e87-b878-da489201f600)

<div align="center">
<h1 align="center">Realtime-ChatApp</h1>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About the project</a></li>
    <li><a href="#features">Features</a></li>
    <li><a href="#built-with">Built With</a></li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#prerequisites">Prerequisites</a></li>
      </ul>
    </li>
  </ol>
</details>

</details>



<!-- ABOUT THE PROJECT -->
## About The Project

💡 **Lightning-fast real-time chat** powered by **Node.js** and **Socket.io**!  

Stay connected with seamless messaging, instant updates, and a smooth user experience.  
No delays, no refreshes—just **pure, real-time communication**. 💬⚡

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Features

### 🚀 Authentication with JWT-Token for stateless design

<p align="center">
  <img src="https://github.com/user-attachments/assets/f176e557-1a7e-445c-be16-97ade243f814" alt="signup" width="45%"/>
  <img src="https://github.com/user-attachments/assets/4c569e60-c4f5-4cdf-a50a-8bd92dfc1fc5" alt="login" width="45%"/>
</p>

### ⏳ Realtime-Messaging with ```Socket.js``` 
* Including:
  ```
   ✏️ Typing Indicator 
   👓 Read Receipts for private and group chats
   🗃️ Persistent message history
   🎈 Online status of friends
  ```

 <p align="center">
  <img src="https://github.com/user-attachments/assets/fffe54ae-d657-4fdd-a810-58700f229c8e" alt="chat-1" width="45%"/>
  <img src="https://github.com/user-attachments/assets/823d6ab7-ef2d-4c82-828b-c1d55078510d" alt="chat-2" width="45%"/>
</p>

### 🎉 Group Chats with Permission Management

<p align="center">
  <img src="https://github.com/user-attachments/assets/0b6768e1-96b3-4b83-a77d-a9e25d8d700b" alt="Group-chat" width="30%"/>
  <img src="https://github.com/user-attachments/assets/2e8ee828-a317-4956-9bc5-070d2b1b12d8" alt="group-settings" width="30%"/>
  <img src="https://github.com/user-attachments/assets/20b86401-38bb-4d37-8d2c-145603aa1737" alt="create-group" width="30%"/>
</p>

### ⚙️ Profile Management and Profile Picture Generator 

![profile-settings](https://github.com/user-attachments/assets/aa15c069-9dc2-47d2-8967-59c83e263d47)


<p align="right">(<a href="#readme-top">back to top</a>)</p>


### Built With

* [![Node.js][Node.js]][Node-url]
* [![HTML][HTML]][HTML-url]
* [![CSS][CSS]][CSS-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

Follow these steps to setup the project locally:

### Prerequisites

- The installation of ```npm```is needed.
  ```sh
  npm install npm@latest -g
  ```

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/hdar88/Realtime-ChatApp.git
   ```
2. Install NPM packages
   ```sh
   npm install
   ```
4. Add an ```.env```-file and add the following environment variables:
```sh
ACCESS_TOKEN_SECRET=  // generate e.g. with 'openssl genrsa -out test_key.pem 2048' or 'openssl rand -hex 256'
REFRESH_TOKEN_SECRET= // generate e.g. with 'openssl genrsa -out test_key.pem 2048' or 'openssl rand -hex 256'
SERVER_PORT=    / e.g. 8080
MONGO_DB_URI=  // default: mongodb://localhost:27017
```
5. Change git remote url to avoid accidental pushes to base project
   ```sh
   git remote set-url origin github_username/repo_name
   git remote -v # confirm the changes
   ```
6. After setup of environment, run the following command to start the server:
```sh
npm run start
```

7. Check the connection to database and open the ```signup.html``` (e.g. with 'LiveServer')

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[Node.js]: https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white
[Node-url]: https://nodejs.org/
[HTML]: https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white
[HTML-url]: https://developer.mozilla.org/en-US/docs/Web/HTML
[CSS]: https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white
[CSS-url]: https://developer.mozilla.org/en-US/docs/Web/CSS
