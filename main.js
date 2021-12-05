const http = require("http")
const https = require("https")
const fs = require("fs")
const logger = require("./logger.js")

const version = "0.1.0"
const proxyHeader = `httproxy v${version} (c) by j0code`

const responseCodes = {
	400: "Bad Request",
	404: "Not Found",
	418: "I'm A Teapot",
	500: "Internal Server Error",
	503: "Service Unavailable"
}

console.clear()

const config = loadConfig()

const options = {
  key: fs.readFileSync(config.https.cert.key),
  cert: fs.readFileSync(config.https.cert.fullchain)
};

const httpsServer = https.createServer(options, (req, res) => requestListener("https", req, res));
const httpServer = http.createServer({}, (req, res) => requestListener("http", req, res));

httpsServer.listen(config.https.port, () => logger.info("HTTP", "LISTEN", `HTTPS Server is running on https://localhost:${config.https.port}`))
httpServer.listen(config.http.port, () => logger.info("HTTP", "LISTEN", `HTTP Server is running on http://localhost:${config.http.port}`))

httpsServer.on("error", e => {
	logger.error("HTTP", "ERROR", "Unhandled error occured in HTTPS Server:", e)
	process.kill(0)
})

httpServer.on("error", e => {
	logger.error("HTTP", "ERROR", "Unhandled error occured in HTTP Server:", e)
	process.kill(0)
})

function requestListener(s, req, res) {
	var url = new URL(req.url, `https://${req.headers.host}`);

	if(req.url.startsWith("/.well-known/")) { // for certbot support
		logger.info("HTTP", "REQUEST", "Proxy <-> " + req.socket.remoteAddress + " :", req.method, req.url, "(certbot support)")
		if(req.url.includes("..")) {
			respondError(res, 418, "Nice try.", "EDOTDOT")
		}
		else fs.readFile("." + req.url, "utf8", (e, data) => {
			if(e) {
				logger.info("HTTP", "CERTBOT", e)
				if(["ENOTFOUND","ENOENT"].includes(e.code)) respondError(res, 404, "Not Found.", "ENOTFOUND")
				else respondError(res, 500, "PROXY ERROR<br>Please try again later.", (e.code || "Unknown"))
				return
			}
			res.setHeader("Content-Type", "text/plain")
			res.writeHead(200)
			res.end(data)
		})
	} else if(config.hosts[url.hostname]) {
		proxyFetch(config.hosts[url.hostname].secure, config.hosts[url.hostname].dest, req, res);
	} else {
		logger.info("HTTP", "REQUEST", "Proxy <-> " + req.socket.remoteAddress + " :", req.method, req.url, "(default fallback)")
		res.setHeader("Content-Type", "text/html");
		res.writeHead(200);
		res.end(s + "<br>" + req.method + " " + req.url + "<br>" + url.hostname + ":" + url.port + url.pathname + "<br>" + url + "<br><br>" + req.rawHeaders.join("<br>") + provideLinks());
		logger.info("HTTP", "RESPONSE", "Proxy <-> " + req.socket.remoteAddress + " :", res.statusCode, res.statusMessage)
	}
}

function proxyFetch(secure, host, creq, cres) {
	logger.info("HTTP", "REQUEST", "Proxy <-> " + creq.socket.remoteAddress + " :", creq.method, creq.url, "on " + host)
	var browserHost = creq.headers.host; // stores the host the browser tries to connect to
	var headers = creq.headers;
	headers.host = host;
	if(headers.origin) try {
		headers.origin = replaceHost(creq.headers.origin, browserHost, host)
	} catch(e) {
		respondError(cres, ...e)
		return
	}
	if(headers.referer) {
		try {
			headers.referer = replaceHost(creq.headers.referer, browserHost, host)
		} catch(e) {
			delete headers.referer
		}
		//delete headers.referer
	}
	//delete headers["upgrade-insecure-requests"];
	headers.proxy = proxyHeader
	//console.log(headers)
	logger.attempt("HTTP", "FETCH", host + " <-> Proxy :", creq.method, creq.url)
	var sreq = (secure ? https : http).request(`http${secure ? "s" : ""}://` + host, {headers, host, path: creq.url})
	sreq.on("timeout", () => logger.warn("HTTP", "FETCH", "Unhandled timeout:"))
	sreq.on("upgrade", (req, socket, head) => logger.warn("HTTP", "FETCH", "Unhandled upgrade:", req, socket, head))
	sreq.on("response", sres => handleResponse(secure, host, headers, browserHost, creq, cres, sreq, sres))
	sreq.on("error", e => {
		logger.failure("HTTP", "FETCH", e)
		if(["ENOTFOUND","ECONNREFUSED"].includes(e.code)) {
			respondError(cres, 503, "Server unavailable.<br>Please try again later.", e.code, 300)
		} else {
			respondError(cres, 500, "PROXY ERROR<br>Please try again later.", (e.code || "Unknown"))
		}
	})
	creq.on("data", chunk => {
		sreq.write(chunk)
		if(sreq.complete) sreq.end()
	})
	creq.on("finish", () => sreq.end())
	creq.on("end", () => sreq.end())
	creq.on("close", () => logger.debug("HTTP", "REQUEST", "Socket closed."))
}

