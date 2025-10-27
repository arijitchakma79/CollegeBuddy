let express = require("express");
let app = express();
let hostname = "localhost";
let port = 3000;

app.use(express.static('public'));


app.get('/', async (req, res) => {
    console.log(req.originalUrl, req.headers, req.method);
    res.sendFile(__dirname + '/public/index.html');
  });

app.listen(port, hostname, function () {
  console.log(`http://${hostname}:${port}`);
});