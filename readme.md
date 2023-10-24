## SpotMon – a very basic Spotify to MongoDB Crawler

Provide a Playlist URL and it will be saved as a collection into a mongoDB database

### Installation

Install with npm

```bash
npm install
```
#### Spotify

* Register a [Spotify developer account](https://developer.spotify.com/), if you haven't allready.

* Create a new App in your Dashboard and use `http://localhost:8080/callback`
as the callback url 
* obtain client id and client secret for your new app

#### .env

* make a copy of `.env_temp` and name it `.env`
* provide your credentials from the spotify app
* provide connection details for your mongoDB database

### Run

* obtain a playlist url from spotify
* run the node server with:
```bash
npm run spotmon [database name] [playlist url]
```

* open `http://localhost:8080/` in your browser and give the app permissions to fetch your playlist data
* you should get back a json object with the api response in your browser
* your terminal should give you a short message about a (un)successfull collection write.