function handleResponse(secure, host, headers, browserHost, creq, cres, sreq, sres) {
	logger.success("HTTP", "FETCH", host + " <-> Proxy :", sres.statusCode, sres.statusMessage)
	// copy headers
	for(var h in sres.headers) {
		if(h == "location") {
			try {
				cres.setHeader("location", replaceHost(sres.headers.location, host, browserHost))
			} catch(e) {
				respondError(cres, ...e)
				return
			}
		} else {
			cres.setHeader(h, sres.headers[h])
		}
	}
	cres.statusCode = sres.statusCode || 500
	cres.statusMessage = sres.statusMessage || "Unknown"
	//cres.statusCode = 200
	//cres.statusMessage = "OK"
	var s = ""
	s += sreq.method + " " + creq.url + " HTTP/" + creq.httpVersion + "<br>"
	for(var h in headers) {
		s += "<br>" + h + ": " + headers[h]
	}
	s += "<hr>"
	s += "HTTP/" + sres.httpVersion + " " + sres.statusCode + " " + sres.statusMessage + "<br>"
	for(var h in sres.headers) {
		s += "<br>" + h + ": " + sres.headers[h]
	}
	//cres.write(s + "<hr>")
	//console.log(s.replace(/<br>/g, "\n").replace(/<hr>/g, "\n----------------\n"))
	sres.on("data", chunk => cres.write(chunk))
	sres.on("close", () => {
		cres.end()
		if(cres.hasHeader("location")) logger.info("HTTP", "RESPONSE", "Proxy <-> " + creq.socket.remoteAddress + " :", cres.statusCode, cres.statusMessage, "(Location: " + cres.getHeader("location") + ")")
		else logger.info("HTTP", "RESPONSE", "Proxy <-> " + creq.socket.remoteAddress + " :", cres.statusCode, cres.statusMessage)
	})
}

function replaceHost(url, host1, host2) {
	var error
	if(url.startsWith("/")) return url
	if(!url.startsWith("http://") && !url.startsWith("https://")) {
		return url.replace(host1, host2)
	}
	try {
		var locX = new URL("http://" + host2)
		var loc = new URL(url)
		if(loc.host == host1) {
			loc.hostname = locX.hostname
			loc.port = locX.port
		}
	} catch(e) {
		// return some HTTP error
		logger.error("HTTP", "REPHOST", e)
		if(e.code == "ERR_INVALID_URL") {
			logger.debug("HTTP", "REPHOST", "Invalid URL: " + url)
			error = [400, "Malformed URL", e.code]
		} else return
	}
	if(error) throw error
	return loc.href
}

function provideLinks() {
	var s = "<hr>"
	for(var h in config.hosts) {
		s += `<br><a href="https://${h}:${config.https.port}">${h}</a>`
	}
	return s
}

function loadConfig() {
	try {
		var configJson = JSON.parse(fs.readFileSync("config.json"))
		logger.info(null, "CONFIG", "Config loaded successfully.")
		return configJson
	} catch(e) {
		logger.error(null, "CONFIG", "Unable to load config:", e)
		process.kill(0)
	}
}

function respondError(res, httpCode, message, ecode, retryAfter) {
	res.setHeader("Content-Type", "text/html")
	if(httpCode == 503) res.setHeader("retry-after", retryAfter || 10)
	res.writeHead(httpCode)
	res.end("<center><h2>" + httpCode + " " + responseCodes[httpCode] + "</h2></center><hr><center>httproxy (c) by j0code</center><center><p>" + message + "</p>" + (ecode ? ("<code>" + ecode + "</code>") : "") + "</center>")
}
