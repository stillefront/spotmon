const { MongoClient } = require('mongodb');
const express = require('express');
const querystring = require('querystring');
const request = require('request'); // is this really neccessary, or can i just write a fetch function?

const { URL } = require('url'); // for parsing playlist urls


require('dotenv').config();


// command line args

const databaseName = process.argv[2];
console.log("databaseName: " + databaseName);
const playListUrl = process.argv[3];
const playlistId = getPlaylistId(playListUrl);
console.log("playlistId: " + playlistId);

// mongo connection string
const mongo_url = process.env.MONGO_URL;
const mongo_port = process.env.MONGO_PORT;
const database = process.env.MONGO_DB;

const uri = `mongodb://${mongo_url}:${mongo_port}/${database}`;

async function main() {
    const client = new MongoClient(uri);

    try {
        // Connect to the MongoDB cluster
        await client.connect();

        // list databases
        // await listDatabases(client);

        // Make sure that it is connected
        console.log("Connected to MongoDB on port " + mongo_port);

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

main().catch(console.error);

// express stuff

let app = express();
const express_port = process.env.EXPRESS_PORT;
console.log('Express is listening on ' + express_port);
app.listen(express_port);


// experimentall spotify auth

let client_id = process.env.CLIENT_ID;

var redirect_uri = process.env.REDIRECT_URI;

app.get('/', function (req, res) {

    var state = generateRandomString(16);
    var scope = 'user-read-private user-read-email';

    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));
});

app.get('/callback', function (req, res) {
    let client_secret = process.env.CLIENT_SECRET;

    var code = req.query.code || null;
    var state = req.query.state || null;

    if (state === null) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {

                var access_token = body.access_token,
                    refresh_token = body.refresh_token;

                // use the access token to access the Spotify Web API profile data
                /* var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                request.get(options, function (error, response, body) {
                    console.log(body);
                    console.log("access_token: " + access_token);
                    // return body data to client as json
                    res.json(body);
                }); */

                // get playlist data
                let items = encodeURIComponent("images,name,tracks.items(track(!available_markets))");
                var playlistOptions = {
                    url: 'https://api.spotify.com/v1/playlists/' + playlistId + '?fields=' + items,
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                request.get(playlistOptions, function (error, response, body) {
                    // create a new array of track objects from the items array
                    const tracks = body.tracks.items.map(item => item.track);
                    //console.log(response);
                    const client = new MongoClient(uri);
                    console.log(tracks);
                    savePlayListToNewCollection(client, body.name, tracks);
                    res.json(body);
                });


            } else {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});


// helper functions

function generateRandomString(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    console.log("random string: " + text);
    return text;
}

function getPlaylistId(playlistUrl) {
    const parsedUrl = new URL(playlistUrl);
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    const playlistId = pathSegments[1];

    return playlistId;
}


// move this to dedicated mongoDB operations file...
async function listDatabases(client) {
    databasesList = await client.db().admin().listDatabases();

    console.log("Databases:");
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));
};

async function savePlayListToNewCollection(client, collectionName, playlist) {
    collectionName = collectionName.replace(/\s/g, ''); // get rid of whitespace
    try {
        await client.connect();
        const result = await client.db(databaseName).collection(collectionName).insertMany(playlist);
        if (result.insertedCount === playlist.length) {
            console.log('All documents inserted successfully into ' + databaseName + ' collection ' + collectionName + '.)');
        } else {
            console.error('Some documents failed to insert.');
            const failedInserts = documents.length - result.insertedCount;
            console.error(`Failed to insert ${failedInserts} documents.`);
            console.error('Failed documents IDs:', result.insertedIds);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
