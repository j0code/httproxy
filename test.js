const http = require("http")
const fs = require("fs")

const server = http.createServer({}, requestListener)
.listen(2456, () => console.log(`HTTP Server is running on http://localhost:${2456}`))

function requestListener(req, res) {
	var s = ""
	s += req.method + " " + req.url + " HTTP/" + req.httpVersion + "<br>"
	for(var h in req.headers) {
		s += "<br>" + h + ": " + req.headers[h]
	}
	res.setHeader("Content-Type", "text/html");
	res.writeHead(200);
	res.end(s)
}