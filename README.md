- [Purpose of this project](#purpose-of-this-project)
- [Setup](#setup)
- [How to load extension in your browser?](#how-to-load-extension-in-your-browser)
- [Caching functionality](#caching-functionality)
- [Video showcase of extension](#video-showcase-of-extension)

## Purpose of this project

The purpose of this project is to have free text querying on www.mobile.bg so users can narrow down the search beyond the already existing filters. This tries to emulate the free text querying functionality found on www.mobile.de.

![image](./docs/images/mobile_de.jpg "Mobile DE Filter")

## Setup

```bash
npm i
npm run build
```

The code is bundled using webpack

```json
"build": "webpack --config webpack/webpack.config.js"
```

## How to load extension in your browser?

1. Go to Chrome's extension dashboard in the browser

2. In the top right corner, enable developer mode

3. In the top left corner, click 'Load unpacked'

4. Select the dist directory in the project (NOTE: you must build with previously mentioned command first)

## Caching functionality

The results of the last three searches from users are saved in local storage. When users are filtering for a keyword they have recently filtered for, the filter results are pulled from local storage. This is done in order to make recent searches faster but also to mitigate excessive requests to the mobile.bg website. If users want to search for something they viewed recently, they read it from cache instead of sending the same request again to the site. **Might be especially useful when you filter car brands with a lot of listings.**

## Video showcase of extension

https://github.com/bachomecho/mobile_extension/assets/64164772/55806260-ef93-4fe7-a4fb-232a421e0160
